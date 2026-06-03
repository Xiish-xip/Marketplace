import { z } from 'zod';

// ── Auth ──
export const loginSchema = z.object({
  email: z.string().email('Invalid email').optional(),
  phone: z.string().min(5, 'Phone too short').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine(data => data.email || data.phone, { message: 'Email or phone required' });

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().min(7, 'Phone too short').optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.email || data.phone, { message: 'Email or phone required' })
  .refine(data => data.password === data.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

// ── User ──
export const userProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

// ── Address ──
export const addressSchema = z.object({
  label: z.string().optional(),
  phone: z.string().optional(),
  street: z.string().min(1, 'Street required'),
  city: z.string().min(1, 'City required'),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().default('TZ'),
  isDefault: z.boolean().optional(),
});

// ── Product ──
export const productSchema = z.object({
  title: z.string().min(1, 'Title required').max(255),
  slug: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.number().positive('Price must be positive'),
  discountPrice: z.number().positive('Discount price must be positive').optional(),
  categoryId: z.string().min(1, 'Category required'),
  brandId: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  weight: z.number().positive().optional(),
  stock: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  tags: z.string().optional(),
  metadata: z.string().optional(),
});

// ── Category ──
export const categorySchema = z.object({
  name: z.string().min(1, 'Name required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  image: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

// ── Brand ──
export const brandSchema = z.object({
  name: z.string().min(1, 'Name required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

// ── Order ──
export const orderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'AWAITING_CONFIRMATION']),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
});

// ── Coupon ──
export const couponSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters').toUpperCase(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
  value: z.number().positive('Value must be positive'),
  minOrderAmount: z.number().min(0).optional(),
  maxUses: z.number().int().min(0).optional(),
  maxUsesPerUser: z.number().int().min(0).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().default(true),
});

// ── Subscription Plan ──
export const subscriptionPlanSchema = z.object({
  name: z.string().min(1, 'Name required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be >= 0'),
  interval: z.enum(['MONTHLY', 'YEARLY', 'WEEKLY', 'DAILY']),
  trialDays: z.number().int().min(0).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  benefits: z.array(z.object({ title: z.string(), description: z.string().optional() })).optional(),
});

// ── Loyalty ──
export const loyaltyProgramSchema = z.object({
  name: z.string().min(1),
  pointsPerCurrency: z.number().positive().optional(),
  currencyPerPoint: z.number().positive().optional(),
  minPointsForRedeem: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

export const loyaltyTierSchema = z.object({
  name: z.string().min(1),
  minPoints: z.number().int().min(0),
  multiplier: z.number().positive(),
  color: z.string().optional(),
  sortOrder: z.number().int().optional(),
  benefits: z.string().optional(),
});

export const rewardSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  pointsRequired: z.number().int().positive(),
  type: z.enum(['DISCOUNT', 'FREE_PRODUCT', 'FREE_SHIPPING', 'GIFT_CARD']),
  value: z.number().positive(),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
});

// ── B2B ──
export const businessAccountSchema = z.object({
  companyName: z.string().min(1, 'Company name required'),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
  paymentTerms: z.string().optional(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().default(true),
});

// ── Dropship ──
export const dropshipSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name required'),
  provider: z.string().min(1),
  storeUrl: z.string().url().optional().or(z.literal('')),
  apiEndpoint: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  minProfitMargin: z.number().min(0).optional(),
  currency: z.string().optional(),
  isActive: z.boolean().default(true),
});

// ── Shipping ──
export const shippingZoneSchema = z.object({
  name: z.string().min(1),
  countries: z.string().optional(),
  regions: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const shippingRateSchema = z.object({
  name: z.string().min(1),
  carrierId: z.string().optional(),
  zoneId: z.string().optional(),
  baseRate: z.number().min(0),
  ratePerKg: z.number().min(0).optional(),
  freeShippingAbove: z.number().min(0).optional(),
  estimatedDaysMin: z.number().int().optional(),
  estimatedDaysMax: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

// ── Announcement ──
export const announcementSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(['INFO', 'WARNING', 'SUCCESS', 'DANGER']).default('INFO'),
  placement: z.string().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().default(true),
});

// ── Blog ──
export const blogPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  content: z.string().optional(),
  excerpt: z.string().optional(),
  coverImage: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  isPublished: z.boolean().default(false),
  publishedAt: z.string().optional(),
});

// ── Page Builder ──
export const pageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  layout: z.string().optional(),
  sections: z.string().optional(),
  metadata: z.string().optional(),
  isPublished: z.boolean().default(false),
  isHomepage: z.boolean().optional(),
});

// ── Role ──
export const roleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.string().optional(),
});

// ── Support Ticket ──
export const ticketSchema = z.object({
  subject: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  category: z.string().optional(),
});

// ── Review Moderation ──
export const reviewModerationSchema = z.object({
  isApproved: z.boolean(),
  moderationNote: z.string().optional(),
});

// ── Sync Job ──
export const syncJobSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  providerType: z.string().optional(),
  connectionId: z.string().optional(),
  schedule: z.string().optional(),
  config: z.string().optional(),
});

// ── Cache Config ──
export const cacheConfigSchema = z.object({
  key: z.string().min(1),
  provider: z.string().default('redis'),
  ttl: z.number().int().positive().default(3600),
  maxSize: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

// ── Rate Limit ──
export const rateLimitSchema = z.object({
  name: z.string().min(1),
  keyPattern: z.string().min(1),
  points: z.number().int().positive().default(100),
  duration: z.number().int().positive().default(60),
  blockDuration: z.number().int().default(300),
  isActive: z.boolean().default(true),
});

// ── Search Config ──
export const searchSynonymSchema = z.object({
  terms: z.string().min(1),
  language: z.string().default('en'),
  isActive: z.boolean().default(true),
});

export const searchStopWordSchema = z.object({
  word: z.string().min(1),
  language: z.string().default('en'),
});

// ── Webhook ──
export const webhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url('Must be a valid URL'),
  events: z.string().min(1, 'At least one event required'),
  isActive: z.boolean().default(true),
});

// ── API Key ──
export const apiKeySchema = z.object({
  name: z.string().min(1),
  permissions: z.string().optional(),
  expiresAt: z.string().optional(),
});

// ── Seller ──
export const sellerProfileSchema = z.object({
  storeName: z.string().min(1, 'Store name required'),
  storeDescription: z.string().optional(),
  storeLogo: z.string().optional(),
  storeBanner: z.string().optional(),
  storeLocation: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
});

// ── General Config ──
export const configSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  description: z.string().optional(),
  type: z.string().optional(),
});

// ── AI Provider ──
export const aiProviderSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  models: z.string().optional(),
  isActive: z.boolean().default(true),
});

// ── Delivery ──
export const deliverySchema = z.object({
  pickupAddress: z.string().min(1),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffAddress: z.string().min(1),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  scheduledPickup: z.string().optional(),
  notes: z.string().optional(),
});

// ── Currency ──
export const currencyRateSchema = z.object({
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  rate: z.number().positive(),
  isActive: z.boolean().default(true),
});

// ── Return ──
export const returnRequestSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(1, 'Reason required'),
  items: z.string().optional(),
  description: z.string().optional(),
});

// ── Promotion ──
export const campaignSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['DISCOUNT', 'BUY_X_GET_Y', 'FREE_SHIPPING', 'BUNDLE']),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  discountValue: z.number().positive().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  isActive: z.boolean().default(true),
});

// ── Pagination helper ──
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});