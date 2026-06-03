import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const p = prisma as any;

const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const cities = ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Zanzibar', 'Mbeya'];
const productNames = [
  'Wireless Headphones', 'Smart Watch', 'Cotton T-Shirt', 'Running Shoes', 'Kitchen Blender',
  'Office Chair', 'LED Desk Lamp', 'Phone Case', 'Power Bank', 'Face Serum',
  'Laptop Backpack', 'Bluetooth Speaker', 'Ceramic Dinner Set', 'Yoga Mat', 'Gaming Mouse',
];

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const money = (base: number, i: number) => base + (i % 9) * 17500;
const json = (value: unknown) => JSON.stringify(value);
const hash = (pwd: string) => bcrypt.hash(pwd, 10);

async function ensureUser(email: string, role: string, index: number) {
  return p.user.upsert({
    where: { email },
    update: { role, isVerified: true, isActive: true },
    create: {
      email,
      phone: `+25579${String(index).padStart(7, '0')}`,
      passwordHash: await hash(`${role[0]}Demo@123`),
      firstName: role === 'SELLER' ? `Seller${index}` : `Customer${index}`,
      lastName: 'Demo',
      role,
      isVerified: true,
      isActive: true,
      preferences: { create: {} },
    },
  });
}

async function seedDemo() {
  console.log('🌱 Seeding broad demo data...');
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set before seeding demo admin data.');
  }

  const admin = await p.user.upsert({
    where: { email: adminEmail },
    update: { role: 'SUPER_ADMIN', isActive: true, isVerified: true },
    create: {
      email: adminEmail,
      phone: '+255700000001',
      passwordHash: await hash(adminPassword),
      firstName: 'System',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isVerified: true,
      isActive: true,
      preferences: { create: {} },
    },
  });

  const customers = [];
  for (let i = 1; i <= 30; i += 1) {
    const user = await ensureUser(`customer${i}@demo.test`, 'CUSTOMER', i);
    customers.push(user);
    await p.userAddress.upsert({
      where: { id: `demo-address-${i}` },
      update: {},
      create: {
        id: `demo-address-${i}`,
        userId: user.id,
        label: 'Default',
        phone: user.phone,
        street: `${100 + i} Market Road`,
        city: cities[i % cities.length],
        country: 'TZ',
        isDefault: true,
      },
    });
  }

  const categories = [];
  for (const [i, name] of ['Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Sports', 'Groceries'].entries()) {
    categories.push(await p.category.upsert({
      where: { slug: `demo-${slugify(name)}` },
      update: { isActive: true },
      create: { name, slug: `demo-${slugify(name)}`, description: `${name} demo category`, level: 0, sortOrder: i, isActive: true },
    }));
  }

  const brands = [];
  for (const [i, name] of ['Samsung', 'Apple', 'Nike', 'Adidas', 'Xiaomi', 'Huawei', 'LG', 'Maybelline'].entries()) {
    brands.push(await p.brand.upsert({
      where: { slug: `demo-${slugify(name)}` },
      update: { isApproved: true },
      create: { name: `${name} Demo`, slug: `demo-${slugify(name)}`, description: `${name} seeded demo brand`, isApproved: true },
    }));
  }

  const sellers = [];
  for (let i = 1; i <= 6; i += 1) {
    const user = await ensureUser(`seller${i}@demo.test`, 'SELLER', 100 + i);
    sellers.push(await p.seller.upsert({
      where: { storeSlug: `demo-store-${i}` },
      update: { isActive: true, isVerified: true, kycStatus: 'VERIFIED' },
      create: {
        userId: user.id,
        storeName: `Demo Store ${i}`,
        storeSlug: `demo-store-${i}`,
        storeDescription: 'Seeded seller store for admin testing.',
        storeLocation: cities[i % cities.length],
        sellerType: 'BUSINESS',
        kycStatus: 'VERIFIED',
        isActive: true,
        isVerified: true,
        rating: 4 + (i % 10) / 10,
        totalOrders: 25 + i,
        totalRevenue: 2500000 + i * 500000,
      },
    }));
  }

  const products = [];
  for (let i = 1; i <= 120; i += 1) {
    const name = `${productNames[i % productNames.length]} ${i}`;
    const product = await p.product.upsert({
      where: { slug: `demo-${slugify(name)}` },
      update: { status: 'ACTIVE', isActive: true },
      create: {
        sellerId: sellers[i % sellers.length].id,
        categoryId: categories[i % categories.length].id,
        brandId: brands[i % brands.length].id,
        title: name,
        slug: `demo-${slugify(name)}`,
        description: `High quality ${name} seeded for marketplace testing.`,
        specifications: json({ warranty: '12 months', origin: 'Demo warehouse', color: ['Black', 'Blue', 'Gold'][i % 3] }),
        basePrice: money(35000, i),
        discountPrice: i % 4 === 0 ? money(30000, i) : null,
        costPrice: money(22000, i),
        currency: 'TZS',
        status: 'ACTIVE',
        isActive: true,
        isFeatured: i % 7 === 0,
        rating: 3.5 + (i % 15) / 10,
        reviewCount: i % 28,
        totalSales: i * 3,
      },
    });
    products.push(product);
    await p.productImage.upsert({
      where: { id: `demo-image-${i}` },
      update: {},
      create: { id: `demo-image-${i}`, productId: product.id, url: `/uploads/products/demo-product-${(i % 12) + 1}.svg`, alt: name, sortOrder: 0, isPrimary: true },
    });
    await p.productVariant.upsert({
      where: { sku: `DEMO-SKU-${String(i).padStart(4, '0')}` },
      update: { stock: 20 + (i % 80), isActive: true },
      create: {
        productId: product.id,
        sku: `DEMO-SKU-${String(i).padStart(4, '0')}`,
        attributes: json({ size: ['S', 'M', 'L', 'XL'][i % 4] }),
        price: product.basePrice,
        discountPrice: product.discountPrice,
        stock: 20 + (i % 80),
        lowStockThreshold: 5,
        isActive: true,
      },
    });
  }

  for (let i = 1; i <= 80; i += 1) {
    const customer = customers[i % customers.length];
    const seller = sellers[i % sellers.length];
    const orderProduct = products[i % products.length];
    const quantity = (i % 4) + 1;
    const subtotal = orderProduct.basePrice * quantity;
    const order = await p.order.upsert({
      where: { orderNumber: `DEMO-ORD-${String(i).padStart(5, '0')}` },
      update: {},
      create: {
        orderNumber: `DEMO-ORD-${String(i).padStart(5, '0')}`,
        userId: customer.id,
        sellerId: seller.id,
        status: statuses[i % statuses.length],
        shippingAddress: json({ city: cities[i % cities.length], street: `${i} Demo Street`, country: 'TZ' }),
        shippingMethod: ['Standard', 'Express', 'Pickup'][i % 3],
        shippingFee: 5000 + (i % 5) * 1000,
        taxAmount: subtotal * 0.18,
        discountAmount: i % 6 === 0 ? 10000 : 0,
        couponCode: i % 6 === 0 ? 'DEMO10' : null,
        subtotal,
        totalAmount: subtotal * 1.18 + 5000 - (i % 6 === 0 ? 10000 : 0),
        paymentMethod: ['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER'][i % 3],
        paymentStatus: i % 5 === 0 ? 'PENDING' : 'PAID',
        trackingNumber: `TRK-DEMO-${String(i).padStart(5, '0')}`,
        courierCode: ['DHL', 'EMS', 'LOCAL'][i % 3],
        deliveryEstimate: new Date(Date.now() + (i % 8) * 86400000),
        createdAt: new Date(Date.now() - i * 86400000),
        items: {
          create: {
            productId: orderProduct.id,
            productSnapshot: json({ title: orderProduct.title, sku: `DEMO-SKU-${String((i % 120) + 1).padStart(4, '0')}` }),
            quantity,
            unitPrice: orderProduct.basePrice,
            totalPrice: subtotal,
            status: statuses[i % statuses.length],
          },
        },
        payments: {
          create: {
            method: ['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER'][i % 3],
            provider: ['Stripe', 'M-Pesa', 'Bank'][i % 3],
            transactionId: `DEMO-TXN-${String(i).padStart(5, '0')}`,
            amount: subtotal,
            currency: 'TZS',
            status: i % 5 === 0 ? 'PENDING' : 'COMPLETED',
            paidAt: i % 5 === 0 ? null : new Date(Date.now() - i * 3600000),
          },
        },
        shipments: {
          create: {
            courierCode: ['DHL', 'EMS', 'LOCAL'][i % 3],
            trackingNumber: `TRK-DEMO-${String(i).padStart(5, '0')}`,
            status: statuses[i % statuses.length],
            origin: 'Dar es Salaam Warehouse',
            destination: cities[i % cities.length],
            weight: 1 + (i % 8) / 2,
            estimatedDays: (i % 6) + 1,
            events: json([{ status: 'CREATED', at: new Date().toISOString() }]),
          },
        },
      },
      include: { items: true },
    });

    if (i <= 24) {
      await p.review.upsert({
        where: { id: `demo-review-${i}` },
        update: {},
        create: {
          id: `demo-review-${i}`,
          userId: customer.id,
          productId: orderProduct.id,
          orderId: order.id,
          sellerId: seller.id,
          rating: (i % 5) + 1,
          title: ['Great value', 'Fast delivery', 'Good quality', 'Needs improvement'][i % 4],
          text: 'Seeded review for moderation and product testing.',
          isVerified: true,
          isApproved: i % 5 !== 0,
        },
      });
    }

    if (i <= 18 && order.items[0]) {
      await p.returnRequest.upsert({
        where: { id: `demo-return-${i}` },
        update: {},
        create: {
          id: `demo-return-${i}`,
          orderId: order.id,
          userId: customer.id,
          reason: ['Wrong item', 'Damaged package', 'Changed mind'][i % 3],
          description: 'Seeded return request for admin workflow testing.',
          status: ['PENDING', 'APPROVED', 'REJECTED'][i % 3],
          refundAmount: order.totalAmount * 0.75,
          refundMethod: 'ORIGINAL_PAYMENT',
          items: { create: { orderItemId: order.items[0].id, quantity: 1 } },
        },
      });
    }
  }

  for (let i = 1; i <= 20; i += 1) {
    await p.couponRule.upsert({
      where: { code: `DEMO${i}` },
      update: { isActive: true },
      create: {
        code: `DEMO${i}`,
        sellerId: i % 2 === 0 ? sellers[i % sellers.length].id : null,
        type: i % 2 === 0 ? 'PERCENTAGE' : 'FIXED',
        value: i % 2 === 0 ? 5 + i : 10000 + i * 500,
        minSpend: 50000,
        maxDiscount: 50000,
        usageLimit: 200,
        userLimit: 2,
        startsAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    await p.campaign.upsert({
      where: { slug: `demo-campaign-${i}` },
      update: { isActive: true },
      create: {
        name: `Demo Campaign ${i}`,
        slug: `demo-campaign-${i}`,
        description: 'Seeded promotional campaign.',
        type: 'SEASONAL',
        discountType: i % 2 === 0 ? 'PERCENTAGE' : 'FIXED',
        discountValue: i % 2 === 0 ? 10 : 15000,
        startAt: new Date(Date.now() - 86400000),
        endAt: new Date(Date.now() + 20 * 86400000),
        isActive: true,
      },
    });
  }

  await p.currencySettings.upsert({
    where: { id: 'demo-currency-settings' },
    update: { baseCurrency: 'TZS' },
    create: { id: 'demo-currency-settings', baseCurrency: 'TZS', displayCurrencies: json(['TZS', 'USD', 'EUR', 'KES']), refreshInterval: 3600 },
  });
  for (const [fromCurrency, toCurrency, rate] of [['TZS', 'USD', 0.00039], ['USD', 'TZS', 2550], ['TZS', 'KES', 0.052], ['EUR', 'TZS', 2780]] as const) {
    await p.currencyRate.upsert({
      where: { fromCurrency_toCurrency: { fromCurrency, toCurrency } },
      update: { rate },
      create: { fromCurrency, toCurrency, rate, provider: 'demo', lastRefreshedAt: new Date() },
    });
  }
  for (const [code, name, nativeName] of [['en', 'English', 'English'], ['sw', 'Swahili', 'Kiswahili'], ['fr', 'French', 'Français']] as const) {
    await p.siteLanguage.upsert({ where: { code }, update: { isActive: true }, create: { code, name, nativeName, isDefault: code === 'en', isActive: true } });
  }

  await p.featureFlag.upsert({
    where: { key: 'marketplace.auth' },
    update: {
      value: json({
        oauthProviders: [
          { id: 'google', label: 'Google', enabled: true, mode: 'test', clientId: 'demo-google-client', clientSecret: 'demo-google-secret', authUrl: '/api/auth/oauth/google/callback?code=mock-google', redirectUri: 'http://localhost:3000/api/auth/oauth/google/callback' },
          { id: 'facebook', label: 'Facebook', enabled: true, mode: 'test', clientId: 'demo-facebook-client', clientSecret: 'demo-facebook-secret', authUrl: '/api/auth/oauth/facebook/callback?code=mock-facebook', redirectUri: 'http://localhost:3000/api/auth/oauth/facebook/callback' },
          { id: 'apple', label: 'Apple', enabled: true, mode: 'test', clientId: 'demo.apple.service', teamId: 'DEMO', keyId: 'DEMO', privateKey: 'demo-private-key', authUrl: '/api/auth/oauth/apple/callback?code=mock-apple', redirectUri: 'http://localhost:3000/api/auth/oauth/apple/callback' },
        ],
        localMockEnabled: true,
      }),
      type: 'json',
      description: 'Third-party login providers exposed to customers',
      isActive: true,
    },
    create: {
      key: 'marketplace.auth',
      value: json({
        oauthProviders: [
          { id: 'google', label: 'Google', enabled: true, mode: 'test', clientId: 'demo-google-client', clientSecret: 'demo-google-secret', authUrl: '/api/auth/oauth/google/callback?code=mock-google', redirectUri: 'http://localhost:3000/api/auth/oauth/google/callback' },
          { id: 'facebook', label: 'Facebook', enabled: true, mode: 'test', clientId: 'demo-facebook-client', clientSecret: 'demo-facebook-secret', authUrl: '/api/auth/oauth/facebook/callback?code=mock-facebook', redirectUri: 'http://localhost:3000/api/auth/oauth/facebook/callback' },
          { id: 'apple', label: 'Apple', enabled: true, mode: 'test', clientId: 'demo.apple.service', teamId: 'DEMO', keyId: 'DEMO', privateKey: 'demo-private-key', authUrl: '/api/auth/oauth/apple/callback?code=mock-apple', redirectUri: 'http://localhost:3000/api/auth/oauth/apple/callback' },
        ],
        localMockEnabled: true,
      }),
      type: 'json',
      description: 'Third-party login providers exposed to customers',
      isActive: true,
    },
  });

  await p.searchSynonym.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({ terms: json([`demo term ${i}`, `sample term ${i}`]), language: 'en', isActive: true })),
    skipDuplicates: true,
  });
  await p.searchStopWord.createMany({
    data: ['a', 'an', 'the', 'kwa', 'ya', 'na'].map((word) => ({ word, language: 'en', isActive: true })),
    skipDuplicates: true,
  });
  await p.searchFilterTemplate.createMany({
    data: categories.slice(0, 6).map((category: any) => ({
      name: `Demo ${category.name} Filters`,
      slug: `demo-${category.slug}-filters`,
      categoryId: category.id,
      filters: json([{ field: 'brandId', type: 'checkbox' }, { field: 'price', type: 'range' }]),
      sortOptions: json(['createdAt:desc', 'basePrice:asc', 'rating:desc']),
      isActive: true,
    })),
    skipDuplicates: true,
  });

  await p.cacheConfig.createMany({ data: [{ key: 'demo:products', ttl: 600 }, { key: 'demo:homepage', ttl: 300 }], skipDuplicates: true });
  await p.queueMonitor.createMany({ data: [{ queueName: 'demo-imports', waitingCount: 12, activeCount: 2 }, { queueName: 'demo-webhooks', failedCount: 1, completedCount: 240 }], skipDuplicates: true });
  await p.rateLimitRule.createMany({ data: [{ name: 'Demo General API', keyPattern: 'api:/api/*:ALL', points: 100, duration: 900 }, { name: 'Demo Auth API', keyPattern: 'api:/api/auth/*:ALL', points: 20, duration: 900 }], skipDuplicates: true });

  for (let i = 1; i <= 8; i += 1) {
    const supplier = await p.dropshipSupplier.upsert({
      where: { id: `demo-supplier-${i}` },
      update: {},
      create: { id: `demo-supplier-${i}`, name: `Demo Supplier ${i}`, provider: ['aliexpress', 'amazon', 'alibaba', 'custom'][i % 4], storeUrl: `https://supplier${i}.example.com`, commissionRate: 0.05, minProfitMargin: 0.2, isVerified: i % 2 === 0, isActive: true },
    });
    await p.dropshipProductMapping.upsert({
      where: { supplierSku: `DEMO-DROP-SKU-${i}` },
      update: {},
      create: { supplierId: supplier.id, localProductId: products[i].id, supplierSku: `DEMO-DROP-SKU-${i}`, supplierProductId: `DSP-${i}`, supplierTitle: `Supplier Product ${i}`, supplierPrice: 12 + i, costPrice: 14 + i, sellingPrice: 24 + i, quantity: 100 + i },
    });
    await p.dropshipImportJob.upsert({ where: { id: `demo-import-job-${i}` }, update: {}, create: { id: `demo-import-job-${i}`, supplierId: supplier.id, status: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'][i % 4], totalItems: 100, imported: 70 + i, failed: i % 3 } });
    await p.dropshipRule.upsert({ where: { id: `demo-dropship-rule-${i}` }, update: {}, create: { id: `demo-dropship-rule-${i}`, supplierId: supplier.id, name: `Demo Margin Rule ${i}`, type: 'profit_margin', conditions: json({ category: 'all' }), actions: json({ margin: 0.25 }), priority: i } });
    await p.profitMargin.upsert({ where: { id: `demo-profit-margin-${i}` }, update: {}, create: { id: `demo-profit-margin-${i}`, supplierId: supplier.id, category: categories[i % categories.length].name, targetMargin: 0.25 } });
    await p.shippingProfile.upsert({ where: { id: `demo-shipping-profile-${i}` }, update: {}, create: { id: `demo-shipping-profile-${i}`, name: `Demo Shipping Profile ${i}`, supplierId: supplier.id, carrier: ['DHL', 'FedEx', 'Local'][i % 3], methods: json(['standard', 'express']), handlingTime: (i % 3) + 1, isActive: true } });
  }

  const plans = [];
  for (const [i, name] of ['Starter', 'Growth', 'Scale', 'Enterprise'].entries()) {
    const plan = await p.subscriptionPlan.upsert({
      where: { slug: `demo-${slugify(name)}` },
      update: { isActive: true },
      create: { name: `Demo ${name}`, slug: `demo-${slugify(name)}`, description: `${name} seller plan`, price: [0, 35000, 95000, 250000][i], currency: 'TZS', billingCycle: 'monthly', sortOrder: i, isActive: true, isFeatured: i === 2 },
    });
    plans.push(plan);
    await p.subscriptionFeature.upsert({ where: { planId_key: { planId: plan.id, key: 'analytics' } }, update: {}, create: { planId: plan.id, key: 'analytics', label: 'Analytics', value: i > 0 ? 'true' : 'basic' } });
  }

  const program = await p.loyaltyProgram.upsert({ where: { name: 'Demo Rewards' }, update: { isActive: true }, create: { name: 'Demo Rewards', description: 'Seeded loyalty program', pointsPerCurrency: 0.01, minRedeem: 100, pointsExpiryDays: 365 } });
  const tiers = [];
  for (const [i, name] of ['Bronze', 'Silver', 'Gold'].entries()) {
    tiers.push(await p.loyaltyTier.upsert({ where: { slug: `demo-${slugify(name)}` }, update: { isActive: true }, create: { programId: program.id, name, slug: `demo-${slugify(name)}`, minPoints: i * 1000, maxPoints: i === 2 ? null : (i + 1) * 1000 - 1, multiplier: 1 + i * 0.25, color: ['#a16207', '#64748b', '#ca8a04'][i], benefits: json(['discounts', 'priority support']), sortOrder: i } }));
  }
  for (let i = 0; i < 20; i += 1) {
    const member = await p.loyaltyMember.upsert({ where: { userId: customers[i].id }, update: {}, create: { userId: customers[i].id, tierId: tiers[i % tiers.length].id, totalPoints: 500 + i * 120, lifetimePoints: 900 + i * 180, lastActivityAt: new Date() } });
    await p.pointsTransaction.upsert({ where: { id: `demo-points-${i}` }, update: {}, create: { id: `demo-points-${i}`, memberId: member.id, points: 100 + i, type: 'EARNED', source: 'purchase', description: 'Demo order points' } });
  }
  await p.rewardCatalog.createMany({ data: [{ name: 'Demo Free Shipping Voucher', pointsCost: 500, stock: 100, category: 'shipping' }, { name: 'Demo 10% Discount', pointsCost: 1200, stock: 50, category: 'discount' }], skipDuplicates: true });

  for (let i = 1; i <= 8; i += 1) {
    const accountUser = customers[20 + (i % 10)];
    const account = await p.businessAccount.upsert({ where: { userId: accountUser.id }, update: { status: 'VERIFIED' }, create: { userId: accountUser.id, companyName: `Demo Business ${i}`, registrationNo: `REG-DEMO-${i}`, taxId: `TIN-DEMO-${i}`, industry: 'Retail', companySize: '51-200', creditLimit: 5000000, status: 'VERIFIED' } });
    await p.bulkPricingTier.upsert({ where: { id: `demo-bulk-${i}` }, update: {}, create: { id: `demo-bulk-${i}`, businessAccountId: account.id, productId: products[i].id, minQuantity: 10, maxQuantity: 100, discountPercent: 7 + i } });
    await p.purchaseOrder.upsert({ where: { poNumber: `DEMO-PO-${i}` }, update: {}, create: { businessAccountId: account.id, poNumber: `DEMO-PO-${i}`, items: json([{ productId: products[i].id, qty: 20 }]), subtotal: 1000000, taxAmount: 180000, totalAmount: 1180000, currency: 'TZS', status: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'][i % 3] } });
    await p.quoteRequest.upsert({ where: { id: `demo-quote-${i}` }, update: {}, create: { id: `demo-quote-${i}`, businessAccountId: account.id, productId: products[i].id, title: `Bulk quote ${i}`, quantity: 50 + i, targetPrice: 75000, currency: 'TZS', status: ['OPEN', 'QUOTED', 'NEGOTIATING'][i % 3] } });
  }

  await p.dashboardWidget.createMany({
    data: ['Revenue', 'Orders', 'Top Products', 'Conversion'].map((title, i) => ({ title: `Demo ${title}`, type: i < 2 ? 'metric' : 'chart', chartType: i < 2 ? null : 'bar', dataSource: `demo.${slugify(title)}`, width: 1, height: 1, sortOrder: i, isActive: true })),
    skipDuplicates: true,
  });
  await p.reportTemplate.createMany({
    data: [{ name: 'Demo Sales Report', category: 'sales', queryType: 'predefined', query: 'demo_sales', format: 'csv' }, { name: 'Demo Finance Report', category: 'finance', queryType: 'predefined', query: 'demo_finance', format: 'xlsx' }],
    skipDuplicates: true,
  });
  await p.analyticsEvent.createMany({
    data: Array.from({ length: 120 }, (_, i) => ({ eventType: ['page_view', 'product_view', 'add_to_cart', 'purchase'][i % 4], sessionId: `demo-session-${i % 18}`, userId: customers[i % customers.length].id, entityType: 'product', entityId: products[i % products.length].id, value: i % 4 === 3 ? money(20000, i) : null, currency: 'TZS' })),
  });

  const adapters = [];
  for (const provider of ['Alibaba', 'AliExpress', 'Amazon']) {
    adapters.push(await p.providerAdapter.upsert({
      where: { slug: `demo-${slugify(provider)}` },
      update: { isEnabled: false },
      create: { name: `Demo ${provider}`, slug: `demo-${slugify(provider)}`, provider: slugify(provider), methods: json(['products.sync', 'orders.sync']), baseUrl: `https://api.${slugify(provider)}.example.com`, authType: 'api_key', isEnabled: false },
    }));
  }
  for (let i = 0; i < adapters.length; i += 1) {
    const connection = await p.providerConnection.upsert({ where: { id: `demo-provider-connection-${i}` }, update: {}, create: { id: `demo-provider-connection-${i}`, adapterId: adapters[i].id, name: `${adapters[i].name} Sandbox`, config: json({ mode: 'sandbox' }), isActive: false, isVerified: false } });
    await p.webhookEndpoint.upsert({ where: { id: `demo-webhook-endpoint-${i}` }, update: {}, create: { id: `demo-webhook-endpoint-${i}`, connectionId: connection.id, url: `https://example.com/webhooks/demo-${i}`, events: json(['order.created', 'product.updated']), secret: `demo-secret-${i}`, isActive: true } });
  }
  await p.webhookEvent.createMany({
    data: Array.from({ length: 25 }, (_, i) => ({ eventType: ['order.created', 'payment.completed', 'return.requested'][i % 3], source: 'demo-seed', payload: json({ i }), status: ['PENDING', 'PROCESSED', 'FAILED'][i % 3], attempts: i % 4 })),
  });

  for (let i = 1; i <= 10; i += 1) {
    const job = await p.syncJob.upsert({ where: { id: `demo-sync-job-${i}` }, update: {}, create: { id: `demo-sync-job-${i}`, name: `Demo Sync Job ${i}`, type: ['product_sync', 'order_sync', 'inventory_sync', 'price_sync'][i % 4], providerType: ['aliexpress', 'amazon', 'alibaba'][i % 3], schedule: `*/${i + 5} * * * *`, status: ['IDLE', 'RUNNING', 'FAILED'][i % 3], lastRunStatus: ['COMPLETED', 'FAILED'][i % 2], isActive: true } });
    await p.syncLog.upsert({ where: { id: `demo-sync-log-${i}` }, update: {}, create: { id: `demo-sync-log-${i}`, jobId: job.id, status: ['STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'][i % 4], itemsTotal: 100, itemsSynced: 70 + i, itemsFailed: i % 5, message: 'Demo sync log' } });
    await p.syncSchedule.upsert({ where: { jobId_cronExpr: { jobId: job.id, cronExpr: `*/${i + 5} * * * *` } }, update: {}, create: { jobId: job.id, cronExpr: `*/${i + 5} * * * *`, timezone: 'Africa/Dar_es_Salaam', isActive: true, nextTriggerAt: new Date(Date.now() + i * 600000) } });
    if (i % 3 === 0) await p.syncError.upsert({ where: { id: `demo-sync-error-${i}` }, update: {}, create: { id: `demo-sync-error-${i}`, jobId: job.id, errorType: 'API_TIMEOUT', message: 'Demo timeout from supplier API', details: json({ retryable: true }) } });
  }

  console.log(`✅ Demo data ready: ${customers.length} customers, ${sellers.length} sellers, ${products.length} products, 80 orders, and admin module data.`);
}

seedDemo()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
