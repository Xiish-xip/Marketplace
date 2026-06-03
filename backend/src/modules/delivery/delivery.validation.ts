import { z } from 'zod';

export const registerDeliveryPersonSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Invalid phone number'),
  email: z.string().email('Invalid email address').optional(),
  licenseNumber: z.string().min(1, 'License number is required').max(50),
  licenseExpiry: z.string().datetime().optional(),
  vehicleType: z.enum(['MOTORCYCLE', 'CAR', 'VAN', 'TRUCK']),
  licensePlate: z.string().min(1, 'License plate is required').max(20),
});

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
});

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export const createDeliverySchema = z.object({
  shippingAddress: z.string().min(1, 'Shipping address is required'),
  notes: z.string().max(500).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
});

export const updateDeliveryPersonSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/).optional(),
  licenseExpiry: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export type RegisterDeliveryPerson = z.infer<typeof registerDeliveryPersonSchema>;
export type UpdateLocation = z.infer<typeof updateLocationSchema>;
export type UpdateAvailability = z.infer<typeof updateAvailabilitySchema>;
export type CreateDelivery = z.infer<typeof createDeliverySchema>;
export type UpdateDeliveryPerson = z.infer<typeof updateDeliveryPersonSchema>;
