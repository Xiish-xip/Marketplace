import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'BOGO', 'FREE_SHIPPING']),
  discountValue: z.number().min(0),
  maxRedemptions: z.number().min(1).optional(),
  applicableProducts: z.array(z.string().uuid()).optional(),
  applicableCategories: z.array(z.string().uuid()).optional(),
  minPurchaseAmount: z.number().min(0).optional(),
  maxPurchaseAmount: z.number().min(0).optional(),
  conditions: z.record(z.any()).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'BOGO', 'FREE_SHIPPING']).optional(),
  discountValue: z.number().min(0).optional(),
  maxRedemptions: z.number().min(1).optional(),
  applicableProducts: z.array(z.string().uuid()).optional(),
  applicableCategories: z.array(z.string().uuid()).optional(),
  conditions: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export const campaignQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'SCHEDULED', 'EXPIRED', 'CANCELLED']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export type CreateCampaign = z.infer<typeof createCampaignSchema>;
export type UpdateCampaign = z.infer<typeof updateCampaignSchema>;
export type CampaignQuery = z.infer<typeof campaignQuerySchema>;
