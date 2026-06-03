import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional().default('DAILY'),
  groupBy: z.enum(['PRODUCT', 'CATEGORY', 'SELLER', 'PAYMENT_METHOD']).optional(),
  limit: z.coerce.number().min(1).max(1000).optional().default(100),
});

export const customReportSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  metrics: z.array(z.string().min(1)).min(1),
  filters: z.record(z.any()).optional(),
  groupBy: z.array(z.string()).optional(),
  isScheduled: z.boolean().optional().default(false),
  scheduleFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
});

export const updateCustomReportSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  metrics: z.array(z.string().min(1)).optional(),
  filters: z.record(z.any()).optional(),
  isScheduled: z.boolean().optional(),
  scheduleFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type CustomReport = z.infer<typeof customReportSchema>;
export type UpdateCustomReport = z.infer<typeof updateCustomReportSchema>;
