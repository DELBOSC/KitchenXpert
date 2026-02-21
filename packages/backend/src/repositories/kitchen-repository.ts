/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Kitchen Repository
 *
 * Handles all kitchen-related database operations using Prisma ORM.
 */

import type { PrismaClient, Kitchen, KitchenConfiguration, KitchenItem, KitchenStyle, LayoutType } from '@prisma/client';
import crypto from 'crypto';

export interface KitchenWithRelations {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  style: string;
  layout: string;
  width: number;
  length: number;
  height: number;
  isGenerated: boolean;
  score: number | null;
  thumbnail: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  configuration?: KitchenConfiguration | null;
  items?: KitchenItem[];
}

export interface CreateKitchenDto {
  projectId: string;
  userId: string;
  name: string;
  style?: string;
  layout?: string;
  width: number;
  length: number;
  height?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateKitchenDto {
  name?: string;
  style?: string;
  layout?: string;
  width?: number;
  length?: number;
  height?: number;
  isGenerated?: boolean;
  score?: number;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

export interface KitchenFilters {
  userId?: string;
  projectId?: string;
  style?: string;
  layout?: string;
  isGenerated?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class KitchenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find a kitchen by ID
   */
  async findById(id: string, includeRelations = false): Promise<KitchenWithRelations | null> {
    const result = await this.prisma.kitchen.findUnique({
      where: { id, deletedAt: null },
      include: includeRelations ? {
        configuration: true,
        items: {
          include: { product: true, appliance: true },
          orderBy: { createdAt: 'asc' },
        },
        project: { select: { id: true, name: true, userId: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } }
      } : undefined
    });
    return result as unknown as KitchenWithRelations | null;
  }

  /**
   * Find all kitchens with optional filters and pagination
   */
  async findAll(
    filters: KitchenFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ data: Kitchen[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {
      deletedAt: null,
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.style && { style: filters.style }),
      ...(filters.layout && { layout: filters.layout }),
      ...(filters.isGenerated !== undefined && { isGenerated: filters.isGenerated }),
    };

    const [data, total] = await Promise.all([
      this.prisma.kitchen.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          configuration: true,
          _count: { select: { items: true } }
        }
      }),
      this.prisma.kitchen.count({ where })
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Find kitchens by user ID
   */
  async findByUserId(userId: string): Promise<Kitchen[]> {
    return this.prisma.kitchen.findMany({
      where: { userId, deletedAt: null },
      include: { configuration: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Find kitchens by project ID
   */
  async findByProjectId(projectId: string): Promise<Kitchen[]> {
    return this.prisma.kitchen.findMany({
      where: { projectId, deletedAt: null },
      include: { configuration: true, items: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Create a new kitchen
   */
  async create(data: CreateKitchenDto): Promise<Kitchen> {
    return this.prisma.kitchen.create({
      data: {
        projectId: data.projectId,
        userId: data.userId,
        name: data.name,
        style: (data.style || 'modern') as KitchenStyle,
        layout: (data.layout || 'l_shaped') as LayoutType,
        width: data.width,
        length: data.length,
        height: data.height || 2.5,
        metadata: data.metadata as any,
      },
      include: { configuration: true }
    });
  }

  /**
   * Update a kitchen
   */
  async update(id: string, data: UpdateKitchenDto): Promise<Kitchen> {
    const updateData: Record<string, any> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.style !== undefined) updateData.style = data.style;
    if (data.layout !== undefined) updateData.layout = data.layout;
    if (data.width !== undefined) updateData.width = data.width;
    if (data.length !== undefined) updateData.length = data.length;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.isGenerated !== undefined) updateData.isGenerated = data.isGenerated;
    if (data.score !== undefined) updateData.score = data.score;
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    return this.prisma.kitchen.update({
      where: { id },
      data: updateData,
      include: { configuration: true }
    });
  }

  /**
   * Soft delete a kitchen
   */
  async delete(id: string): Promise<Kitchen> {
    return this.prisma.kitchen.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Hard delete a kitchen (permanent)
   */
  async hardDelete(id: string): Promise<Kitchen> {
    return this.prisma.kitchen.delete({
      where: { id }
    });
  }

  /**
   * Count kitchens with optional filters
   */
  async count(filters: KitchenFilters = {}): Promise<number> {
    return this.prisma.kitchen.count({
      where: {
        deletedAt: null,
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.style && { style: filters.style as KitchenStyle }),
        ...(filters.isGenerated !== undefined && { isGenerated: filters.isGenerated }),
      }
    });
  }

  // ==================== CONFIGURATION ====================

  /**
   * Get or create kitchen configuration
   */
  async getConfiguration(kitchenId: string): Promise<KitchenConfiguration | null> {
    return this.prisma.kitchenConfiguration.findUnique({
      where: { kitchenId }
    });
  }

  /**
   * Update or create kitchen configuration
   */
  async upsertConfiguration(
    kitchenId: string,
    data: Record<string, any>
  ): Promise<KitchenConfiguration> {
    return this.prisma.kitchenConfiguration.upsert({
      where: { kitchenId },
      create: {
        kitchenId,
        ...data
      },
      update: data
    });
  }

  // ==================== KITCHEN ITEMS ====================

  /**
   * Get all items in a kitchen
   */
  async getItems(kitchenId: string): Promise<KitchenItem[]> {
    return this.prisma.kitchenItem.findMany({
      where: { kitchenId },
      include: { product: true, appliance: true },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Add an item to a kitchen
   */
  async addItem(kitchenId: string, item: Record<string, any>): Promise<KitchenItem> {
    return this.prisma.kitchenItem.create({
      data: {
        kitchenId,
        ...item
      } as any
    });
  }

  /**
   * Find a specific item within a kitchen
   */
  async findItemInKitchen(kitchenId: string, itemId: string): Promise<KitchenItem | null> {
    return this.prisma.kitchenItem.findFirst({
      where: { id: itemId, kitchenId }
    });
  }

  /**
   * Update a kitchen item
   */
  async updateItem(itemId: string, data: Record<string, any>): Promise<KitchenItem> {
    return this.prisma.kitchenItem.update({
      where: { id: itemId },
      data
    });
  }

  /**
   * Remove an item from a kitchen
   */
  async removeItem(itemId: string): Promise<KitchenItem> {
    return this.prisma.kitchenItem.delete({
      where: { id: itemId }
    });
  }

  /**
   * Remove all items from a kitchen
   */
  async clearItems(kitchenId: string): Promise<{ count: number }> {
    return this.prisma.kitchenItem.deleteMany({
      where: { kitchenId }
    });
  }

  // ==================== STATISTICS ====================

  /**
   * Get kitchen statistics for a user.
   * Uses groupBy to derive both total and generated counts from a single
   * query instead of two separate count() calls.
   */
  async getUserStats(userId: string): Promise<{
    totalKitchens: number;
    generatedKitchens: number;
    averageScore: number | null;
    styleBreakdown: Record<string, number>;
  }> {
    const [generatedStats, avgScore, styleStats] = await Promise.all([
      this.prisma.kitchen.groupBy({
        by: ['isGenerated'],
        where: { userId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.kitchen.aggregate({
        where: { userId, deletedAt: null, score: { not: null } },
        _avg: { score: true }
      }),
      this.prisma.kitchen.groupBy({
        by: ['style'],
        where: { userId, deletedAt: null },
        _count: { style: true }
      })
    ]);

    let totalKitchens = 0;
    let generatedKitchens = 0;
    for (const stat of generatedStats) {
      totalKitchens += stat._count._all;
      if (stat.isGenerated) {
        generatedKitchens = stat._count._all;
      }
    }

    const styleBreakdown: Record<string, number> = {};
    (styleStats as any[]).forEach((stat: any) => {
      styleBreakdown[stat.style] = stat._count.style;
    });

    return {
      totalKitchens,
      generatedKitchens,
      averageScore: avgScore._avg.score,
      styleBreakdown
    };
  }

  /**
   * Duplicate a kitchen
   */
  async duplicate(kitchenId: string, newName?: string): Promise<Kitchen> {
    const original = await this.findById(kitchenId, true);
    if (!original) {
      throw new Error('Kitchen not found');
    }

    return this.prisma.$transaction(async (tx: any) => {
      // Create new kitchen
      const newKitchen = await tx.kitchen.create({
        data: {
          projectId: original.projectId,
          userId: original.userId,
          name: newName || `${original.name} (Copy)`,
          style: original.style,
          layout: original.layout,
          width: original.width,
          length: original.length,
          height: original.height,
          metadata: original.metadata,
        }
      });

      // Copy configuration if exists
      if (original.configuration) {
        const { id: _id, kitchenId: _kitchenId, createdAt: _createdAt, updatedAt: _updatedAt, ...configData } = original.configuration;
        await tx.kitchenConfiguration.create({
          data: {
            kitchenId: newKitchen.id,
            ...configData
          }
        });
      }

      // Copy items if exist
      if (original.items && original.items.length > 0) {
        await tx.kitchenItem.createMany({
          data: original.items.map((item: any) => ({
            kitchenId: newKitchen.id,
            productId: item.productId,
            applianceId: item.applianceId,
            type: item.type,
            name: item.name,
            brand: item.brand,
            model: item.model,
            positionX: item.positionX,
            positionY: item.positionY,
            positionZ: item.positionZ,
            rotationY: item.rotationY,
            width: item.width,
            depth: item.depth,
            height: item.height,
            price: item.price,
            metadata: item.metadata,
          }))
        });
      }

      return newKitchen;
    });
  }

  // ==================== ARCHIVE / RESTORE ====================

  /**
   * Archive a kitchen (soft archive - different from delete)
   */
  async archive(id: string): Promise<Kitchen> {
    // Only select metadata field instead of loading the full kitchen with findById
    const existing = await this.prisma.kitchen.findUnique({
      where: { id, deletedAt: null },
      select: { metadata: true },
    });
    if (!existing) {
      throw new Error('Kitchen not found');
    }
    const existingMetadata = (existing.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata))
      ? existing.metadata as Record<string, any>
      : {};
    return this.prisma.kitchen.update({
      where: { id },
      data: {
        metadata: {
          ...existingMetadata,
          archivedAt: new Date().toISOString(),
          isArchived: true,
        }
      }
    });
  }

  /**
   * Restore an archived kitchen
   */
  async restore(id: string): Promise<Kitchen> {
    // Only select the fields needed for the restore logic
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { id },
      select: { deletedAt: true, metadata: true },
    });
    if (!kitchen) {
      throw new Error('Kitchen not found');
    }

    // Restore from soft delete
    if (kitchen.deletedAt) {
      return this.prisma.kitchen.update({
        where: { id },
        data: { deletedAt: null }
      });
    }

    // Restore from archive
    const metadata = (kitchen.metadata as Record<string, any>) || {};
    delete metadata.archivedAt;
    delete metadata.isArchived;

    return this.prisma.kitchen.update({
      where: { id },
      data: { metadata }
    });
  }

  /**
   * Find archived kitchens for a user
   */
  async findArchived(userId: string): Promise<Kitchen[]> {
    return this.prisma.kitchen.findMany({
      where: {
        userId,
        deletedAt: null,
        metadata: {
          path: ['isArchived'],
          equals: true,
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ==================== 3D MODEL ====================

  /**
   * Get 3D model data for a kitchen.
   * Uses findById with relations to load kitchen, items, and configuration
   * in a single query instead of 3 separate queries.
   */
  async getModel(kitchenId: string): Promise<{
    kitchen: Kitchen;
    items: KitchenItem[];
    configuration: KitchenConfiguration | null;
    modelData: Record<string, any>;
  }> {
    const kitchen = await this.findById(kitchenId, true);
    if (!kitchen) {
      throw new Error('Kitchen not found');
    }

    const items = kitchen.items || [];
    const configuration = kitchen.configuration || null;

    // Generate 3D model metadata
    const modelData = {
      dimensions: {
        width: kitchen.width,
        length: kitchen.length,
        height: kitchen.height,
      },
      layout: kitchen.layout,
      style: kitchen.style,
      itemsCount: items.length,
      generatedAt: new Date().toISOString(),
      version: '1.0',
    };

    return { kitchen: kitchen as unknown as Kitchen, items: items as unknown as KitchenItem[], configuration, modelData };
  }

  /**
   * Update 3D model thumbnail
   */
  async updateModelThumbnail(kitchenId: string, thumbnailUrl: string): Promise<Kitchen> {
    return this.update(kitchenId, { thumbnail: thumbnailUrl });
  }

  // ==================== EXPORT ====================

  /**
   * Export kitchen data in various formats.
   * Uses findById with relations to load all data in a single query
   * instead of 3 separate queries.
   */
  async exportData(kitchenId: string, format: 'json' | 'pdf' | 'csv' = 'json'): Promise<{
    data: Record<string, any>;
    format: string;
    filename: string;
  }> {
    const kitchen = await this.findById(kitchenId, true);
    if (!kitchen) {
      throw new Error('Kitchen not found');
    }

    const items = kitchen.items || [];
    const configuration = kitchen.configuration || null;

    const exportData = {
      kitchen: {
        id: kitchen.id,
        name: kitchen.name,
        style: kitchen.style,
        layout: kitchen.layout,
        dimensions: {
          width: kitchen.width,
          length: kitchen.length,
          height: kitchen.height,
        },
        createdAt: kitchen.createdAt,
        updatedAt: kitchen.updatedAt,
      },
      configuration,
      items: items.map((item: any) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        brand: item.brand,
        model: item.model,
        position: {
          x: item.positionX,
          y: item.positionY,
          z: item.positionZ,
        },
        dimensions: {
          width: item.width,
          depth: item.depth,
          height: item.height,
        },
        price: item.price,
      })),
      summary: {
        totalItems: items.length,
        totalPrice: items.reduce((sum: number, item: any) => sum + (item.price || 0), 0),
        exportedAt: new Date().toISOString(),
      },
    };

    const sanitizedName = kitchen.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `kitchen_${sanitizedName}_${Date.now()}.${format}`;

    return {
      data: exportData,
      format,
      filename,
    };
  }

  // ==================== SHARING ====================

  /**
   * Create a share link for a kitchen
   */
  async createShareLink(kitchenId: string, options: {
    expiresIn?: number; // hours
    allowEdit?: boolean;
    password?: string;
  } = {}): Promise<{
    shareId: string;
    shareUrl: string;
    expiresAt: Date | null;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const kitchen = await tx.kitchen.findFirst({
        where: { id: kitchenId, deletedAt: null },
      });
      if (!kitchen) {
        throw new Error('Kitchen not found');
      }

      // Generate cryptographically secure share ID
      const shareId = `share_${crypto.randomBytes(24).toString('base64url')}`;

      // Calculate expiration
      const expiresAt = options.expiresIn
        ? new Date(Date.now() + options.expiresIn * 60 * 60 * 1000)
        : null;

      // Hash password if provided
      let hashedPassword: string | null = null;
      if (options.password) {
        const bcrypt = await import('bcrypt');
        hashedPassword = await bcrypt.hash(options.password, 12);
      }

      // Store share info in metadata
      const shareInfo = {
        shareId,
        allowEdit: options.allowEdit || false,
        password: hashedPassword,
        expiresAt: expiresAt?.toISOString() || null,
        createdAt: new Date().toISOString(),
      };

      const metadata = (kitchen.metadata as Record<string, any>) || {};
      metadata.shares = metadata.shares || [];
      metadata.shares.push(shareInfo);

      await tx.kitchen.update({
        where: { id: kitchenId },
        data: { metadata },
      });

      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      const shareUrl = `${baseUrl}/shared/kitchen/${shareId}`;

      return { shareId, shareUrl, expiresAt };
    });
  }

  /**
   * Get kitchen by share ID
   */
  async findByShareId(shareId: string): Promise<Kitchen | null> {
    const kitchens = await this.prisma.kitchen.findMany({
      where: {
        deletedAt: null,
        metadata: {
          path: ['shares'],
          array_contains: [{ shareId }],
        },
      },
    });

    const kitchen = kitchens[0];
    if (!kitchen) {
      return null;
    }

    const metadata = kitchen.metadata as Record<string, any>;
    const share = metadata?.shares?.find((s: any) => s.shareId === shareId);

    if (!share) {
      return null;
    }

    // Check expiration
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return null; // Link expired
    }

    return kitchen;
  }

  /**
   * Revoke a share link
   */
  async revokeShareLink(kitchenId: string, shareId: string): Promise<void> {
    // Only select metadata instead of loading the full kitchen
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { id: kitchenId, deletedAt: null },
      select: { metadata: true },
    });
    if (!kitchen) {
      throw new Error('Kitchen not found');
    }

    const metadata = (kitchen.metadata as Record<string, any>) || {};
    if (metadata.shares) {
      metadata.shares = metadata.shares.filter((s: any) => s.shareId !== shareId);
    }

    await this.prisma.kitchen.update({
      where: { id: kitchenId },
      data: { metadata },
    });
  }
}

export default KitchenRepository;
