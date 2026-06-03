import { z } from 'zod';

export const createLoyaltyTransactionSchema = z.object({
  orderId: z.string().uuid().optional(),
  points: z.number().min(1),
  transactionType: z.enum(['EARN', 'REDEEM', 'BONUS', 'REFUND']),
  description: z.string().max(500).optional(),
});

export const redeemLoyaltyPointsSchema = z.object({
  points: z.number().min(1),
  rewardId: z.string().uuid(),
});

export const loyaltyQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'EXPIRED', 'REDEEMED']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const createLoyaltyRewardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  pointsRequired: z.number().min(1),
  discountAmount: z.number().min(0.01).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  expiryDays: z.number().min(1).optional(),
  maxRedemptions: z.number().min(1).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateLoyaltyRewardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  pointsRequired: z.number().min(1).optional(),
  discountAmount: z.number().min(0.01).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export type CreateLoyaltyTransaction = z.infer<typeof createLoyaltyTransactionSchema>;
export type RedeemLoyaltyPoints = z.infer<typeof redeemLoyaltyPointsSchema>;
export type LoyaltyQuery = z.infer<typeof loyaltyQuerySchema>;
export type CreateLoyaltyReward = z.infer<typeof createLoyaltyRewardSchema>;
export type UpdateLoyaltyReward = z.infer<typeof updateLoyaltyRewardSchema>;
