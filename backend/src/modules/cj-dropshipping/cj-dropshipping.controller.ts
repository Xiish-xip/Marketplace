import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../common/prisma';
import { cjDropshippingService } from './cj-dropshipping.service';
import slugify from '../../common/slugify';

function parseMetadata(value: string | null | undefined): Record<string, any> {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function hasCompleteProductContent(specs: Record<string, any>) {
  const variants = Array.isArray(specs.variants) ? specs.variants : [];
  const images = Array.isArray(specs.images) ? specs.images : [];
  const hasUsableVariant = variants.some((variant: any) => variant?.sku || variant?.id || variant?.name);

  return Boolean(specs.description) && images.length > 1 && hasUsableVariant;
}

function buildSpecsFromCJProduct(product: any) {
  const variants = Array.isArray(product.varient) ? product.varient : [];
  const images = (Array.isArray(product.productImages) && product.productImages.length
    ? product.productImages
    : [product.productImage])
    .filter(Boolean)
    .slice(0, 12);

  return {
    description: product.description || '',
    images,
    variants: variants.map((variant: any) => ({
      id: variant.varientId || variant.id || variant.vid,
      name: variant.varientName || variant.name || variant.variantName,
      price: Number(variant.price || 0),
      stock: Math.max(Number(variant.stock || 0), 0),
      sku: variant.sku || variant.variantSku || variant.varientSku,
      image: variant.image || variant.variantImage,
      attributes: variant.attributes || {},
      weight: variant.weight,
      dimensions: variant.dimensions,
    })),
    weight: product.weight,
    dimensions: product.length && product.width && product.height
      ? `${product.length}x${product.width}x${product.height}`
      : undefined,
    warehouses: (product.warehouse || []).map((warehouse: any) => ({
      id: warehouse.warehouseId,
      name: warehouse.warehouseName,
      country: warehouse.country,
    })),
    shippingMethods: (product.shipping || []).map((shipping: any) => ({
      id: shipping.shippingId,
      name: shipping.shippingName,
      cost: shipping.shippingCost,
      estimatedDays: shipping.estimatedDays,
    })),
  };
}

async function refreshMappingContent(supplierId: string, mapping: any) {
  const existingSpecs = parseMetadata(mapping.specifications);
  if (hasCompleteProductContent(existingSpecs)) return { mapping, specs: existingSpecs };

  const apiKey = await getApiKey(supplierId);
  const detail = await cjDropshippingService.getProductDetail(apiKey, mapping.supplierProductId || mapping.supplierSku);
  const specs = buildSpecsFromCJProduct(detail);
  const variants = Array.isArray(specs.variants) ? specs.variants : [];
  const stock = variants.reduce((sum: number, variant: any) => sum + Number(variant.stock || 0), 0);
  const variantPrices = variants.map((variant: any) => Number(variant.price || 0)).filter((price: number) => price > 0);
  const supplierPrice = Number(detail.sellPrice || variantPrices[0] || mapping.supplierPrice || 0);
  const priceMultiplier = mapping.costPrice > 0 ? mapping.sellingPrice / mapping.costPrice : 1;
  const sellingPrice = supplierPrice > 0 ? Number((supplierPrice * priceMultiplier).toFixed(2)) : mapping.sellingPrice;

  const updatedMapping = await prisma.dropshipProductMapping.update({
    where: { id: mapping.id },
    data: {
      supplierTitle: detail.productName || mapping.supplierTitle,
      supplierPrice,
      costPrice: supplierPrice || mapping.costPrice,
      sellingPrice,
      quantity: stock,
      imageUrl: specs.images[0] || mapping.imageUrl,
      category: detail.category || mapping.category,
      specifications: JSON.stringify(specs),
      lastSyncedAt: new Date(),
    },
  });

  return { mapping: updatedMapping, specs };
}

function isMissingIntegrationTableError(error: unknown) {
  const code = (error as any)?.code;
  return code === 'P2021' || code === 'P2022';
}

async function getUniqueProductSlug(title: string, sku: string) {
  const base = slugify(`cj ${title}`) || `cj-${slugify(sku) || Date.now()}`;
  let slug = base.slice(0, 90);
  let suffix = 1;

  while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base.slice(0, 82)}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function ensureSourcingSeller(userId: string) {
  const existing = await prisma.seller.findUnique({ where: { userId } });
  if (existing) return existing;

  const baseSlug = 'marketplace-sourcing';
  let storeSlug = baseSlug;
  let suffix = 1;
  while (await prisma.seller.findUnique({ where: { storeSlug }, select: { id: true } })) {
    storeSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const storeName = storeSlug === baseSlug ? 'Marketplace Sourcing' : `Marketplace Sourcing ${suffix - 1}`;
  return prisma.seller.create({
    data: {
      userId,
      storeName,
      storeSlug,
      storeDescription: 'Marketplace-managed sourced products from third-party suppliers.',
      sellerType: 'BUSINESS',
      kycStatus: 'APPROVED',
      isActive: true,
      isVerified: true,
    },
  });
}

async function ensureSourcingCategory(mappingCategory?: string | null) {
  const preferredName = mappingCategory?.trim() || 'CJ Dropshipping';
  const preferredSlug = slugify(preferredName) || 'cj-dropshipping';

  const existing = await prisma.category.findFirst({
    where: {
      OR: [
        { slug: preferredSlug },
        { slug: 'cj-dropshipping' },
        { name: { equals: preferredName, mode: 'insensitive' } },
      ],
      isActive: true,
    },
    orderBy: { level: 'asc' },
  });
  if (existing) return existing;

  return prisma.category.create({
    data: {
      name: preferredName,
      slug: preferredSlug,
      description: 'Products imported from connected sourcing providers.',
      isActive: true,
    },
  });
}

function buildProductDescription(mapping: any, specs: Record<string, any>) {
  const details = [
    `<p><strong>Supplier SKU:</strong> ${mapping.supplierSku}</p>`,
    specs.dimensions ? `<p><strong>Dimensions:</strong> ${specs.dimensions}</p>` : '',
    specs.weight ? `<p><strong>Weight:</strong> ${specs.weight}</p>` : '',
  ].filter(Boolean).join('');

  if (specs.description) {
    return `${specs.description}<hr />${details}`;
  }

  return `<p>${mapping.supplierTitle}</p><p>Imported from CJ Dropshipping.</p>${details}`;
}

function buildProductVariants(mapping: any, specs: Record<string, any>) {
  const variants = Array.isArray(specs.variants) ? specs.variants : [];
  const priceMultiplier = mapping.costPrice > 0 ? mapping.sellingPrice / mapping.costPrice : 1;
  const usableVariants = variants
    .filter((variant: any) => variant?.sku || variant?.id || variant?.name)
    .slice(0, 50);

  if (!usableVariants.length) {
    return [{
      sku: `cj-${mapping.supplierSku}`.slice(0, 120),
      price: mapping.sellingPrice,
      stock: Math.max(Number(mapping.quantity || 0), 0),
      attributes: JSON.stringify({ source: 'CJ Dropshipping' }),
      weight: null,
      dimensions: null,
      isActive: true,
      lowStockThreshold: 5,
    }];
  }

  return usableVariants.map((variant: any, index: number) => ({
    sku: `cj-${mapping.supplierSku}-${variant.sku || variant.id || index}`.slice(0, 120),
    price: Number((Number(variant.price || mapping.costPrice || mapping.sellingPrice || 0) * priceMultiplier).toFixed(2)),
    stock: Math.max(Number(variant.stock || 0), 0),
    attributes: JSON.stringify({
      source: 'CJ Dropshipping',
      supplierVariantId: variant.id,
      name: variant.name,
      ...(variant.attributes || {}),
    }),
    weight: variant.weight || null,
    dimensions: variant.dimensions ? JSON.stringify(variant.dimensions) : null,
    lowStockThreshold: 5,
    isActive: true,
  }));
}

function getProductImages(mapping: any, specs: Record<string, any>) {
  const images = [
    ...(Array.isArray(specs.images) ? specs.images : []),
    ...((Array.isArray(specs.variants) ? specs.variants : []).map((variant: any) => variant.image)),
    mapping.imageUrl,
  ].filter(Boolean);

  return images.filter((url: string, index: number) => images.indexOf(url) === index).slice(0, 12);
}

async function syncProductImages(productId: string, title: string, imageUrls: string[]) {
  if (!imageUrls.length) return;

  const existing = await prisma.productImage.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } });
  const byUrl = new Map(existing.map((image) => [image.url, image]));

  for (const [index, url] of imageUrls.entries()) {
    const found = byUrl.get(url);
    if (found) {
      await prisma.productImage.update({
        where: { id: found.id },
        data: { alt: title, sortOrder: index, isPrimary: index === 0 },
      });
    } else {
      await prisma.productImage.create({
        data: { productId, url, alt: title, sortOrder: index, isPrimary: index === 0 },
      });
    }
  }

  await prisma.productImage.deleteMany({
    where: { productId, url: { notIn: imageUrls } },
  });
}

async function syncProductVariants(productId: string, variants: ReturnType<typeof buildProductVariants>) {
  const skus = variants.map((variant) => variant.sku);

  for (const variant of variants) {
    await prisma.productVariant.upsert({
      where: { sku: variant.sku },
      create: { ...variant, productId },
      update: {
        price: variant.price,
        stock: variant.stock,
        attributes: variant.attributes,
        weight: variant.weight,
        dimensions: variant.dimensions,
        lowStockThreshold: variant.lowStockThreshold,
        isActive: variant.isActive,
      },
    });
  }

  await prisma.productVariant.updateMany({
    where: { productId, sku: { notIn: skus } },
    data: { isActive: false, stock: 0 },
  });
}

// ─── Helper: get API key from supplier ───
async function getApiKey(supplierId: string): Promise<string> {
  const supplier = await prisma.dropshipSupplier.findUnique({ where: { id: supplierId } });
  if (!supplier?.apiKey) throw new Error('CJ API key not configured for this supplier');
  return supplier.apiKey;
}

// ─── Connection / Configuration ───
export const testConnection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ success: false, message: 'API key is required' });
    const result = await cjDropshippingService.testConnection(apiKey);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const configureSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apiKey, name, storeUrl, currency, profitMargin } = req.body;
    if (!apiKey || !name) return res.status(400).json({ success: false, message: 'apiKey and name are required' });

    // Test connection first
    const test = await cjDropshippingService.testConnection(apiKey);
    if (!test.success) return res.status(400).json({ success: false, message: `Connection failed: ${test.message}` });

    // Create or update the CJ supplier
    const existing = await prisma.dropshipSupplier.findFirst({ where: { provider: 'cjdropshipping' } });
    let supplier;
    if (existing) {
      supplier = await prisma.dropshipSupplier.update({
        where: { id: existing.id },
        data: {
          name,
          apiKey,
          storeUrl: storeUrl || existing.storeUrl,
          currency: currency || 'USD',
          isVerified: true,
          isActive: true,
          metadata: JSON.stringify({ profitMargin: profitMargin || 0.3, type: 'cjdropshipping' }),
        },
      });
    } else {
      supplier = await prisma.dropshipSupplier.create({
        data: {
          name,
          provider: 'cjdropshipping',
          apiKey,
          storeUrl,
          currency: currency || 'USD',
          isVerified: true,
          isActive: true,
          metadata: JSON.stringify({ profitMargin: profitMargin || 0.3, type: 'cjdropshipping' }),
        },
      });
    }

    // Also create/update a provider connection for the integrations page
    const adapter = await prisma.providerAdapter.findFirst({ where: { provider: 'cjdropshipping' } });
    if (adapter) {
      await prisma.providerConnection.upsert({
        where: { id: `cj-conn-${adapter.id}` },
        create: {
          id: `cj-conn-${adapter.id}`,
          adapterId: adapter.id,
          name: `${name} (CJ)`,
          credentials: JSON.stringify({ apiKey }),
          config: JSON.stringify({ storeUrl, currency, profitMargin: profitMargin || 0.3 }),
          isActive: true,
          isVerified: true,
          lastSyncAt: new Date(),
        },
        update: {
          credentials: JSON.stringify({ apiKey }),
          config: JSON.stringify({ storeUrl, currency, profitMargin: profitMargin || 0.3 }),
          isVerified: true,
          lastSyncAt: new Date(),
        },
      });
    }

    res.json({ success: true, data: supplier });
  } catch (e) { next(e); }
};

export const getConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supplier = await prisma.dropshipSupplier.findFirst({ where: { provider: 'cjdropshipping' } });
    if (!supplier) return res.json({ success: true, data: null });
    const metadata = parseMetadata(supplier.metadata);
    res.json({
      success: true,
      data: {
        id: supplier.id,
        name: supplier.name,
        apiKey: supplier.apiKey ? '••••••••' + (supplier.apiKey.slice(-4)) : null,
        storeUrl: supplier.storeUrl,
        currency: supplier.currency,
        isVerified: supplier.isVerified,
        isActive: supplier.isActive,
        profitMargin: metadata.profitMargin || 0.3,
      },
    });
  } catch (e) {
    if (isMissingIntegrationTableError(e)) {
      return res.json({ success: true, data: null });
    }
    next(e);
  }
};

// ─── Products ───
export const searchProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey(req.params.supplierId);
    const result = await cjDropshippingService.searchProducts(apiKey, req.query as any);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const getProductDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey(req.params.supplierId);
    const result = await cjDropshippingService.getProductDetail(apiKey, req.params.pid);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey(req.params.supplierId);
    const result = await cjDropshippingService.getCategories(apiKey);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const importProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supplierId } = req.params;
    const apiKey = await getApiKey(supplierId);
    const result = await cjDropshippingService.importProducts(supplierId, apiKey, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const syncPricing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supplierId } = req.params;
    const apiKey = await getApiKey(supplierId);
    const result = await cjDropshippingService.syncPricing(supplierId, apiKey);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const pushToStore = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supplierId } = req.params;
    const { mappingIds } = req.body; // Array of mapping IDs to push as local products

    if (!mappingIds?.length) return res.status(400).json({ success: false, message: 'mappingIds required' });

    const mappings = await prisma.dropshipProductMapping.findMany({
      where: { id: { in: mappingIds }, supplierId, isActive: true },
    });

    const created: string[] = [];
    const updated: string[] = [];
    const errors: string[] = [];
    const seller = await ensureSourcingSeller(req.user!.userId);

    if (mappings.length !== mappingIds.length) {
      errors.push(`Found ${mappings.length} active mappings for ${mappingIds.length} selected IDs.`);
    }

    for (const originalMapping of mappings) {
      let mapping = originalMapping;
      let specs = parseMetadata(mapping.specifications);
      try {
        const refreshed = await refreshMappingContent(supplierId, mapping);
        mapping = refreshed.mapping;
        specs = refreshed.specs;
      } catch (error) {
        errors.push(`Refresh ${mapping.supplierSku}: ${error instanceof Error ? error.message : 'Failed to load CJ details'}`);
      }

      const category = await ensureSourcingCategory(mapping.category);
      const imageUrls = getProductImages(mapping, specs);
      const variants = buildProductVariants(mapping, specs);
      const productData = {
        title: mapping.supplierTitle,
        basePrice: Number(mapping.sellingPrice || mapping.costPrice || mapping.supplierPrice || 0),
        costPrice: Number(mapping.costPrice || mapping.supplierPrice || 0),
        currency: mapping.supplierCurrency || 'USD',
        description: buildProductDescription(mapping, specs),
        specifications: JSON.stringify({
          source: 'CJ Dropshipping',
          supplierSku: mapping.supplierSku,
          supplierProductId: mapping.supplierProductId,
          supplierUrl: mapping.supplierUrl,
          ...(specs || {}),
        }),
        categoryId: category.id,
        isActive: true,
        status: 'ACTIVE',
      };

      // Check if product already exists for this mapping
      if (mapping.localProductId) {
        // Update existing product
        try {
          const updatedProduct = await prisma.product.update({
            where: { id: mapping.localProductId },
            data: productData,
          });
          await syncProductImages(mapping.localProductId, mapping.supplierTitle, imageUrls);
          await syncProductVariants(mapping.localProductId, variants);
          updated.push(updatedProduct.id);
        } catch (error) {
          errors.push(`Update ${mapping.supplierSku}: ${error instanceof Error ? error.message : 'Failed'}`);
        }
      } else {
        // Create new product
        try {
          const product = await prisma.product.create({
            data: {
              ...productData,
              slug: await getUniqueProductSlug(mapping.supplierTitle, mapping.supplierSku),
              sellerId: seller.id,
              images: imageUrls.length ? {
                create: imageUrls.map((url, index) => ({ url, alt: mapping.supplierTitle, isPrimary: index === 0, sortOrder: index })),
              } : undefined,
              variants: {
                create: variants,
              },
            },
          });

          // Link the product to the mapping
          await prisma.dropshipProductMapping.update({
            where: { id: mapping.id },
            data: { localProductId: product.id },
          });

          created.push(product.id);
        } catch (error) {
          errors.push(`Create ${mapping.supplierSku}: ${error instanceof Error ? error.message : 'Failed'}`);
        }
      }
    }

    res.status(201).json({
      success: true,
      data: {
        requested: mappingIds.length,
        found: mappings.length,
        created: created.length,
        updated: updated.length,
        pushed: created.length + updated.length,
        errors,
      },
    });
  } catch (e) { next(e); }
};

export const listMappings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supplierId } = req.params;
    const mappings = await prisma.dropshipProductMapping.findMany({
      where: { supplierId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: mappings });
  } catch (e) { next(e); }
};

// ─── Warehouses & Shipping ───
export const getWarehouses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey(req.params.supplierId);
    const result = await cjDropshippingService.getWarehouses(apiKey);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const getShippingMethods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey(req.params.supplierId);
    const result = await cjDropshippingService.getShippingMethods(apiKey, req.query as any);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const calculateShipping = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey(req.params.supplierId);
    const result = await cjDropshippingService.calculateShippingCost(apiKey, req.body);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

// ─── Orders ───
export const listOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey(req.params.supplierId);
    const result = await cjDropshippingService.listOrders(apiKey, req.query as any);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const getOrderDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderNumber } = req.params;
    const apiKey = await getApiKey(req.params.supplierId);
    const result = await cjDropshippingService.getOrderDetail(apiKey, orderNumber);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const getTrackingInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderNumber } = req.params;
    const apiKey = await getApiKey(req.params.supplierId);
    const result = await cjDropshippingService.getTrackingInfo(apiKey, orderNumber);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const placeOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supplierId, orderId } = req.params;
    const apiKey = await getApiKey(supplierId);
    const result = await cjDropshippingService.placeOrder(supplierId, apiKey, orderId);
    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const listDropshipOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supplierId } = req.params;
    const orders = await prisma.dropshipOrder.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: orders });
  } catch (e) { next(e); }
};

// ─── Webhook ───
export const receiveWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await cjDropshippingService.handleWebhook(req.body);
    res.json({ success: true, message: 'Webhook received' });
  } catch (e) { next(e); }
};

export const registerWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await getApiKey(req.params.supplierId);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const webhookUrl = `${baseUrl}/api/cj-dropshipping/webhook`;
    const events = ['order.status', 'order.tracking'];
    const result = await cjDropshippingService.registerWebhook(apiKey, webhookUrl, events);
    res.json({ success: true, data: { registered: result, webhookUrl } });
  } catch (e) { next(e); }
};

// ─── Dashboard / Stats ───
export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supplierId } = req.params;
    const [mappings, orders, importJobs] = await Promise.all([
      prisma.dropshipProductMapping.count({ where: { supplierId, isActive: true } }),
      prisma.dropshipOrder.findMany({ where: { supplierId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.dropshipImportJob.findMany({ where: { supplierId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);
    res.json({
      success: true,
      data: {
        totalMappings: mappings,
        recentOrders: orders,
        recentImports: importJobs,
      },
    });
  } catch (e) { next(e); }
};
