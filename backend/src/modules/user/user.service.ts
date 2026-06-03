import { prisma } from '../../common/prisma';
import { NotFoundError, BadRequestError } from '../../common/errors';

export class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
        preferences: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    const { passwordHash, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    avatar?: string;
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.gender && { gender: data.gender }),
        ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
        ...(data.avatar && { avatar: data.avatar }),
      },
      include: {
        addresses: true,
        preferences: true,
      },
    });

    const { passwordHash, ...profile } = user;
    return profile;
  }

  // ── Addresses ──
  async getAddresses(userId: string) {
    return prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, data: {
    label?: string;
    phone?: string;
    street: string;
    city: string;
    state?: string;
    zipCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }) {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.userAddress.create({
      data: {
        ...data,
        userId,
        country: data.country || 'TZ',
      },
    });
  }

  async updateAddress(userId: string, addressId: string, data: {
    label?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }) {
    const address = await prisma.userAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundError('Address');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return prisma.userAddress.update({
      where: { id: addressId },
      data,
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await prisma.userAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundError('Address');
    }

    await prisma.userAddress.delete({ where: { id: addressId } });
  }

  // ── Preferences ──
  async getPreferences(userId: string) {
    let prefs = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await prisma.userPreference.create({
        data: { userId },
      });
    }

    return prefs;
  }

  async updatePreferences(userId: string, data: {
    language?: string;
    currency?: string;
    smsEnabled?: boolean;
    emailEnabled?: boolean;
    pushEnabled?: boolean;
  }) {
    return prisma.userPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  // ── Public Profile ──
  async getPublicProfile(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
            storeSlug: true,
            storeLogo: true,
            storeBanner: true,
            storeDescription: true,
            storeLocation: true,
            isVerified: true,
            rating: true,
            totalOrders: true,
            createdAt: true,
            _count: { select: { products: true } },
          },
        },
        _count: { select: { followers: true, following: true } },
      },
    });

    if (!user) throw new NotFoundError('User');

    const { passwordHash, ...profile } = user;
    return profile;
  }

  // ── Follow System ──
  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) throw new BadRequestError('Cannot follow yourself');

    const targetUser = await prisma.user.findUnique({ where: { id: followingId } });
    if (!targetUser) throw new NotFoundError('User');

    const existing = await prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) return existing;

    return prisma.userFollow.create({
      data: { followerId, followingId },
    });
  }

  async unfollowUser(followerId: string, followingId: string) {
    const existing = await prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (!existing) throw new NotFoundError('Follow relation');

    await prisma.userFollow.delete({ where: { id: existing.id } });
    return { message: 'Unfollowed successfully' };
  }

  async getFollowers(userId: string) {
    return prisma.userFollow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: { id: true, firstName: true, lastName: true, avatar: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFollowing(userId: string) {
    return prisma.userFollow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: { id: true, firstName: true, lastName: true, avatar: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
