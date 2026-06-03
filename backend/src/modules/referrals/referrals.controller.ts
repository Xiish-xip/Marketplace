import { Request, Response, NextFunction } from 'express';
import { referralsService } from './referrals.service';

export async function getUserReferrals(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as any;
    res.json({ success: true, data: await referralsService.getUserReferrals(user.userId) });
  } catch (e) {
    next(e);
  }
}

export async function getReferralProgram(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await referralsService.getReferralProgram() });
  } catch (e) {
    next(e);
  }
}

export async function getReferralStats(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as any;
    res.json({ success: true, data: await referralsService.getReferralStats(user.userId) });
  } catch (e) {
    next(e);
  }
}

export async function generateReferralCode(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as any;
    const code = await referralsService.generateReferralCode(user.userId);
    res.json({ success: true, data: { code } });
  } catch (e) {
    next(e);
  }
}
