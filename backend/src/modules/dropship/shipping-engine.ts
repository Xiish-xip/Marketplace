import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { getIO } from '../../common/socket';

type ShippingZoneInput = {
  name: string;
  countries: string[] | string;
  baseRate: number;
  perKgRate: number;
  freeShippingThreshold?: number | null;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  carriers: string[] | string;
  isActive?: boolean;
};

type RateRequest = {
  origin?: Record<string, any>;
  destination: { country: string; city?: string; postalCode?: string };
  weightKg?: number;
  dimensions?: { length?: number; width?: number; height?: number };
  value?: number;
  currency?: string;
  subtotal?: number;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringify(value: unknown) {
  return JSON.stringify(value ?? null);
}

function normalizeList(value: string[] | string | undefined, fallback: string[] = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return fallback;
}

export class ShippingEngine {
  private emit(event: string, payload: Record<string, unknown>) {
    getIO()?.to('role:ADMIN').emit(event, payload);
    getIO()?.to('role:SUPER_ADMIN').emit(event, payload);
    if (payload.orderId) getIO()?.to(`order:${payload.orderId}`).emit(event, payload);
  }

  private payload(data: ShippingZoneInput) {
    return {
      name: data.name,
      countries: stringify(normalizeList(data.countries)),
      baseRate: Number(data.baseRate),
      perKgRate: Number(data.perKgRate),
      freeShippingThreshold: data.freeShippingThreshold === undefined || data.freeShippingThreshold === null ? null : Number(data.freeShippingThreshold),
      estimatedMinDays: Number(data.estimatedMinDays),
      estimatedMaxDays: Number(data.estimatedMaxDays),
      carriers: stringify(normalizeList(data.carriers, ['DHL', 'FedEx', 'UPS', 'USPS'])),
      isActive: data.isActive !== false,
    };
  }

  async listZones(params: { active?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = {};
    if (params.active === 'true') where.isActive = true;
    if (params.active === 'false') where.isActive = false;
    const [zones, total] = await Promise.all([
      prisma.dropshipShippingZone.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.dropshipShippingZone.count({ where }),
    ]);
    return {
      zones: zones.map((zone) => ({ ...zone, countries: parseJson(zone.countries, []), carriers: parseJson(zone.carriers, []) })),
      total,
      page,
      limit,
    };
  }

  async createZone(data: ShippingZoneInput) {
    return prisma.dropshipShippingZone.create({ data: this.payload(data) });
  }

  async getZone(id: string) {
    const zone = await prisma.dropshipShippingZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundError('Shipping zone');
    return { ...zone, countries: parseJson(zone.countries, []), carriers: parseJson(zone.carriers, []) };
  }

  async updateZone(id: string, data: Partial<ShippingZoneInput>) {
    const existing = await this.getZone(id);
    const payload = this.payload({
      name: data.name || existing.name,
      countries: data.countries || existing.countries,
      baseRate: data.baseRate ?? existing.baseRate,
      perKgRate: data.perKgRate ?? existing.perKgRate,
      freeShippingThreshold: data.freeShippingThreshold ?? existing.freeShippingThreshold,
      estimatedMinDays: data.estimatedMinDays ?? existing.estimatedMinDays,
      estimatedMaxDays: data.estimatedMaxDays ?? existing.estimatedMaxDays,
      carriers: data.carriers || existing.carriers,
      isActive: data.isActive ?? existing.isActive,
    });
    return prisma.dropshipShippingZone.update({ where: { id }, data: payload });
  }

  async deleteZone(id: string) {
    await this.getZone(id);
    return prisma.dropshipShippingZone.delete({ where: { id } });
  }

  private async resolveZone(country: string) {
    const zones = await prisma.dropshipShippingZone.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    const match = zones.find((zone) => parseJson<string[]>(zone.countries, []).includes(country));
    return match || zones[0] || null;
  }

  async calculateRates(request: RateRequest) {
    if (!request.destination?.country) throw new AppError(400, 'destination.country is required');
    const zone = await this.resolveZone(request.destination.country);
    if (!zone) {
      throw new AppError(400, 'No active dropship shipping zones are configured');
    }

    const dimensionalWeight = request.dimensions?.length && request.dimensions?.width && request.dimensions?.height
      ? (request.dimensions.length * request.dimensions.width * request.dimensions.height) / 5000
      : 0;
    const chargeableWeight = Math.max(Number(request.weightKg || 0.1), dimensionalWeight, 0.1);
    const subtotal = Number(request.subtotal || request.value || 0);
    const carriers = parseJson<string[]>(zone.carriers, ['DHL', 'FedEx', 'UPS']);
    const free = Boolean(zone.freeShippingThreshold && subtotal >= zone.freeShippingThreshold);
    const baseCost = free ? 0 : zone.baseRate + zone.perKgRate * chargeableWeight;
    const insurance = request.value ? this.insuranceAmount(Number(request.value)) : 0;
    const today = Date.now();

    const options = carriers.map((carrier, index) => {
      const speedFactor = index === 0 ? 0.9 : index === 1 ? 1 : 1.15;
      const costFactor = index === 0 ? 1.22 : index === 1 ? 1 : 0.88;
      const minDays = Math.max(1, Math.round(zone.estimatedMinDays * speedFactor));
      const maxDays = Math.max(minDays, Math.round(zone.estimatedMaxDays * speedFactor));
      return {
        carrierCode: carrier,
        serviceName: `${carrier} Dropship ${index === 0 ? 'Express' : index === 1 ? 'Standard' : 'Economy'}`,
        cost: Number((baseCost * costFactor + insurance).toFixed(2)),
        currency: request.currency || 'USD',
        estimatedMinDays: minDays,
        estimatedMaxDays: maxDays,
        estimatedDeliveryStart: new Date(today + minDays * 24 * 60 * 60 * 1000).toISOString(),
        estimatedDeliveryEnd: new Date(today + maxDays * 24 * 60 * 60 * 1000).toISOString(),
        includesInsurance: insurance > 0,
      };
    });

    const cheapest = [...options].sort((a, b) => a.cost - b.cost)[0];
    const fastest = [...options].sort((a, b) => a.estimatedMinDays - b.estimatedMinDays)[0];
    const balanced = [...options].sort((a, b) => (a.cost + a.estimatedMaxDays * 2) - (b.cost + b.estimatedMaxDays * 2))[0];

    return {
      zone: { id: zone.id, name: zone.name },
      chargeableWeight: Number(chargeableWeight.toFixed(2)),
      dimensionalWeight: Number(dimensionalWeight.toFixed(2)),
      freeShippingApplied: free,
      options,
      recommended: { cheapest, fastest, balanced },
    };
  }

  private insuranceAmount(value: number) {
    return Math.max(1, Number((value * 0.015).toFixed(2)));
  }

  async insuranceQuote(data: { value: number; currency?: string }) {
    return {
      value: Number(data.value || 0),
      premium: this.insuranceAmount(Number(data.value || 0)),
      currency: data.currency || 'USD',
      coverage: 'LOSS_DAMAGE_THEFT',
    };
  }

  async generateLabel(data: { dropshipOrderId: string; carrierCode?: string; serviceName?: string }) {
    const order = await prisma.dropshipOrder.findUnique({ where: { id: data.dropshipOrderId } });
    if (!order) throw new NotFoundError('Dropship order');
    const carrierCode = data.carrierCode || order.trackingUrl?.split('/')[2] || 'DHL';
    const trackingNumber = `${carrierCode.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 4)}${Date.now()}`;
    const label = await prisma.dropshipLabel.create({
      data: {
        dropshipOrderId: order.id,
        carrierCode,
        trackingNumber,
        labelUrl: `/api/dropship/shipping/labels/${trackingNumber}.pdf`,
        cost: Number((order.shippingCost || 0).toFixed(2)),
        currency: order.currency,
      },
    });

    await prisma.dropshipTracking.create({
      data: {
        orderId: order.localOrderId,
        dropshipOrderId: order.id,
        carrierCode,
        trackingNumber,
        status: 'LABEL_CREATED',
        events: stringify([{ status: 'LABEL_CREATED', description: 'Shipping label generated', at: new Date().toISOString() }]),
        lastCheckedAt: new Date(),
      },
    });

    await prisma.dropshipOrder.update({
      where: { id: order.id },
      data: { status: 'LABEL_CREATED', trackingUrl: `/track/${carrierCode}/${trackingNumber}` },
    });

    this.emit('dropship:shipping-label-created', { orderId: order.localOrderId, dropshipOrderId: order.id, trackingNumber });
    return label;
  }

  async generateBatchLabels(items: Array<{ dropshipOrderId: string; carrierCode?: string }>) {
    const labels: any[] = [];
    const errors: any[] = [];
    for (const item of items.slice(0, 200)) {
      try {
        labels.push(await this.generateLabel(item));
      } catch (error) {
        errors.push({ dropshipOrderId: item.dropshipOrderId, message: error instanceof Error ? error.message : 'Label failed' });
      }
    }
    return { labels, errors, generated: labels.length, failed: errors.length };
  }

  async getTracking(orderId: string) {
    const trackings = await prisma.dropshipTracking.findMany({
      where: { OR: [{ orderId }, { dropshipOrderId: orderId }] },
      orderBy: { updatedAt: 'desc' },
    });
    return trackings.map((tracking) => ({ ...tracking, events: parseJson(tracking.events, []) }));
  }

  async handleTrackingWebhook(carrier: string, payload: any) {
    const trackingNumber = payload.trackingNumber || payload.tracking_number || payload.tracking;
    if (!trackingNumber) throw new AppError(400, 'trackingNumber is required');
    const existing = await prisma.dropshipTracking.findFirst({ where: { carrierCode: carrier, trackingNumber } });
    const nextEvent = {
      status: payload.status || 'UPDATED',
      description: payload.description || payload.message || 'Carrier status updated',
      location: payload.location,
      at: payload.timestamp || new Date().toISOString(),
    };

    const tracking = existing
      ? await prisma.dropshipTracking.update({
          where: { id: existing.id },
          data: {
            status: nextEvent.status,
            events: stringify([...parseJson<any[]>(existing.events, []), nextEvent]),
            estimatedDelivery: payload.estimatedDelivery ? new Date(payload.estimatedDelivery) : existing.estimatedDelivery,
            lastCheckedAt: new Date(),
          },
        })
      : await prisma.dropshipTracking.create({
          data: {
            carrierCode: carrier,
            trackingNumber,
            status: nextEvent.status,
            events: stringify([nextEvent]),
            estimatedDelivery: payload.estimatedDelivery ? new Date(payload.estimatedDelivery) : null,
            lastCheckedAt: new Date(),
          },
        });

    this.emit('dropship:tracking-updated', { orderId: tracking.orderId, trackingNumber, status: tracking.status });
    return { ...tracking, events: parseJson(tracking.events, []) };
  }

  async generateCustomsDocument(dropshipOrderId: string) {
    const order = await prisma.dropshipOrder.findUnique({
      where: { id: dropshipOrderId },
      include: { supplier: true },
    });
    if (!order) throw new NotFoundError('Dropship order');
    const items = parseJson<any[]>(order.items, []);
    return {
      documentType: 'COMMERCIAL_INVOICE',
      dropshipOrderId,
      invoiceNumber: `CI-${order.id.slice(0, 8).toUpperCase()}`,
      supplier: order.supplier.name,
      currency: order.currency,
      incotermOptions: ['DDP', 'DAP'],
      dutiesPrepaymentAvailable: true,
      lineItems: items.map((item) => ({
        sku: item.sku,
        quantity: item.qty || item.quantity,
        unitValue: item.price || item.unitCost || 0,
        hsCode: item.hsCode || '0000.00',
        countryOfOrigin: item.countryOfOrigin || 'CN',
      })),
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      total: order.totalCost,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const shippingEngine = new ShippingEngine();
