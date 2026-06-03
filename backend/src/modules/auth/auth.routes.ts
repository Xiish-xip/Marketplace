import { Router } from 'express';
import {
  register,
  login,
  sendOtp,
  verifyOtp,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  oauthRedirect,
  oauthCallback,
} from './auth.controller';
import { authLoginLimiter } from '../../common/rate-limiter';
import { validateBody } from '../../common/validation-middleware';
import { z } from 'zod';
import { loginSchema, registerSchema, verifyOtpSchema, forgotPasswordSchema, resetPasswordSchema, refreshTokenSchema } from './auth.validation';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', authLoginLimiter, validateBody(loginSchema), login);
router.post('/send-otp', validateBody(z.object({ contact: z.string().min(1) })), sendOtp);
router.post('/verify-otp', validateBody(verifyOtpSchema), verifyOtp);
router.post('/refresh-token', validateBody(refreshTokenSchema), refreshToken);
router.post('/logout', logout);
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);
router.get('/oauth/:provider', oauthRedirect);
router.get('/oauth/:provider/callback', oauthCallback);

export default router;
