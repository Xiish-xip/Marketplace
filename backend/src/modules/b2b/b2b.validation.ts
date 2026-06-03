import { z } from 'zod';

export const createB2bBuyerSchema = z.object({
  companyName: z.string().min(1).max(200),
  taxId: z.string().min(1).max(50),
  registrationNumber: z.string().min(1).max(50),
  businessType: z.enum(['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'RESELLER']),
  contactPerson: z.string().min(1).max(100),
  businessAddress: z.string().min(1).max(500),
  operatingCountries: z.array(z.string().length(2)).optional(),
  creditLimit: z.number().min(0).optional(),
  paymentTerms: z.enum(['NET_30', 'NET_60', 'NET_90', 'COD']).optional(),
});

export const updateB2bBuyerSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  creditLimit: z.number().min(0).optional(),
  paymentTerms: z.enum(['NET_30', 'NET_60', 'NET_90', 'COD']).optional(),
  isActive: z.boolean().optional(),
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
});

export const b2bQuoteSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
  quantities: z.array(z.number().min(1)).min(1),
  requiredBy: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export const b2bQuerySchema = z.object({
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
  businessType: z.enum(['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'RESELLER']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export type CreateB2bBuyer = z.infer<typeof createB2bBuyerSchema>;
export type UpdateB2bBuyer = z.infer<typeof updateB2bBuyerSchema>;
export type B2bQuote = z.infer<typeof b2bQuoteSchema>;
export type B2bQuery = z.infer<typeof b2bQuerySchema>;
