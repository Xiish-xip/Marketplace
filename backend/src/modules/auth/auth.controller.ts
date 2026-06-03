import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { asyncHandler } from '../../common/middleware';
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from './auth.validation';
import { AppError, ValidationError } from '../../common/errors';
import { DynamicConfigService } from '../dynamic-config/dynamic-config.service';

const authService = new AuthService();
const configService = new DynamicConfigService();

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const data = await authService.register(result.data);
  res.status(201).json({ success: true, message: 'Registration successful', data });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { email, phone, password } = result.data;
  const data = await authService.login(email || phone!, password);
  res.json({ success: true, message: 'Login successful', data });
});

export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { contact } = req.body;
  if (!contact) {
    throw new ValidationError({ contact: ['Contact (email or phone) is required'] });
  }

  const data = await authService.sendOtp(contact);
  res.json({ success: true, message: 'OTP sent', data });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = verifyOtpSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { email, phone, otp } = result.data;
  const data = await authService.verifyOtp(email || phone!, otp);
  res.json({ success: true, ...data });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const result = refreshTokenSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const data = await authService.refreshAccessToken(result.data.refreshToken);
  res.json({ success: true, data });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await authService.logout(refreshToken);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = forgotPasswordSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { email, phone } = result.data;
  const data = await authService.forgotPassword(email || phone!);
  res.json({ success: true, ...data });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = resetPasswordSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const contact = result.data.email || result.data.phone!;
  const data = await authService.resetPassword(contact, result.data.token, result.data.password);
  res.json({ success: true, ...data });
});

export const oauthRedirect = asyncHandler(async (req: Request, res: Response) => {
  const authConfig = await configService.getValue('marketplace.auth', {});
  const providers = Array.isArray(authConfig.oauthProviders) ? authConfig.oauthProviders : [];
  const provider = providers.find((item: any) => item.id === req.params.provider && item.enabled);

  if (!provider?.authUrl) {
    res.status(501).json({
      success: false,
      message: 'This login provider is not configured yet',
    });
    return;
  }

  res.redirect(provider.authUrl);
});

export const oauthCallback = asyncHandler(async (req: Request, res: Response) => {
  const authConfig = await configService.getValue('marketplace.auth', {});
  const providers = Array.isArray(authConfig.oauthProviders) ? authConfig.oauthProviders : [];
  const provider = providers.find((item: any) => item.id === req.params.provider && item.enabled);
  if (!provider) throw new AppError(404, 'OAuth provider is not configured');

  if (authConfig.localMockEnabled && provider.mode !== 'live') {
    const email = String(req.query.email || `${req.params.provider}.user@oauth.local`);
    const data = await authService.oauthLogin({
      provider: req.params.provider,
      providerUserId: String(req.query.sub || req.query.code || `mock-${Date.now()}`),
      email,
      firstName: String(req.query.firstName || provider.label || req.params.provider),
      lastName: String(req.query.lastName || 'OAuth'),
      avatar: typeof req.query.avatar === 'string' ? req.query.avatar : undefined,
    });
    res.json({ success: true, data, simulated: true });
    return;
  }

  if (!req.query.code) throw new AppError(400, 'OAuth authorization code is required');
  if (!provider.tokenUrl || !provider.userInfoUrl || !provider.clientId || !provider.clientSecret) {
    throw new AppError(422, 'Live OAuth requires tokenUrl, userInfoUrl, clientId, and clientSecret');
  }

  const tokenResponse = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(req.query.code),
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      redirect_uri: provider.redirectUri || `${req.protocol}://${req.get('host')}/api/auth/oauth/${req.params.provider}/callback`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!tokenResponse.ok) throw new AppError(502, `OAuth token exchange failed with HTTP ${tokenResponse.status}`);
  const tokenPayload: any = await tokenResponse.json();
  if (!tokenPayload.access_token) throw new AppError(502, 'OAuth provider did not return an access token');

  const userResponse = await fetch(provider.userInfoUrl, {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!userResponse.ok) throw new AppError(502, `OAuth user info failed with HTTP ${userResponse.status}`);
  const userInfo: any = await userResponse.json();
  const data = await authService.oauthLogin({
    provider: req.params.provider,
    providerUserId: String(userInfo.sub || userInfo.id),
    email: userInfo.email,
    firstName: userInfo.given_name || userInfo.first_name || userInfo.name?.split(' ')?.[0],
    lastName: userInfo.family_name || userInfo.last_name || userInfo.name?.split(' ')?.slice(1).join(' '),
    avatar: userInfo.picture || userInfo.avatar_url,
  });
  res.json({ success: true, data, simulated: false });
});
