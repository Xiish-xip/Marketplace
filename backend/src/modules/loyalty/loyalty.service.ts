import { prisma } from '../../common/prisma';

export class LoyaltyService {
  // Use the existing LoyaltyTransaction and Referral models from the database

  async getTransactions(userId?: string) {
    const where: any = {};
    if (userId) where.userId = userId;
    return prisma.loyaltyTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createTransaction(data: { userId: string; points: number; type: string; reference?: string }) {
    return prisma.loyaltyTransaction.create({
      data: {
        userId: data.userId,
        points: data.points,
        type: data.type,
        reference: data.reference,
      },
    });
  }

  async getUserPoints(userId: string) {
    const earned = await prisma.loyaltyTransaction.aggregate({
      where: { userId, type: 'EARNED' },
      _sum: { points: true },
    });
    const redeemed = await prisma.loyaltyTransaction.aggregate({
      where: { userId, type: 'REDEEMED' },
      _sum: { points: true },
    });
    return {
      earnedPoints: earned._sum.points || 0,
      redeemedPoints: redeemed._sum.points || 0,
      balance: (earned._sum.points || 0) - (redeemed._sum.points || 0),
    };
  }

  // Referrals
  async getReferrals(referrerId?: string) {
    const where: any = {};
    if (referrerId) where.referrerId = referrerId;
    return prisma.referral.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReferral(data: { referrerId: string; refereeEmail?: string; refereePhone?: string }) {
    return prisma.referral.create({
      data: {
        referrerId: data.referrerId,
        refereeEmail: data.refereeEmail,
        refereePhone: data.refereePhone,
        status: 'PENDING',
        rewardPoints: 0,
      },
    });
  }

  async completeReferral(id: string) {
    return prisma.referral.update({
      where: { id },
      data: { status: 'REWARDED', joinedAt: new Date() },
    });
  }

  async getStats() {
    const [totalPoints, totalReferrals, totalUsers] = await Promise.all([
      prisma.loyaltyTransaction.aggregate({ _sum: { points: true } }),
      prisma.referral.count(),
      prisma.loyaltyTransaction.groupBy({ by: ['userId'] }),
    ]);
    return {
      totalPoints: totalPoints._sum.points || 0,
      totalReferrals,
      activeUsers: totalUsers.length,
    };
  }
}

export const loyaltyService = new LoyaltyService();