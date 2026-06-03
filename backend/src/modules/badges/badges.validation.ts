import { z } from 'zod';

export const createBadgeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  icon: z.string().url().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  badgeType: z.enum(['VERIFIED_SELLER', 'TOP_RATED', 'FAST_SHIPPER', 'RELIABLE', 'CUSTOM']),
  criteriaType: z.enum(['MANUAL', 'AUTOMATIC']).optional().default('MANUAL'),
  criteria: z.record(z.any()).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateBadgeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().url().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  criteria: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export const assignBadgeSchema = z.object({
  sellerId: z.string().uuid(),
  badgeId: z.string().uuid(),
  expiryDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const badgeQuerySchema = z.object({
  badgeType: z.enum(['VERIFIED_SELLER', 'TOP_RATED', 'FAST_SHIPPER', 'RELIABLE', 'CUSTOM']).optional(),
  isActive: z.boolean().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export type CreateBadge = z.infer<typeof createBadgeSchema>;
export type UpdateBadge = z.infer<typeof updateBadgeSchema>;
export type AssignBadge = z.infer<typeof assignBadgeSchema>;
export type BadgeQuery = z.infer<typeof badgeQuerySchema>;
