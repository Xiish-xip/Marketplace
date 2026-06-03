import { z } from 'zod';

export const createTranslationSchema = z.object({
  namespace: z.string().min(1).max(100),
  language: z.string().length(2),
  translations: z.record(z.string()),
});

export const updateTranslationSchema = z.object({
  translations: z.record(z.string()),
  mergeMode: z.enum(['REPLACE', 'MERGE']).optional().default('REPLACE'),
});

export const translationQuerySchema = z.object({
  language: z.string().length(2).optional(),
  namespace: z.string().min(1).max(100).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const addLanguageSchema = z.object({
  language: z.string().length(2),
  name: z.string().min(1).max(100),
  isRTL: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const updateLanguageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isRTL: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CreateTranslation = z.infer<typeof createTranslationSchema>;
export type UpdateTranslation = z.infer<typeof updateTranslationSchema>;
export type TranslationQuery = z.infer<typeof translationQuerySchema>;
export type AddLanguage = z.infer<typeof addLanguageSchema>;
export type UpdateLanguage = z.infer<typeof updateLanguageSchema>;
