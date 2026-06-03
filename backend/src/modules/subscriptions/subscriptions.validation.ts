import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  autoRenew: z.boolean().optional().default(true),
  paymentMethodId: z.string().uuid().optional(),
});

export const updateSubscriptionSchema = z.object({
  autoRenew: z.boolean().optional(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).optional(),
});

export const subscriptionQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).optional(),
  planId: z.string().uuid().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const createSubscriptionPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  price: z.number().min(0.01),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  features: z.array(z.string()).optional(),
  maxUsers: z.number().min(1).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateSubscriptionPlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(1000).optional(),
  price: z.number().min(0.01).optional(),
  features: z.array(z.string()).optional(),
  maxUsers: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type CreateSubscription = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscription = z.infer<typeof updateSubscriptionSchema>;
export type SubscriptionQuery = z.infer<typeof subscriptionQuerySchema>;
export type CreateSubscriptionPlan = z.infer<typeof createSubscriptionPlanSchema>;
export type UpdateSubscriptionPlan = z.infer<typeof updateSubscriptionPlanSchema>;
