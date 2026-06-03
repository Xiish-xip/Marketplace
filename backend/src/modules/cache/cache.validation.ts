import { z } from 'zod';

export const cacheKeySchema = z.object({
  key: z.string().min(1).max(500),
});

export const setCacheSchema = z.object({
  key: z.string().min(1).max(500),
  value: z.any(),
  ttl: z.number().min(1).max(86400).optional(), // max 24 hours
});

export const getCacheSchema = z.object({
  key: z.string().min(1).max(500),
});

export const deleteCacheSchema = z.object({
  key: z.string().min(1).max(500),
});

export const clearCacheSchema = z.object({
  pattern: z.string().min(1).max(500).optional(),
});

export const cacheStatsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  page: z.coerce.number().min(1).optional().default(1),
});

export type SetCache = z.infer<typeof setCacheSchema>;
export type GetCache = z.infer<typeof getCacheSchema>;
export type DeleteCache = z.infer<typeof deleteCacheSchema>;
export type ClearCache = z.infer<typeof clearCacheSchema>;
export type CacheStatsQuery = z.infer<typeof cacheStatsQuerySchema>;
