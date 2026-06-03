import { z } from 'zod';

export const createDropshipOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().min(1).max(10000),
  supplier: z.enum(['CJ_DROPSHIPPING', 'ALIBABA', 'TEMU']),
  shippingAddress: z.string().min(1).max(500),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(1).max(20),
});

export const updateDropshipOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  trackingNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const dropshipQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  supplier: z.enum(['CJ_DROPSHIPPING', 'ALIBABA', 'TEMU']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const syncInventorySchema = z.object({
  supplierProductId: z.string().min(1).max(100),
  quantity: z.number().min(0),
});

export type CreateDropshipOrder = z.infer<typeof createDropshipOrderSchema>;
export type UpdateDropshipOrder = z.infer<typeof updateDropshipOrderSchema>;
export type DropshipQuery = z.infer<typeof dropshipQuerySchema>;
export type SyncInventory = z.infer<typeof syncInventorySchema>;
