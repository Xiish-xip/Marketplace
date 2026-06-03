import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { AuthPayload } from '../../common/middleware';
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../../common/config';
import { DynamicConfigService } from '../dynamic-config/dynamic-config.service';

export class PaymentService {
  private configService = new DynamicConfigService();
  private readonly offlinePaymentMethods = new Set(['CASH_ON_DELIVERY', 'BANK_TRANSFER']);

  private isAdmin(user: AuthPayload): boolean {
    return ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
  }

  private async getSellerIdForUser(userId: string): Promise<string> {
    const seller = await prisma.seller.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!seller) throw new NotFoundError('Seller profile not found');
    return seller.id;
  }

  async process(userId: string, data: any) {
    const order = await prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new AppError(403, 'Not authorized');
    if (order.paymentStatus !== 'PENDING') throw new AppError(400, 'Payment already processed');
    if (!this.offlinePaymentMethods.has(data.method)) {
      throw new AppError(400, 'Online payments must be started with a provider session and completed by webhook confirmation');
    }
    const paymentConfig = await this.configService.getValue('marketplace.payments', {});
    const providers = Array.isArray(paymentConfig.providers) ? paymentConfig.providers : [];
    const enabledProvider = data.provider ? providers.find((provider: any) => provider.id === data.provider && provider.enabled) : null;
    if (data.provider && !enabledProvider) throw new AppError(400, 'Payment provider is not enabled');
    if (paymentConfig.requireConfiguredProvider && !enabledProvider && data.method !== 'CASH_ON_DELIVERY') {
      throw new AppError(400, 'A configured payment provider is required for this method');
    }

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const payment = await prisma.payment.create({
      data: {
        orderId: data.orderId,
        method: data.method,
        provider: data.provider || data.method,
        transactionId,
        amount: order.totalAmount,
        currency: 'TZS',
        status: 'PENDING',
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    await prisma.order.update({
      where: { id: data.orderId },
      data: { paymentStatus: 'PENDING', status: 'PENDING_PAYMENT' },
    });

    return payment;
  }

  async createProviderSession(userId: string, data: any) {
    const order = await prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new AppError(403, 'Not authorized');
    const provider = data.provider || data.method?.toLowerCase();
    if (!['stripe', 'paypal', 'mpesa'].includes(provider)) {
      throw new AppError(400, 'Provider must be stripe, paypal, or mpesa');
    }
    const paymentConfig = await this.configService.getValue('marketplace.payments', {});
    const providers = Array.isArray(paymentConfig.providers) ? paymentConfig.providers : [];
    const providerConfig = providers.find((item: any) => item.id === provider && item.enabled);
    if (!providerConfig) throw new AppError(400, 'Payment provider is not enabled');

    const currency = String(data.currency || providerConfig.currency || 'TZS').toUpperCase();
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        method: provider === 'mpesa' ? 'MOBILE_MONEY' : 'CARD',
        provider,
        transactionId: `${provider.toUpperCase()}-SESSION-${Date.now()}`,
        amount: order.totalAmount,
        currency: 'TZS',
        status: 'PENDING',
        metadata: JSON.stringify({
          providerSession: true,
          returnUrl: data.returnUrl,
          cancelUrl: data.cancelUrl,
          phone: data.phone,
          currency,
        }),
      },
    });

    const mockEnabled = paymentConfig.localMockEnabled !== false || providerConfig.mode !== 'live';
    if (mockEnabled) {
      return {
        payment,
        provider,
        checkoutUrl: provider === 'mpesa' ? null : `/checkout/${provider}/${payment.transactionId}`,
        clientSecret: provider === 'stripe' ? `pi_${payment.id}_secret_local` : undefined,
        approvalUrl: provider === 'paypal' ? `/paypal/approve/${payment.transactionId}` : undefined,
        mpesaCheckoutRequestId: provider === 'mpesa' ? payment.transactionId : undefined,
        simulated: true,
      };
    }

    try {
      const session = provider === 'stripe'
        ? await this.createStripePaymentIntent(providerConfig, payment, order, data, currency)
        : provider === 'paypal'
          ? await this.createPaypalOrder(providerConfig, payment, order, data, currency)
          : await this.createMpesaCheckout(providerConfig, payment, order, data);

      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          transactionId: session.transactionId || payment.transactionId,
          metadata: JSON.stringify({
            ...(payment.metadata ? JSON.parse(payment.metadata) : {}),
            ...session.metadata,
            simulated: false,
          }),
        },
      });

      return {
        payment: updatedPayment,
        provider,
        simulated: false,
        ...session.response,
      };
    } catch (error: any) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          metadata: JSON.stringify({
            ...(payment.metadata ? JSON.parse(payment.metadata) : {}),
            error: error.message,
            failedAt: new Date().toISOString(),
          }),
        },
      });
      throw error instanceof AppError ? error : new AppError(502, `Payment provider request failed: ${error.message}`);
    }
  }

  private amountToMinorUnits(amount: number, currency: string): number {
    const zeroDecimalCurrencies = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
    return zeroDecimalCurrencies.has(currency.toUpperCase()) ? Math.round(amount) : Math.round(amount * 100);
  }

  private async parseProviderResponse(response: Response) {
    const text = await response.text();
    let body: any = text;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      // Keep raw text for provider diagnostics.
    }
    if (!response.ok) {
      const message = body?.error?.message || body?.message || body?.error_description || text || response.statusText;
      throw new AppError(502, `Payment provider error: ${message}`);
    }
    return body;
  }

  private async createStripePaymentIntent(providerConfig: any, payment: any, order: any, data: any, currency: string) {
    if (!providerConfig.secretKey) throw new AppError(422, 'Stripe secret key is not configured');

    const body = new URLSearchParams({
      amount: String(this.amountToMinorUnits(order.totalAmount, currency)),
      currency: currency.toLowerCase(),
      'metadata[orderId]': order.id,
      'metadata[paymentId]': payment.id,
      'metadata[transactionId]': payment.transactionId,
      'automatic_payment_methods[enabled]': 'true',
    });
    if (data.returnUrl) body.set('return_url', data.returnUrl);

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${providerConfig.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const intent = await this.parseProviderResponse(response);

    return {
      transactionId: intent.id,
      metadata: { stripePaymentIntentId: intent.id, providerStatus: intent.status },
      response: {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        status: intent.status,
      },
    };
  }

  private paypalBaseUrl(providerConfig: any): string {
    if (providerConfig.baseUrl) return String(providerConfig.baseUrl).replace(/\/+$/, '');
    return providerConfig.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  }

  private async getPaypalAccessToken(providerConfig: any): Promise<string> {
    if (!providerConfig.clientId || !providerConfig.clientSecret) {
      throw new AppError(422, 'PayPal client ID and client secret are not configured');
    }
    const basic = Buffer.from(`${providerConfig.clientId}:${providerConfig.clientSecret}`).toString('base64');
    const response = await fetch(`${this.paypalBaseUrl(providerConfig)}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    });
    const body = await this.parseProviderResponse(response);
    return body.access_token;
  }

  private async createPaypalOrder(providerConfig: any, payment: any, order: any, data: any, currency: string) {
    const accessToken = await this.getPaypalAccessToken(providerConfig);
    const response = await fetch(`${this.paypalBaseUrl(providerConfig)}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: order.id,
          custom_id: order.id,
          invoice_id: payment.transactionId,
          amount: {
            currency_code: currency,
            value: Number(order.totalAmount).toFixed(2),
          },
        }],
        application_context: {
          return_url: data.returnUrl || `${config.frontendUrl}/account/orders`,
          cancel_url: data.cancelUrl || `${config.frontendUrl}/checkout`,
          user_action: 'PAY_NOW',
        },
      }),
    });
    const paypalOrder = await this.parseProviderResponse(response);
    const approvalUrl = paypalOrder.links?.find((link: any) => link.rel === 'approve')?.href;

    return {
      transactionId: paypalOrder.id,
      metadata: { paypalOrderId: paypalOrder.id, providerStatus: paypalOrder.status },
      response: {
        approvalUrl,
        paypalOrderId: paypalOrder.id,
        status: paypalOrder.status,
      },
    };
  }

  private mpesaBaseUrl(providerConfig: any): string {
    if (providerConfig.baseUrl) return String(providerConfig.baseUrl).replace(/\/+$/, '');
    return providerConfig.mode === 'live' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  }

  private async getMpesaAccessToken(providerConfig: any): Promise<string> {
    if (!providerConfig.consumerKey || !providerConfig.consumerSecret) {
      throw new AppError(422, 'M-Pesa consumer key and consumer secret are not configured');
    }
    const basic = Buffer.from(`${providerConfig.consumerKey}:${providerConfig.consumerSecret}`).toString('base64');
    const response = await fetch(`${this.mpesaBaseUrl(providerConfig)}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${basic}` },
    });
    const body = await this.parseProviderResponse(response);
    return body.access_token;
  }

  private formatMpesaTimestamp(date = new Date()): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
  }

  private async createMpesaCheckout(providerConfig: any, payment: any, order: any, data: any) {
    if (!providerConfig.passkey || !providerConfig.shortcode) {
      throw new AppError(422, 'M-Pesa passkey and shortcode are not configured');
    }
    if (!data.phone) throw new AppError(422, 'Phone number is required for M-Pesa checkout');
    const callbackUrl = providerConfig.callbackUrl || `${config.backendUrl.replace(/\/+$/, '')}/api/payments/webhook/mpesa`;
    const timestamp = this.formatMpesaTimestamp();
    const password = Buffer.from(`${providerConfig.shortcode}${providerConfig.passkey}${timestamp}`).toString('base64');
    const accessToken = await this.getMpesaAccessToken(providerConfig);
    const phone = String(data.phone).replace(/[^\d]/g, '');

    const response = await fetch(`${this.mpesaBaseUrl(providerConfig)}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: providerConfig.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: providerConfig.transactionType || 'CustomerPayBillOnline',
        Amount: Math.round(order.totalAmount),
        PartyA: phone,
        PartyB: providerConfig.shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: order.orderNumber.slice(0, 12),
        TransactionDesc: `Order ${order.orderNumber}`,
      }),
    });
    const body = await this.parseProviderResponse(response);

    return {
      transactionId: body.CheckoutRequestID || payment.transactionId,
      metadata: {
        mpesaMerchantRequestId: body.MerchantRequestID,
        mpesaCheckoutRequestId: body.CheckoutRequestID,
        providerStatus: body.ResponseCode,
      },
      response: {
        mpesaCheckoutRequestId: body.CheckoutRequestID,
        merchantRequestId: body.MerchantRequestID,
        responseCode: body.ResponseCode,
        customerMessage: body.CustomerMessage,
      },
    };
  }

  async testProvider(providerId: string) {
    const paymentConfig = await this.configService.getValue('marketplace.payments', {});
    const providers = Array.isArray(paymentConfig.providers) ? paymentConfig.providers : [];
    const provider = providers.find((item: any) => item.id === providerId);
    if (!provider) throw new NotFoundError('Payment provider not found');

    const requiredByProvider: Record<string, string[]> = {
      stripe: ['publishableKey', 'secretKey'],
      paypal: ['clientId', 'clientSecret'],
      mpesa: ['consumerKey', 'consumerSecret', 'passkey', 'shortcode'],
      flutterwave: ['publicKey', 'secretKey'],
    };
    const required = requiredByProvider[provider.id] || [];
    const missing = required.filter((field) => !provider[field]);

    if (provider.mode === 'live' && missing.length) {
      throw new AppError(422, `Missing required live credentials: ${missing.join(', ')}`);
    }

    if (provider.mode !== 'live' || paymentConfig.localMockEnabled) {
      return {
        providerId,
        mode: provider.mode || 'test',
        status: 'CONNECTED',
        simulated: true,
        message: 'Local mock connection succeeded',
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      providerId,
      mode: provider.mode,
      status: 'READY',
      simulated: false,
      message: 'Credentials are present. Add the provider SDK call here for production verification.',
      checkedAt: new Date().toISOString(),
    };
  }

  async findByOrder(orderId: string, user: AuthPayload) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, sellerId: true },
    });
    if (!order) throw new NotFoundError('Order not found');
    if (!this.isAdmin(user) && order.userId !== user.userId) {
      if (user.role !== 'SELLER') throw new AppError(403, 'Not authorized');
      const sellerId = await this.getSellerIdForUser(user.userId);
      if (order.sellerId !== sellerId) throw new AppError(403, 'Not authorized');
    }

    return prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
  }

  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { status } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { order: { select: { orderNumber: true, totalAmount: true, userId: true } } },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      prisma.payment.count({ where }),
    ]);
    return { data: payments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async completePayment(id: string) {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundError('Payment not found');
    const updated = await prisma.payment.update({
      where: { id },
      data: { status: 'COMPLETED', paidAt: new Date() },
    });
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: 'PAID', status: 'PAYMENT_CONFIRMED' },
    });
    return updated;
  }

  async refundPayment(id: string, amount?: number) {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundError('Payment not found');
    const refundAmount = amount || payment.amount;
    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: 'REFUNDED',
        metadata: JSON.stringify({
          ...(payment.metadata ? JSON.parse(payment.metadata) : {}),
          refundAmount,
          refundedAt: new Date().toISOString(),
        }),
      },
    });
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: 'REFUNDED' },
    });
    return updated;
  }

  async handleWebhook(payload: any, signature?: string, provider?: string, rawBody?: string) {
    // --- Provider-specific signature verification ---
    if (provider === 'stripe') {
      this.verifyStripeSignature(rawBody || payload, signature);
    } else if (provider === 'paypal') {
      this.verifyPaypalSignature(rawBody || payload, signature);
    } else if (provider === 'mpesa') {
      this.verifyMpesaSignature(rawBody || payload, signature);
    } else {
      // Generic HMAC-SHA256 verification fallback
      this.verifyGenericSignature(rawBody || payload, signature);
    }

    const normalized = this.normalizeWebhookPayload(payload, provider);
    if (normalized.orderId && normalized.status) {
      const paymentStatus = normalized.status === 'COMPLETED' ? 'PAID' : normalized.status;
      await prisma.order.updateMany({
        where: { id: normalized.orderId },
        data: {
          paymentStatus,
          ...(paymentStatus === 'PAID' && { status: 'PAYMENT_CONFIRMED' }),
        },
      });
      if (normalized.transactionId) {
        await prisma.payment.updateMany({
          where: { transactionId: normalized.transactionId },
          data: { status: normalized.status, paidAt: normalized.status === 'COMPLETED' ? new Date() : undefined },
        });
      }
    }
    return { received: true, provider: provider || payload.provider || 'generic' };
  }

  private serializeWebhookPayload(payload: any): string {
    return typeof payload === 'string' ? payload : JSON.stringify(payload);
  }

  private verifyGenericSignature(payload: any, signature?: string) {
    if (!config.paymentWebhookSecret) return; // No secret configured, skip
    if (!signature) throw new AppError(401, 'Missing webhook signature');

    // Support both sha256=... and raw hex signature formats
    const received = signature.replace(/^sha256=/, '');
    const expected = createHmac('sha256', config.paymentWebhookSecret)
      .update(this.serializeWebhookPayload(payload))
      .digest('hex');

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new AppError(401, 'Invalid webhook signature: payload integrity check failed');
    }
  }

  private verifyStripeSignature(payload: any, signature?: string) {
    if (!config.paymentWebhookSecret) return;
    if (!signature) throw new AppError(401, 'Missing Stripe webhook signature');

    // Stripe format: t=timestamp,v1=signature,v0=legacy
    const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {});

    const timestamp = parseInt(parts.t || '0', 10);
    const providedSig = parts.v1;
    if (!providedSig) throw new AppError(401, 'Missing v1 signature in Stripe webhook');

    // Reject signatures older than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > 300) {
      throw new AppError(401, 'Stripe webhook timestamp expired');
    }

    const signedPayload = `${timestamp}.${this.serializeWebhookPayload(payload)}`;
    const expected = createHmac('sha256', config.paymentWebhookSecret)
      .update(signedPayload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(providedSig);
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new AppError(401, 'Invalid Stripe webhook signature');
    }
  }

  private verifyPaypalSignature(payload: any, signature?: string) {
    if (!config.paymentWebhookSecret) return;
    if (!signature) throw new AppError(401, 'Missing PayPal webhook signature');

    // PayPal uses transmission-id + transmission-sig with JWT-based verification
    // For local verification we validate HMAC of the payload
    const expected = createHmac('sha256', config.paymentWebhookSecret)
      .update(this.serializeWebhookPayload(payload))
      .digest('hex');

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new AppError(401, 'Invalid PayPal webhook signature');
    }
  }

  private verifyMpesaSignature(payload: any, signature?: string) {
    if (!config.paymentWebhookSecret) return;
    if (!signature) throw new AppError(401, 'Missing M-Pesa webhook signature');

    // M-Pesa uses SecurityCredential for validation
    // For local testing, validate the payload body with HMAC
    const expected = createHmac('sha256', config.paymentWebhookSecret)
      .update(this.serializeWebhookPayload(payload))
      .digest('hex');

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new AppError(401, 'Invalid M-Pesa webhook signature');
    }
  }

  private normalizeWebhookPayload(payload: any, provider?: string) {
    if (provider === 'stripe') {
      const object = payload.data?.object || payload;
      return {
        orderId: object.metadata?.orderId || payload.orderId,
        status: object.status === 'succeeded' ? 'COMPLETED' : String(object.status || payload.status || '').toUpperCase(),
        transactionId: object.metadata?.transactionId || object.id,
      };
    }
    if (provider === 'paypal') {
      const resource = payload.resource || payload;
      return {
        orderId: resource.custom_id || payload.orderId,
        status: payload.event_type?.includes('COMPLETED') || resource.status === 'COMPLETED' ? 'COMPLETED' : resource.status,
        transactionId: resource.invoice_id || resource.id,
      };
    }
    if (provider === 'mpesa') {
      const result = payload.Body?.stkCallback || payload;
      const metadata = result.CallbackMetadata?.Item || [];
      return {
        orderId: metadata.find((item: any) => item.Name === 'orderId')?.Value || payload.orderId,
        status: result.ResultCode === 0 || payload.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
        transactionId: metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value || result.CheckoutRequestID,
      };
    }
    return payload;
  }
}
