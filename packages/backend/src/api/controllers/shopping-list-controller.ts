import { Request, Response } from 'express';
import { prisma } from '../../database/client';
import { asyncHandler } from '../middleware/error-middleware';

// ─── Types ────────────────────────────────────────────────────

interface ShoppingListItem {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
  brand?: string;
}

// ─── Category mapping ─────────────────────────────────────────

const TYPE_CATEGORY_MAP: Record<string, string> = {
  cabinet: 'Cabinets',
  base_cabinet: 'Cabinets',
  wall_cabinet: 'Cabinets',
  tall_cabinet: 'Cabinets',
  corner_cabinet: 'Cabinets',
  countertop: 'Countertops',
  worktop: 'Countertops',
  appliance: 'Appliances',
  oven: 'Appliances',
  dishwasher: 'Appliances',
  fridge: 'Appliances',
  refrigerator: 'Appliances',
  cooktop: 'Appliances',
  hood: 'Appliances',
  microwave: 'Appliances',
  sink: 'Accessories',
  faucet: 'Accessories',
  handle: 'Accessories',
  hardware: 'Accessories',
  lighting: 'Accessories',
  accessory: 'Accessories',
};

function getCategoryForType(type: string): string {
  const normalized = type.toLowerCase().replace(/[\s-]+/g, '_');
  return TYPE_CATEGORY_MAP[normalized] || 'Accessories';
}

// ─── Controller ───────────────────────────────────────────────

class ShoppingListController {
  /**
   * GET /shopping-list/:kitchenId
   * Generate shopping list from kitchen items
   */
  getByKitchenId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { kitchenId } = req.params;
    const userId = req.user?.userId;

    // Load the kitchen to verify ownership
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
      select: { id: true, userId: true, name: true },
    });

    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    // Verify ownership (owner or admin)
    if (kitchen.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Load kitchen items with products and appliances
    const kitchenItems = await prisma.kitchenItem.findMany({
      where: { kitchenId },
      include: {
        product: true,
        appliance: true,
      },
    });

    // Group items by name+type to compute quantities
    const itemMap = new Map<string, ShoppingListItem>();

    for (const item of kitchenItems) {
      // Determine price
      let unitPrice = 0;
      let sku: string | undefined;
      let brand: string | undefined;
      let itemName = item.name;

      if (item.product) {
        unitPrice = Number(item.product.price) || 0;
        sku = item.product.sku;
        brand = item.product.brand || undefined;
        itemName = item.product.name || item.name;
      } else if (item.appliance) {
        unitPrice = Number(item.appliance.price) || 0;
        brand = item.appliance.brand || undefined;
        itemName = item.appliance.name || item.name;
      } else if (item.price) {
        unitPrice = Number(item.price) || 0;
      }

      brand = brand || item.brand || undefined;
      const category = getCategoryForType(item.type);

      // Create a grouping key based on name and type
      const groupKey = `${itemName}::${item.type}::${unitPrice}`;

      const existing = itemMap.get(groupKey);
      if (existing) {
        existing.quantity += 1;
        existing.totalPrice = existing.quantity * existing.unitPrice;
      } else {
        itemMap.set(groupKey, {
          name: itemName,
          category,
          quantity: 1,
          unitPrice,
          totalPrice: unitPrice,
          sku,
          brand,
        });
      }
    }

    const items = Array.from(itemMap.values());

    // Compute totals
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = 0.2; // TVA 20%
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    res.json({
      success: true,
      data: {
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        tax,
        total,
      },
    });
  });
}

export const shoppingListController = new ShoppingListController();
