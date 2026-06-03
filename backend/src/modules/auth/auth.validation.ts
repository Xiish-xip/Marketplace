import { z } from 'zod';

// Password strength: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z.object({
  email: z.string().email('Invalid email').optional(),
  phone: z.string().min(7, 'Phone must be at least 7 digits').optional(),
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfBirth: z.string().datetime().optional(),
}).refine(data => data.email || data.phone, {
  message: 'Email or phone is required',
});

export const resetPasswordSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
}).refine(data => data.email || data.phone, {
  message: 'Email or phone is required',
});

export const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine(data => data.email || data.phone, {
  message: 'Email or phone is required',
});

export const verifyOtpSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
}).refine(data => data.email || data.phone, {
  message: 'Email or phone is required',
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().uuid('Invalid refresh token'),
});
