/**
 * Export Service
 * Provides CSV and JSON data exports for admin users.
 * Uses the Prisma singleton to query data.
 */

import { prisma } from '../database/client';

export type ExportFormat = 'csv' | 'json';
export type ExportEntity = 'users' | 'orders' | 'projects' | 'kitchens' | 'products';

export class ExportService {
  /**
   * Export data for a given entity and format.
   * Returns the serialized data string along with the filename and content type.
   */
  static async exportData(
    entity: ExportEntity,
    format: ExportFormat,
    filters?: Record<string, unknown>
  ): Promise<{ data: string; filename: string; contentType: string }> {
    const records = await ExportService.fetchData(entity, filters);
    const dateSuffix = new Date().toISOString().split('T')[0];
    const filename = `${entity}_export_${dateSuffix}`;

    if (format === 'csv') {
      return {
        data: ExportService.toCSV(records),
        filename: `${filename}.csv`,
        contentType: 'text/csv; charset=utf-8',
      };
    }

    return {
      data: JSON.stringify(records, null, 2),
      filename: `${filename}.json`,
      contentType: 'application/json',
    };
  }

  /**
   * Fetch records from the database based on entity type.
   */
  private static async fetchData(
    entity: ExportEntity,
    filters?: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    const where = filters || {};

    switch (entity) {
      case 'users':
        return ExportService.fetchUsers(where);
      case 'orders':
        return ExportService.fetchOrders(where);
      case 'projects':
        return ExportService.fetchProjects(where);
      case 'kitchens':
        return ExportService.fetchKitchens(where);
      case 'products':
        return ExportService.fetchProducts(where);
      default:
        return [];
    }
  }

  private static async fetchUsers(
    where: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    const users = await prisma.user.findMany({
      where: where as any,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { projects: true, orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      projectCount: u._count?.projects ?? 0,
      orderCount: u._count?.orders ?? 0,
    }));
  }

  private static async fetchOrders(
    where: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    const orders = await prisma.order.findMany({
      where: where as any,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      userEmail: o.user?.email,
      userName: `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim(),
      status: o.status,
      subtotal: o.subtotal,
      tax: o.tax,
      shipping: o.shipping,
      discount: o.discount,
      total: o.total,
      currency: o.currency,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));
  }

  private static async fetchProjects(
    where: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    const projects = await prisma.project.findMany({
      where: where as any,
      include: {
        user: { select: { email: true } },
        _count: { select: { kitchens: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      userEmail: p.user?.email,
      status: p.status,
      budget: p.budget,
      currency: p.currency,
      kitchenCount: p._count?.kitchens ?? 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  private static async fetchKitchens(
    where: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    const kitchens = await prisma.kitchen.findMany({
      where: {
        ...(where as any),
        deletedAt: null,
      },
      include: {
        user: { select: { email: true } },
        project: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return kitchens.map((k) => ({
      id: k.id,
      name: k.name,
      projectName: k.project?.name,
      userEmail: k.user?.email,
      style: k.style,
      layout: k.layout,
      width: k.width,
      length: k.length,
      height: k.height,
      isGenerated: k.isGenerated,
      score: k.score,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    }));
  }

  private static async fetchProducts(
    where: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    const products = await prisma.product.findMany({
      where: {
        ...(where as any),
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        brand: true,
        price: true,
        currency: true,
        isActive: true,
        availability: true,
        providerId: true,
        categoryId: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      brand: p.brand,
      price: p.price,
      currency: p.currency,
      isActive: p.isActive,
      availability: p.availability,
      providerId: p.providerId,
      categoryId: p.categoryId,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Convert an array of records to CSV format.
   * Includes a UTF-8 BOM for Excel compatibility.
   */
  private static toCSV(records: Record<string, unknown>[]): string {
    if (records.length === 0) {
      return '';
    }

    const firstRecord = records[0];
    if (!firstRecord) {
      return '';
    }

    const headers = Object.keys(firstRecord);
    const rows = records.map((record) =>
      headers
        .map((header) => {
          const value = record[header];
          if (value === null || value === undefined) {
            return '';
          }
          const str = String(value);
          // Escape quotes and wrap in quotes if contains comma, newline, or quote
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    );

    // Add BOM for Excel UTF-8 compatibility
    return `\ufeff${[headers.join(','), ...rows].join('\n')}`;
  }
}
