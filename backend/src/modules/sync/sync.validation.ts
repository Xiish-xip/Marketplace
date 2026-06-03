import { z } from 'zod';

export const startSyncSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  syncType: z.enum(['INVENTORY', 'PRICES', 'ORDERS', 'CUSTOMERS', 'FULL']),
  filters: z.record(z.any()).optional(),
});

export const syncStatusQuerySchema = z.object({
  syncId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const syncConfigSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  syncType: z.enum(['INVENTORY', 'PRICES', 'ORDERS', 'CUSTOMERS', 'FULL']),
  scheduleEnabled: z.boolean().optional().default(false),
  scheduleFrequency: z.enum(['HOURLY', 'DAILY', 'WEEKLY']).optional(),
  fieldMappings: z.record(z.string()).optional(),
  transformRules: z.array(z.record(z.any())).optional(),
});

export type StartSync = z.infer<typeof startSyncSchema>;
export type SyncStatusQuery = z.infer<typeof syncStatusQuerySchema>;
export type SyncConfig = z.infer<typeof syncConfigSchema>;
