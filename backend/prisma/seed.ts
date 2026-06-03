import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Clear existing data ──
  await prisma.notification.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.storefrontSection.deleteMany();
  await prisma.sellerPayout.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.user.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.badgeType.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.assetGroup.deleteMany();
  await prisma.assetFamily.deleteMany();

  const hash = (pwd: string) => bcrypt.hash(pwd, 10);
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set before seeding the default admin user.');
  }

  // ── 1. ADMIN ──
  const adminUser = await prisma.user.create({
    data: {
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
  console.log('✅ Admin created');

  // ── 2. CUSTOMERS ──
  const customer1 = await prisma.user.create({
    data: {
      email: 'juma@example.com',
      phone: '+255712345678',
      passwordHash: await hash('Customer@123'),
      firstName: 'Juma',
      lastName: 'Mwakasege',
      role: 'CUSTOMER',
      isVerified: true,
      isActive: true,
      preferences: { create: {} },
    },
  });
  await prisma.userAddress.create({
    data: {
      userId: customer1.id,
      label: 'Home',
      phone: '+255712345678',
      street: '123 Mtaa wa Samora',
      city: 'Dar es Salaam',
      state: 'Dar es Salaam',
      country: 'TZ',
      isDefault: true,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'amina@example.com',
      phone: '+255762345679',
      passwordHash: await hash('Customer@123'),
      firstName: 'Amina',
      lastName: 'Hassan',
      role: 'CUSTOMER',
      isVerified: true,
      isActive: true,
      preferences: { create: {} },
    },
  });
  await prisma.userAddress.create({
    data: {
      userId: customer2.id,
      label: 'Home',
      phone: '+255762345679',
      street: '456 Mtaa wa Mikocheni',
      city: 'Dar es Salaam',
      state: 'Dar es Salaam',
      country: 'TZ',
      isDefault: true,
    },
  });
  console.log('✅ 2 Customers created');

  // ── 3. SELLER ──
  const sellerUser = await prisma.user.create({
    data: {
      email: 'seller@example.com',
      phone: '+255756789012',
      passwordHash: await hash('Seller@123'),
      firstName: 'Rajabu',
      lastName: 'Kassim',
      role: 'SELLER',
      isVerified: true,
      isActive: true,
      preferences: { create: {} },
    },
  });

  const seller = await prisma.seller.create({
    data: {
      userId: sellerUser.id,
      storeName: 'TechZone Tanzania',
      storeSlug: 'techzone-tz',
      storeDescription: 'Your premier destination for electronics, gadgets, and accessories across Tanzania. Quality products at competitive prices with fast delivery nationwide.',
      storeLocation: 'Dar es Salaam, Tanzania',
      sellerType: 'BUSINESS',
      kycStatus: 'VERIFIED',
      isVerified: true,
      isActive: true,
      rating: 4.5,
      totalOrders: 0,
      totalRevenue: 0,
    },
  });
  console.log('✅ Seller created (TechZone Tanzania)');

  // ── 4. DELIVERY PEOPLE ──
  const deliveryUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'driver1@example.com',
        phone: '+255733000001',
        passwordHash: await hash('Driver@123'),
        firstName: 'Baraka',
        lastName: 'Mwita',
        role: 'DELIVERY',
        isVerified: true,
        isActive: true,
        preferences: { create: {} },
      },
    }),
    prisma.user.create({
      data: {
        email: 'driver2@example.com',
        phone: '+255733000002',
        passwordHash: await hash('Driver@123'),
        firstName: 'Neema',
        lastName: 'Joseph',
        role: 'DELIVERY',
        isVerified: true,
        isActive: true,
        preferences: { create: {} },
      },
    }),
  ]);

  await Promise.all([
    prisma.deliveryPerson.create({
      data: {
        userId: deliveryUsers[0].id,
        vehicleType: 'Motorbike',
        vehicleReg: 'T 451 DLV',
        serviceZone: 'Dar es Salaam',
        isAvailable: true,
        isActive: true,
        rating: 4.8,
        totalDeliveries: 18,
      },
    }),
    prisma.deliveryPerson.create({
      data: {
        userId: deliveryUsers[1].id,
        vehicleType: 'Van',
        vehicleReg: 'T 982 DLV',
        serviceZone: 'Dar es Salaam North',
        isAvailable: false,
        isActive: true,
        rating: 4.6,
        totalDeliveries: 27,
      },
    }),
  ]);
  console.log('✅ 2 Delivery people created');

  // ── 5. DEEP CATEGORY HIERARCHY ──
  // Level 0: Top categories
  const electronics = await prisma.category.create({ data: { name: 'Electronics', slug: 'electronics', description: 'Electronic devices and accessories', level: 0, sortOrder: 1, isActive: true } });
  const fashion = await prisma.category.create({ data: { name: 'Fashion & Apparel', slug: 'fashion-apparel', description: 'Clothing, shoes, and accessories', level: 0, sortOrder: 2, isActive: true } });
  const homeGarden = await prisma.category.create({ data: { name: 'Home & Garden', slug: 'home-garden', description: 'Home improvement, furniture, and garden supplies', level: 0, sortOrder: 3, isActive: true } });
  const healthBeauty = await prisma.category.create({ data: { name: 'Health & Beauty', slug: 'health-beauty', description: 'Personal care, cosmetics, and wellness products', level: 0, sortOrder: 4, isActive: true } });
  const sportsOutdoor = await prisma.category.create({ data: { name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Sports equipment, gear, and outdoor recreation', level: 0, sortOrder: 5, isActive: true } });

  // Level 1: Subcategories
  const phones = await prisma.category.create({ data: { name: 'Mobile Phones', slug: 'mobile-phones', description: 'Smartphones and feature phones', parentId: electronics.id, level: 1, sortOrder: 1, isActive: true } });
  const laptops = await prisma.category.create({ data: { name: 'Laptops & Computers', slug: 'laptops-computers', description: 'Laptops, desktops, and tablets', parentId: electronics.id, level: 1, sortOrder: 2, isActive: true } });
  const audio = await prisma.category.create({ data: { name: 'Audio & Headphones', slug: 'audio-headphones', description: 'Headphones, speakers, and audio equipment', parentId: electronics.id, level: 1, sortOrder: 3, isActive: true } });
  const accessories = await prisma.category.create({ data: { name: 'Accessories', slug: 'electronic-accessories', description: 'Cables, chargers, cases, and more', parentId: electronics.id, level: 1, sortOrder: 4, isActive: true } });

  const mensWear = await prisma.category.create({ data: { name: "Men's Wear", slug: 'mens-wear', description: 'Clothing and accessories for men', parentId: fashion.id, level: 1, sortOrder: 1, isActive: true } });
  const womensWear = await prisma.category.create({ data: { name: "Women's Wear", slug: 'womens-wear', description: 'Clothing and accessories for women', parentId: fashion.id, level: 1, sortOrder: 2, isActive: true } });
  const shoes = await prisma.category.create({ data: { name: 'Shoes', slug: 'shoes', description: 'Footwear for all ages and styles', parentId: fashion.id, level: 1, sortOrder: 3, isActive: true } });

  const furniture = await prisma.category.create({ data: { name: 'Furniture', slug: 'furniture', description: 'Home and office furniture', parentId: homeGarden.id, level: 1, sortOrder: 1, isActive: true } });
  const kitchen = await prisma.category.create({ data: { name: 'Kitchen & Dining', slug: 'kitchen-dining', description: 'Kitchen appliances, tools, and dining ware', parentId: homeGarden.id, level: 1, sortOrder: 2, isActive: true } });
  const homeDecor = await prisma.category.create({ data: { name: 'Home Decor', slug: 'home-decor', description: 'Decoration items, lighting, and wall art', parentId: homeGarden.id, level: 1, sortOrder: 3, isActive: true } });

  const skincare = await prisma.category.create({ data: { name: 'Skincare', slug: 'skincare', description: 'Face and body skincare products', parentId: healthBeauty.id, level: 1, sortOrder: 1, isActive: true } });
  const cosmetics = await prisma.category.create({ data: { name: 'Cosmetics', slug: 'cosmetics', description: 'Makeup and beauty cosmetics', parentId: healthBeauty.id, level: 1, sortOrder: 2, isActive: true } });
  const hairCare = await prisma.category.create({ data: { name: 'Hair Care', slug: 'hair-care', description: 'Shampoo, conditioner, and styling products', parentId: healthBeauty.id, level: 1, sortOrder: 3, isActive: true } });

  const fitness = await prisma.category.create({ data: { name: 'Fitness Equipment', slug: 'fitness-equipment', description: 'Gym equipment, weights, and fitness gear', parentId: sportsOutdoor.id, level: 1, sortOrder: 1, isActive: true } });
  const camping = await prisma.category.create({ data: { name: 'Camping & Hiking', slug: 'camping-hiking', description: 'Tents, backpacks, and outdoor gear', parentId: sportsOutdoor.id, level: 1, sortOrder: 2, isActive: true } });
  const cycling = await prisma.category.create({ data: { name: 'Cycling', slug: 'cycling', description: 'Bicycles, parts, and cycling accessories', parentId: sportsOutdoor.id, level: 1, sortOrder: 3, isActive: true } });

  // Level 2: Sub-subcategories
  const smartphones = await prisma.category.create({ data: { name: 'Smartphones', slug: 'smartphones', description: 'iOS and Android smartphones', parentId: phones.id, level: 2, sortOrder: 1, isActive: true } });
  const featurePhones = await prisma.category.create({ data: { name: 'Feature Phones', slug: 'feature-phones', description: 'Basic phones for calls and texts', parentId: phones.id, level: 2, sortOrder: 2, isActive: true } });
  const phoneCases = await prisma.category.create({ data: { name: 'Phone Cases', slug: 'phone-cases', description: 'Protective cases and covers', parentId: accessories.id, level: 2, sortOrder: 1, isActive: true } });
  const chargers = await prisma.category.create({ data: { name: 'Chargers & Cables', slug: 'chargers-cables', description: 'Charging cables, adapters, and power banks', parentId: accessories.id, level: 2, sortOrder: 2, isActive: true } });

  const menTShirts = await prisma.category.create({ data: { name: 'T-Shirts', slug: 'men-tshirts', description: 'Casual and formal t-shirts for men', parentId: mensWear.id, level: 2, sortOrder: 1, isActive: true } });
  const menJeans = await prisma.category.create({ data: { name: 'Jeans & Trousers', slug: 'men-jeans', description: 'Jeans, chinos, and casual trousers', parentId: mensWear.id, level: 2, sortOrder: 2, isActive: true } });
  const womenDresses = await prisma.category.create({ data: { name: 'Dresses', slug: 'women-dresses', description: 'Casual and formal dresses', parentId: womensWear.id, level: 2, sortOrder: 1, isActive: true } });
  const womenBlouses = await prisma.category.create({ data: { name: 'Blouses & Tops', slug: 'women-blouses', description: 'Blouses, tops, and shirts for women', parentId: womensWear.id, level: 2, sortOrder: 2, isActive: true } });

  const sofas = await prisma.category.create({ data: { name: 'Sofas & Couches', slug: 'sofas', description: 'Living room seating', parentId: furniture.id, level: 2, sortOrder: 1, isActive: true } });
  const beds = await prisma.category.create({ data: { name: 'Beds & Mattresses', slug: 'beds-mattresses', description: 'Bed frames, mattresses, and bedroom furniture', parentId: furniture.id, level: 2, sortOrder: 2, isActive: true } });

  // Level 3
  await prisma.category.create({ data: { name: 'iPhone', slug: 'iphone', description: 'Apple iPhones', parentId: smartphones.id, level: 3, sortOrder: 1, isActive: true } });
  await prisma.category.create({ data: { name: 'Samsung Galaxy', slug: 'samsung-galaxy', description: 'Samsung Galaxy smartphones', parentId: smartphones.id, level: 3, sortOrder: 2, isActive: true } });
  await prisma.category.create({ data: { name: 'Tecno & Infinix', slug: 'tecno-infinix', description: 'Tecno and Infinix smartphones', parentId: smartphones.id, level: 3, sortOrder: 3, isActive: true } });
  await prisma.category.create({ data: { name: 'Casual Shoes', slug: 'casual-shoes', description: 'Everyday casual footwear', parentId: shoes.id, level: 2, sortOrder: 1, isActive: true } });
  await prisma.category.create({ data: { name: 'Formal Shoes', slug: 'formal-shoes', description: 'Business and formal footwear', parentId: shoes.id, level: 2, sortOrder: 2, isActive: true } });
  await prisma.category.create({ data: { name: 'Sports Shoes', slug: 'sports-shoes', description: 'Athletic and running shoes', parentId: shoes.id, level: 2, sortOrder: 3, isActive: true } });

  console.log('✅ Deep category hierarchy seeded');

  // ── 6. BRANDS ──
  const brands = await Promise.all([
    prisma.brand.create({ data: { name: 'Samsung', slug: 'samsung', description: 'South Korean electronics giant', isApproved: true } }),
    prisma.brand.create({ data: { name: 'Apple', slug: 'apple', description: 'American technology company', isApproved: true } }),
    prisma.brand.create({ data: { name: 'Nike', slug: 'nike', description: 'American sportswear brand', isApproved: true } }),
    prisma.brand.create({ data: { name: 'Adidas', slug: 'adidas', description: 'German sportswear brand', isApproved: true } }),
    prisma.brand.create({ data: { name: 'Tecno', slug: 'tecno', description: 'Chinese smartphone brand', isApproved: true } }),
  ]);
  console.log('✅ 5 Brands created');

  // ── 7. 10 PRODUCTS ──
  const products = [
    {
      title: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      description: '<h3>Flagship Android Smartphone</h3><p>The Samsung Galaxy S24 Ultra features a 6.8-inch Dynamic AMOLED 2X display, Snapdragon 8 Gen 3 processor, 200MP camera system, S Pen support, and 5000mAh battery.</p><ul><li>12GB RAM + 256GB Storage</li><li>200MP Main Camera + 50MP Telephoto</li><li>S Pen Included</li><li>IP68 Water Resistant</li><li>One UI 6.1 with 7 Years OS Updates</li></ul>',
      basePrice: 1650000,
      discountPrice: 1450000,
      sellerId: seller.id,
      categoryId: smartphones.id,
      brandId: brands[0].id,
      status: 'ACTIVE',
      isFeatured: true,
      isActive: true,
      totalSales: 45,
      rating: 4.8,
      reviewCount: 23,
    },
    {
      title: 'iPhone 15 Pro Max',
      slug: 'iphone-15-pro-max',
      description: '<h3>Apple\'s Most Powerful iPhone</h3><p>The iPhone 15 Pro Max features an A17 Pro chip, 6.7-inch Super Retina XDR display with ProMotion, 48MP main camera with 5x optical zoom, titanium design, and USB-C connectivity.</p><ul><li>8GB RAM + 256GB Storage</li><li>48MP Main + 12MP Ultra Wide + 12MP Telephoto</li><li>Action Button</li><li>Titanium Frame</li><li>iOS 17 with Advanced Features</li></ul>',
      basePrice: 1800000,
      discountPrice: 1590000,
      sellerId: seller.id,
      categoryId: smartphones.id,
      brandId: brands[1].id,
      status: 'ACTIVE',
      isFeatured: true,
      isActive: true,
      totalSales: 32,
      rating: 4.9,
      reviewCount: 18,
    },
    {
      title: 'MacBook Pro 14" M3 Pro',
      slug: 'macbook-pro-14-m3-pro',
      description: '<h3>Professional Laptop</h3><p>The MacBook Pro 14-inch with M3 Pro chip delivers exceptional performance for developers, designers, and content creators.</p><ul><li>Apple M3 Pro Chip (11-core CPU, 14-core GPU)</li><li>18GB Unified Memory</li><li>512GB SSD Storage</li><li>Liquid Retina XDR Display</li><li>22 Hours Battery Life</li></ul>',
      basePrice: 2500000,
      discountPrice: 2290000,
      sellerId: seller.id,
      categoryId: laptops.id,
      brandId: brands[1].id,
      status: 'ACTIVE',
      isFeatured: true,
      isActive: true,
      totalSales: 12,
      rating: 4.7,
      reviewCount: 8,
    },
    {
      title: 'Nike Air Max 90',
      slug: 'nike-air-max-90',
      description: '<h3>Iconic Sneakers</h3><p>The Nike Air Max 90 is a timeless classic with visible Air cushioning, durable leather and mesh upper, and a bold design that stands out.</p>',
      basePrice: 180000,
      discountPrice: 150000,
      sellerId: seller.id,
      categoryId: sportsOutdoor.id,
      brandId: brands[2].id,
      status: 'ACTIVE',
      isFeatured: true,
      isActive: true,
      totalSales: 78,
      rating: 4.6,
      reviewCount: 34,
    },
    {
      title: 'Adidas Ultraboost Light',
      slug: 'adidas-ultraboost-light',
      description: '<h3>Ultra-comfort Running Shoes</h3><p>Adidas Ultraboost Light features the lightest Ultraboost ever with BOOST technology, Primeknit+ upper, and Continental rubber outsole.</p>',
      basePrice: 220000,
      discountPrice: 185000,
      sellerId: seller.id,
      categoryId: sportsOutdoor.id,
      brandId: brands[3].id,
      status: 'ACTIVE',
      isFeatured: false,
      isActive: true,
      totalSales: 56,
      rating: 4.5,
      reviewCount: 28,
    },
    {
      title: 'Samsung Galaxy Tab S9',
      slug: 'samsung-galaxy-tab-s9',
      description: '<h3>Premium Android Tablet</h3><p>The Galaxy Tab S9 features an 11-inch Dynamic AMOLED 2X display, Snapdragon 8 Gen 2 processor, IP68 water resistance, and S Pen included.</p>',
      basePrice: 850000,
      discountPrice: 749000,
      sellerId: seller.id,
      categoryId: laptops.id,
      brandId: brands[0].id,
      status: 'ACTIVE',
      isFeatured: false,
      isActive: true,
      totalSales: 23,
      rating: 4.4,
      reviewCount: 12,
    },
    {
      title: 'Samsung Galaxy Buds2 Pro',
      slug: 'samsung-galaxy-buds2-pro',
      description: '<h3>Premium Wireless Earbuds</h3><p>Galaxy Buds2 Pro offer Hi-Fi sound with 24-bit audio, intelligent ANC, 360 Audio, and up to 29 hours of battery life.</p>',
      basePrice: 250000,
      discountPrice: 199000,
      sellerId: seller.id,
      categoryId: audio.id,
      brandId: brands[0].id,
      status: 'ACTIVE',
      isFeatured: false,
      isActive: true,
      totalSales: 67,
      rating: 4.3,
      reviewCount: 31,
    },
    {
      title: 'Tecno Camon 20 Pro',
      slug: 'tecno-camon-20-pro',
      description: '<h3>Affordable Camera Phone</h3><p>Tecno Camon 20 Pro features a 64MP main camera, MediaTek Helio G99 processor, 6.67-inch AMOLED display, and 5000mAh battery.</p>',
      basePrice: 350000,
      discountPrice: 299000,
      sellerId: seller.id,
      categoryId: smartphones.id,
      brandId: brands[4].id,
      status: 'ACTIVE',
      isFeatured: false,
      isActive: true,
      totalSales: 112,
      rating: 4.2,
      reviewCount: 45,
    },
    {
      title: 'Nike Dri-FIT Training Tee',
      slug: 'nike-dri-fit-training-tee',
      description: '<h3>Performance T-Shirt</h3><p>Nike Dri-FIT technology moves sweat away from your skin for quicker evaporation, helping you stay dry and comfortable during workouts.</p>',
      basePrice: 45000,
      discountPrice: null,
      sellerId: seller.id,
      categoryId: menTShirts.id,
      brandId: brands[2].id,
      status: 'ACTIVE',
      isFeatured: false,
      isActive: true,
      totalSales: 145,
      rating: 4.4,
      reviewCount: 62,
    },
    {
      title: 'AirPods Pro 2nd Gen',
      slug: 'airpods-pro-2nd-gen',
      description: '<h3>Apple Wireless Earbuds</h3><p>AirPods Pro (2nd generation) feature Adaptive Audio, Active Noise Cancellation, Personalized Spatial Audio, and USB-C charging.</p>',
      basePrice: 320000,
      discountPrice: 279000,
      sellerId: seller.id,
      categoryId: audio.id,
      brandId: brands[1].id,
      status: 'ACTIVE',
      isFeatured: true,
      isActive: true,
      totalSales: 89,
      rating: 4.7,
      reviewCount: 41,
    },
  ];

  const createdProducts = [];
  for (const p of products) {
    const product = await prisma.product.create({ data: p });
    createdProducts.push(product);
  }
  console.log('✅ 10 Products created');

  // ── 8. PRODUCT IMAGES ──
  for (const product of createdProducts) {
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: `/uploads/products/${product.slug}-1.jpg`,
        alt: `${product.title} - Main Image`,
        sortOrder: 0,
        isPrimary: true,
      },
    });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: `/uploads/products/${product.slug}-2.jpg`,
        alt: `${product.title} - View 2`,
        sortOrder: 1,
        isPrimary: false,
      },
    });
  }
  console.log('✅ Product images seeded');

  // ── 9. PRODUCT VARIANTS ──
  await prisma.productVariant.create({
    data: { productId: createdProducts[0].id, sku: 'S24U-256-BLK', attributes: JSON.stringify({ color: 'Titanium Black', storage: '256GB' }), price: 1450000, stock: 10, isActive: true },
  });
  await prisma.productVariant.create({
    data: { productId: createdProducts[0].id, sku: 'S24U-256-GRY', attributes: JSON.stringify({ color: 'Titanium Gray', storage: '256GB' }), price: 1450000, stock: 8, isActive: true },
  });
  await prisma.productVariant.create({
    data: { productId: createdProducts[0].id, sku: 'S24U-512-BLK', attributes: JSON.stringify({ color: 'Titanium Black', storage: '512GB' }), price: 1650000, stock: 5, isActive: true },
  });

  await prisma.productVariant.create({
    data: { productId: createdProducts[3].id, sku: 'AM90-42', attributes: JSON.stringify({ size: 'EU 42', color: 'White/Black' }), price: 150000, stock: 20, isActive: true },
  });
  await prisma.productVariant.create({
    data: { productId: createdProducts[3].id, sku: 'AM90-43', attributes: JSON.stringify({ size: 'EU 43', color: 'White/Black' }), price: 150000, stock: 15, isActive: true },
  });
  await prisma.productVariant.create({
    data: { productId: createdProducts[3].id, sku: 'AM90-44', attributes: JSON.stringify({ size: 'EU 44', color: 'White/Black' }), price: 150000, stock: 12, isActive: true },
  });

  console.log('✅ Product variants created');

  // ── 10. TEST ORDERS ──
  const shippingAddress1 = JSON.stringify({
    street: 'Plot 12, Samora Avenue',
    city: 'Dar es Salaam',
    state: 'Dar es Salaam',
    country: 'TZ',
    phone: '+255712345678',
  });
  const shippingAddress2 = JSON.stringify({
    street: 'Mikocheni B, Rose Garden Road',
    city: 'Dar es Salaam',
    state: 'Dar es Salaam',
    country: 'TZ',
    phone: '+255762345679',
  });
  const shippingAddress3 = JSON.stringify({
    street: 'Oysterbay Shopping Center',
    city: 'Dar es Salaam',
    state: 'Dar es Salaam',
    country: 'TZ',
    phone: '+255712345678',
  });

  await prisma.order.create({
    data: {
      orderNumber: 'ORD-SEED-READY',
      userId: customer1.id,
      sellerId: seller.id,
      status: 'READY_TO_SHIP',
      shippingAddress: shippingAddress1,
      shippingMethod: 'Local delivery',
      subtotal: 1450000,
      totalAmount: 1450000,
      paymentMethod: 'MPESA',
      paymentStatus: 'PAID',
      items: {
        create: [{
          productId: createdProducts[0].id,
          productSnapshot: JSON.stringify({ title: createdProducts[0].title, slug: createdProducts[0].slug, price: 1450000 }),
          quantity: 1,
          unitPrice: 1450000,
          totalPrice: 1450000,
        }],
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: 'ORD-SEED-PENDING-DELIVERY',
      userId: customer2.id,
      sellerId: seller.id,
      status: 'READY_TO_SHIP',
      shippingAddress: shippingAddress2,
      shippingMethod: 'Local delivery',
      subtotal: 279000,
      totalAmount: 279000,
      paymentMethod: 'CARD',
      paymentStatus: 'PAID',
      items: {
        create: [{
          productId: createdProducts[9].id,
          productSnapshot: JSON.stringify({ title: createdProducts[9].title, slug: createdProducts[9].slug, price: 279000 }),
          quantity: 1,
          unitPrice: 279000,
          totalPrice: 279000,
        }],
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: 'ORD-SEED-IN-TRANSIT',
      userId: customer1.id,
      sellerId: seller.id,
      status: 'IN_TRANSIT',
      shippingAddress: shippingAddress3,
      shippingMethod: 'Local delivery',
      subtotal: 150000,
      totalAmount: 150000,
      paymentMethod: 'MPESA',
      paymentStatus: 'PAID',
      items: {
        create: [{
          productId: createdProducts[3].id,
          productSnapshot: JSON.stringify({ title: createdProducts[3].title, slug: createdProducts[3].slug, price: 150000 }),
          quantity: 1,
          unitPrice: 150000,
          totalPrice: 150000,
        }],
      },
    },
  });

  const inTransitOrder = await prisma.order.findUnique({ where: { orderNumber: 'ORD-SEED-IN-TRANSIT' } });

  // Create shipment for in-transit order
  await prisma.shipment.create({
    data: {
      orderId: inTransitOrder!.id,
      courierCode: 'MARKETPLACE_DELIVERY',
      trackingNumber: 'TRK-SEED-TRANSIT',
      status: 'IN_TRANSIT',
      origin: 'TechZone Tanzania, Kariakoo',
      destination: 'Oysterbay Shopping Center',
      estimatedDays: 1,
      shippedAt: new Date(Date.now() - 45 * 60 * 1000),
      events: JSON.stringify([
        { status: 'PICKED_UP', description: 'Package picked up from seller', timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
      ]),
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: deliveryUsers[0].id,
        type: 'NEW_DELIVERY_AVAILABLE',
        title: 'New Delivery Available',
        body: `A seed delivery is available for order #ORD-SEED-PENDING-DELIVERY`,
        data: JSON.stringify({ orderNumber: 'ORD-SEED-PENDING-DELIVERY' }),
      },
      {
        userId: customer1.id,
        type: 'DELIVERY_PICKED_UP',
        title: 'Order In Transit',
        body: 'Your order #ORD-SEED-IN-TRANSIT is on its way.',
        data: JSON.stringify({ orderNumber: 'ORD-SEED-IN-TRANSIT' }),
      },
    ],
  });

  console.log('✅ 3 Test orders and shipment data seeded');

  // ── 11. ASSET FAMILIES & GROUPS ──
  const families = [
    {
      name: 'Product Assets', slug: 'product-assets', icon: '📦', sortOrder: 1,
      groups: [
        { name: 'Product Main Images', slug: 'product-main', icon: '🖼️', sortOrder: 1 },
        { name: 'Product Gallery', slug: 'product-gallery', icon: '📸', sortOrder: 2 },
        { name: 'Product Thumbnails', slug: 'product-thumbnails', icon: '🔲', sortOrder: 3 },
        { name: 'Category Banners', slug: 'category-banners', icon: '🏷️', sortOrder: 4 },
        { name: 'Brand Logos', slug: 'brand-logos', icon: '®️', sortOrder: 5 },
      ],
    },
    {
      name: 'User & Profile', slug: 'user-profile', icon: '👤', sortOrder: 2,
      groups: [
        { name: 'User Avatars', slug: 'user-avatars', icon: '🧑', sortOrder: 1 },
        { name: 'Seller Logos', slug: 'seller-logos', icon: '🏪', sortOrder: 2 },
        { name: 'Seller Banners', slug: 'seller-banners', icon: '🖼️', sortOrder: 3 },
        { name: 'KYC Documents', slug: 'kyc-documents', icon: '📋', sortOrder: 4 },
      ],
    },
    {
      name: 'Marketing', slug: 'marketing', icon: '🎯', sortOrder: 3,
      groups: [
        { name: 'Campaign Banners', slug: 'campaign-banners', icon: '📢', sortOrder: 1 },
        { name: 'Hero Images', slug: 'hero-images', icon: '🌟', sortOrder: 2 },
        { name: 'Email Templates', slug: 'email-templates', icon: '✉️', sortOrder: 3 },
        { name: 'Social Media', slug: 'social-media', icon: '📱', sortOrder: 4 },
        { name: 'Promotional Videos', slug: 'promo-videos', icon: '🎬', sortOrder: 5 },
      ],
    },
    {
      name: 'Content', slug: 'content', icon: '📝', sortOrder: 4,
      groups: [
        { name: 'Blog Covers', slug: 'blog-covers', icon: '📰', sortOrder: 1 },
        { name: 'Page Backgrounds', slug: 'page-backgrounds', icon: '🏔️', sortOrder: 2 },
        { name: 'Icons & UI', slug: 'icons-ui', icon: '🎨', sortOrder: 3 },
      ],
    },
    {
      name: 'Brand', slug: 'brand', icon: '🏢', sortOrder: 5,
      groups: [
        { name: 'Primary Logo', slug: 'primary-logo', icon: '🅰️', sortOrder: 1 },
        { name: 'Favicon', slug: 'favicon', icon: '🔖', sortOrder: 2 },
      ],
    },
    {
      name: 'System', slug: 'system', icon: '⚙️', sortOrder: 6,
      groups: [
        { name: 'Default Images', slug: 'default-images', icon: '🖼️', sortOrder: 1 },
        { name: 'Placeholders', slug: 'placeholders', icon: '⬜', sortOrder: 2 },
      ],
    },
  ];

  for (const familyData of families) {
    const family = await prisma.assetFamily.create({
      data: { name: familyData.name, slug: familyData.slug, sortOrder: familyData.sortOrder },
    });
    for (const groupData of familyData.groups) {
      await prisma.assetGroup.create({
        data: { name: groupData.name, familyId: family.id, sortOrder: groupData.sortOrder },
      });
    }
  }
  console.log('✅ Asset families & groups seeded');

  // ── Seed Sample Assets ──
  const productFamily = await prisma.assetFamily.findUnique({ where: { slug: 'product-assets' } });
  const productGroup = productFamily
    ? await prisma.assetGroup.findFirst({ where: { familyId: productFamily.id, name: 'Product Main Images' } })
    : null;

  const sampleAssets = [
    { title: 'TechPro Smartphone XL', originalName: 'smartphone-xl.jpg', category: 'image', subtype: 'product', mimeType: 'image/jpeg', extension: 'jpg', size: 245000, url: '/uploads/products/smartphone-placeholder.svg' },
    { title: 'FashionHub Summer Dress', originalName: 'summer-dress.jpg', category: 'image', subtype: 'product', mimeType: 'image/jpeg', extension: 'jpg', size: 189000, url: '/uploads/products/fashion-placeholder.svg' },
    { title: 'HomeStyle Kitchen Set', originalName: 'kitchen-set.jpg', category: 'image', subtype: 'product', mimeType: 'image/jpeg', extension: 'jpg', size: 312000, url: '/uploads/products/home-placeholder.svg' },
    { title: 'EcoGoods Bamboo Bundle', originalName: 'bamboo-bundle.jpg', category: 'image', subtype: 'product', mimeType: 'image/jpeg', extension: 'jpg', size: 156000, url: '/uploads/products/eco-placeholder.svg' },
    { title: 'SportMax Running Shoes', originalName: 'running-shoes.jpg', category: 'image', subtype: 'product', mimeType: 'image/jpeg', extension: 'jpg', size: 278000, url: '/uploads/products/sport-placeholder.svg' },
    { title: 'MarketPlace Hero Banner', originalName: 'hero-banner.jpg', description: 'Main hero banner for the homepage', category: 'image', subtype: 'banner', mimeType: 'image/jpeg', extension: 'jpg', size: 520000, url: '/uploads/products/banner-placeholder.svg', entityType: 'page', entityId: 'homepage' },
  ];

  for (const assetData of sampleAssets) {
    await prisma.asset.create({
      data: {
        filename: assetData.originalName,
        originalName: assetData.originalName,
        mimeType: assetData.mimeType,
        size: assetData.size,
        url: assetData.url,
        alt: assetData.title,
        description: assetData.description || null,
        groupId: productGroup?.id || null,
        entityType: (assetData as any).entityType || null,
        entityId: (assetData as any).entityId || null,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${sampleAssets.length} sample assets seeded`);

  // ── 12. BADGE TYPES & USER BADGES ──
  const badgeTypes = [
    {
      name: 'Top Seller', slug: 'top-seller', description: 'Awarded to sellers with the highest sales volume and positive ratings',
      icon: '🏆', color: '#f59e0b', category: 'seller',
      criteria: JSON.stringify({ minSales: 100, minRating: 4.5 }), sortOrder: 1,
    },
    {
      name: 'Verified Seller', slug: 'verified-seller', description: 'Sellers who have completed KYC verification',
      icon: '✅', color: '#10b981', category: 'seller',
      criteria: JSON.stringify({ kycVerified: true }), sortOrder: 2,
    },
    {
      name: 'Fast Shipper', slug: 'fast-shipper', description: 'Sellers who consistently ship orders within 24 hours',
      icon: '⚡', color: '#3b82f6', category: 'seller',
      criteria: JSON.stringify({ avgShipTime: 24 }), sortOrder: 3,
    },
    {
      name: 'Top Rated', slug: 'top-rated', description: 'Awarded to sellers with outstanding customer reviews',
      icon: '⭐', color: '#8b5cf6', category: 'seller',
      criteria: JSON.stringify({ minRating: 4.8, minReviews: 50 }), sortOrder: 4,
    },
    {
      name: 'Premium Delivery', slug: 'premium-delivery', description: 'Delivery personnel with excellent service ratings',
      icon: '🚚', color: '#ec4899', category: 'delivery',
      criteria: JSON.stringify({ minRating: 4.7, minDeliveries: 100 }), sortOrder: 5,
    },
    {
      name: 'Early Adopter', slug: 'early-adopter', description: 'Awarded to users who joined during the platform launch phase',
      icon: '🌅', color: '#06b6d4', category: 'customer',
      criteria: JSON.stringify({ joinedBefore: '2026-06-01' }), sortOrder: 6,
    },
    {
      name: 'Loyal Customer', slug: 'loyal-customer', description: 'Awarded to customers with 10+ completed orders',
      icon: '💎', color: '#14b8a6', category: 'customer',
      criteria: JSON.stringify({ minOrders: 10 }), sortOrder: 7,
    },
  ];

  const createdBadgeTypes = [];
  for (const bt of badgeTypes) {
    const created = await prisma.badgeType.create({ data: bt });
    createdBadgeTypes.push(created);
  }
  console.log(`✅ ${createdBadgeTypes.length} Badge types created`);

  // Assign some badges to seed users
  try {
    await prisma.userBadge.create({
      data: {
        userId: sellerUser.id,
        badgeTypeId: createdBadgeTypes[1].id, // Verified Seller
        awardedBy: adminUser.id,
        awardedAt: new Date(),
      },
    });

    await prisma.userBadge.create({
      data: {
        userId: customer1.id,
        badgeTypeId: createdBadgeTypes[5].id, // Early Adopter
        awardedBy: adminUser.id,
        awardedAt: new Date(),
      },
    });

    await prisma.userBadge.create({
      data: {
        userId: customer2.id,
        badgeTypeId: createdBadgeTypes[6].id, // Loyal Customer
        awardedAt: new Date(),
        reason: 'Applied for loyal customer badge',
      },
    });

    console.log('✅ 3 User badges seeded');
  } catch (error) {
    console.log('⚠️ Could not seed user badges:', (error as Error).message);
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  ✅ SEED COMPLETED SUCCESSFULLY');
  console.log('═══════════════════════════════════════');
  console.log(`  📧 ${adminEmail}  / configured ADMIN_PASSWORD`);
  console.log('  📧 juma@example.com       / Customer@123');
  console.log('  📧 amina@example.com      / Customer@123');
  console.log('  📧 seller@example.com     / Seller@123');
  console.log('  📧 driver1@example.com    / Driver@123');
  console.log('  📧 driver2@example.com    / Driver@123');
  console.log('═══════════════════════════════════════');
  console.log(`  📊 ${createdProducts.length} Products`);
  console.log('  📁 Deep category hierarchy with 3 levels');
  console.log('  🏢 5 Brands');
  console.log('  💰 Product variants with stock');
  console.log('  🚚 Seed orders: ORD-SEED-READY, ORD-SEED-PENDING-DELIVERY, ORD-SEED-IN-TRANSIT');
  console.log('═══════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
