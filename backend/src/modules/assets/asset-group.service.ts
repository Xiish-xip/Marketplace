import { prisma } from '../../common/prisma';
import { AssetGroup, AssetFamily } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../common/errors';

export class AssetGroupService {
  /**
   * Create a new asset family
   */
  async createFamily(data: Prisma.AssetFamilyCreateInput): Promise<AssetFamily> {
    // Check if family with same slug already exists
    const existing = await prisma.assetFamily.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new BadRequestError(`Asset family with slug '${data.slug}' already exists`);
    }

    return prisma.assetFamily.create({ data });
  }

  /**
   * Create a new asset group under a family
   */
  async createGroup(familyId: string, data: any): Promise<AssetGroup> {
    // Check if family exists
    const family = await prisma.assetFamily.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundError('Asset family');
    }

    // Check if group with same slug already exists in this family
    const existing = await prisma.assetGroup.findFirst({
      where: { familyId, name: data.name },
    });
    if (existing) {
      throw new BadRequestError(`Asset group with name '${data.name}' already exists in this family`);
    }

    const { parentId, ...groupData } = data;
    return prisma.assetGroup.create({
      data: {
        ...groupData,
        family: { connect: { id: familyId } },
      },
    });
  }

  /**
   * Get the full family tree (families -> groups -> subgroups)
   */
  async getFamilyTree(): Promise<AssetFamily[]> {
    return prisma.assetFamily.findMany({
      include: {
        groups: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get all groups (flat list)
   */
  async getAllGroups(familyId?: string): Promise<AssetGroup[]> {
    return prisma.assetGroup.findMany({
      where: familyId ? { familyId } : {},
      include: {
        family: true,
      },
      orderBy: [{ family: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
  }

  /**
   * Update a group
   */
  async updateGroup(id: string, data: any): Promise<AssetGroup> {
    // Check if group exists
    const existing = await prisma.assetGroup.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Asset group');
    }

    return prisma.assetGroup.update({
      where: { id },
      data,
      include: {
        family: true,
      },
    });
  }

  /**
   * Delete a group (reassign assets to parent)
   */
  async deleteGroup(id: string): Promise<AssetGroup> {
    // Check if group exists
    const existing = await prisma.assetGroup.findUnique({
      where: { id },
      include: { assets: true },
    });
    if (!existing) {
      throw new NotFoundError('Asset group');
    }

    // If group has assets, reassign them to null (AssetGroup has no parentId in schema)
    if (existing.assets.length > 0) {
      await prisma.asset.updateMany({
        where: { groupId: id },
        data: { groupId: null },
      });
    }

    // Delete the group
    return prisma.assetGroup.delete({ where: { id } });
  }

  /**
   * Get assets in a group
   */
  async getAssetsInGroup(groupId: string, params: { skip?: number; take?: number } = {}): Promise<{ assets: any[]; total: number }> {
    const { skip = 0, take = 20 } = params;
    
    const [assets, total] = await prisma.$transaction([
      prisma.asset.findMany({
        where: { groupId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.asset.count({ where: { groupId } }),
    ]);

    return { assets, total };
  }
}
