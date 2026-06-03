import { z } from 'zod';

export const searchProductsQuerySchema = z.object({
  q: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  sortBy: z.enum(['relevance', 'newest', 'price_asc', 'price_desc', 'rating', 'sales']).optional().default('relevance'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  filters: z.string().optional(),
});

export const createSynonymSchema = z.object({
  term: z.string().min(1).max(100),
  synonyms: z.array(z.string().min(1).max(100)).min(1),
});

export const updateSynonymSchema = z.object({
  term: z.string().min(1).max(100).optional(),
  synonyms: z.array(z.string().min(1).max(100)).min(1).optional(),
});

export const createStopWordSchema = z.object({
  word: z.string().min(1).max(50),
  language: z.string().length(2).optional().default('en'),
});

export const createFilterTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  categoryId: z.string().uuid(),
  filters: z.record(z.any()),
});

export const updateFilterTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  filters: z.record(z.any()).optional(),
});

export type SearchProductsQuery = z.infer<typeof searchProductsQuerySchema>;
export type CreateSynonym = z.infer<typeof createSynonymSchema>;
export type UpdateSynonym = z.infer<typeof updateSynonymSchema>;
export type CreateStopWord = z.infer<typeof createStopWordSchema>;
export type CreateFilterTemplate = z.infer<typeof createFilterTemplateSchema>;
export type UpdateFilterTemplate = z.infer<typeof updateFilterTemplateSchema>;
