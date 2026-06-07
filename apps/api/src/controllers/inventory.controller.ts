import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

// ============ Zod Schemas ============

const createItemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(150),
  unit: z.string().min(1, "Unit is required").max(30),
  item_type: z.enum(["ingredient", "product"], {
    errorMap: () => ({
      message: "item_type must be 'ingredient' or 'product'",
    }),
  }),
  min_qty: z
    .number()
    .nonnegative("min_qty must be >= 0")
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(val), "min_qty must be a valid number"),
  notes: z.string().optional(),
});

const updateItemSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  unit: z.string().min(1).max(30).optional(),
  item_type: z.enum(["ingredient", "product"]).optional(),
  min_qty: z
    .number()
    .nonnegative()
    .or(z.string().transform((val) => parseFloat(val)))
    .optional(),
  notes: z.string().optional(),
});

const addStockSchema = z.object({
  quantity: z
    .number()
    .positive("quantity must be > 0")
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => val > 0, "quantity must be > 0"),
  supplier: z.string().max(150).optional(),
  unit_cost: z
    .number()
    .nonnegative()
    .or(z.string().transform((val) => parseFloat(val)))
    .optional(),
  note: z.string().optional(),
});

const adjustStockSchema = z.object({
  new_qty: z
    .number()
    .nonnegative("new_qty must be >= 0")
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => val >= 0, "new_qty must be >= 0"),
  note: z.string().optional(),
});

const removeStockSchema = z.object({
  quantity: z
    .number()
    .positive("quantity must be > 0")
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => val > 0, "quantity must be > 0"),
  note: z.string().optional(),
});

const getTransactionsSchema = z.object({
  item_id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, "item_id must be a positive number")
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ============ Helper Functions ============

/**
 * Check if user is warehouse or manager
 */
function hasWarehouseAccess(role?: string): boolean {
  return role === "warehouse" || role === "manager";
}

/**
 * Check if user is manager
 */
function isManager(role?: string): boolean {
  return role === "manager";
}

// ============ Inventory Items ============

/**
 * GET /api/inventory
 * Get all inventory items, optionally filtered by type
 * warehouse/manager only
 */
export async function getItems(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!hasWarehouseAccess(req.user?.role)) {
      res.status(403).json({
        success: false,
        error: "Access denied. Warehouse or manager role required.",
        code: "FORBIDDEN",
      });
      return;
    }

    const { type } = req.query;
    let whereClause: any = { isActive: true };

    if (type && (type === "ingredient" || type === "product")) {
      whereClause.itemType = type;
    }

    const items = await prisma.inventoryItem.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/inventory/low-stock
 * Get items with current_qty <= min_qty
 * warehouse/manager only
 */
export async function getLowStockItems(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!hasWarehouseAccess(req.user?.role)) {
      res.status(403).json({
        success: false,
        error: "Access denied. Warehouse or manager role required.",
        code: "FORBIDDEN",
      });
      return;
    }

    const allItems = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    const lowStockItems = allItems.filter((item) => {
      const current =
        typeof item.currentQty === "number"
          ? item.currentQty
          : Number(item.currentQty);
      const min =
        typeof item.minQty === "number" ? item.minQty : Number(item.minQty);
      return current <= min;
    });

    res.json({
      success: true,
      data: lowStockItems,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/inventory
 * Create new inventory item
 * warehouse/manager only
 */
export async function createItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!hasWarehouseAccess(req.user?.role)) {
      res.status(403).json({
        success: false,
        error: "Access denied. Warehouse or manager role required.",
        code: "FORBIDDEN",
      });
      return;
    }

    const body = createItemSchema.parse(req.body);

    const item = await prisma.inventoryItem.create({
      data: {
        name: body.name,
        unit: body.unit,
        itemType: body.item_type,
        minQty: new Decimal(body.min_qty),
        currentQty: new Decimal(0),
        notes: body.notes || null,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0].message,
        code: "VALIDATION_ERROR",
      });
      return;
    }
    next(error);
  }
}

/**
 * PATCH /api/inventory/:id
 * Update inventory item
 * warehouse/manager only
 */
export async function updateItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!hasWarehouseAccess(req.user?.role)) {
      res.status(403).json({
        success: false,
        error: "Access denied. Warehouse or manager role required.",
        code: "FORBIDDEN",
      });
      return;
    }

    const { id } = req.params;
    const itemId = parseInt(id, 10);

    if (!itemId || itemId <= 0) {
      res.status(400).json({
        success: false,
        error: "Invalid item ID",
        code: "INVALID_ID",
      });
      return;
    }

    // Check item exists
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      res.status(404).json({
        success: false,
        error: "Inventory item not found",
        code: "NOT_FOUND",
      });
      return;
    }

    const body = updateItemSchema.parse(req.body);

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.unit) updateData.unit = body.unit;
    if (body.item_type) updateData.itemType = body.item_type;
    if (body.min_qty !== undefined)
      updateData.minQty = new Decimal(body.min_qty);
    if (body.notes !== undefined) updateData.notes = body.notes || null;

    const updated = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: updateData,
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0].message,
        code: "VALIDATION_ERROR",
      });
      return;
    }
    next(error);
  }
}

// ============ Stock Transactions ============

/**
 * POST /api/inventory/:id/add-stock
 * Add stock to inventory with transaction
 * warehouse/manager only
 */
export async function addStock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!hasWarehouseAccess(req.user?.role)) {
      res.status(403).json({
        success: false,
        error: "Access denied. Warehouse or manager role required.",
        code: "FORBIDDEN",
      });
      return;
    }

    const { id } = req.params;
    const itemId = parseInt(id, 10);

    if (!itemId || itemId <= 0) {
      res.status(400).json({
        success: false,
        error: "Invalid item ID",
        code: "INVALID_ID",
      });
      return;
    }

    const body = addStockSchema.parse(req.body);

    // Get current item
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      res.status(404).json({
        success: false,
        error: "Inventory item not found",
        code: "NOT_FOUND",
      });
      return;
    }

    const qtyBefore = item.currentQty;
    const quantityToAdd = new Decimal(body.quantity);
    const qtyAfter = qtyBefore.add(quantityToAdd);

    // Use Prisma transaction to ensure consistency
    const result = await prisma.$transaction(async (tx: any) => {
      // Update inventory item
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentQty: qtyAfter,
        },
      });

      // Create transaction record
      const txRecord = await tx.inventoryTransaction.create({
        data: {
          itemId: itemId,
          type: "in",
          quantity: quantityToAdd,
          qtyBefore: qtyBefore,
          qtyAfter: qtyAfter,
          supplier: body.supplier || null,
          unitCost: body.unit_cost ? new Decimal(body.unit_cost) : null,
          note: body.note || null,
          createdById: req.user!.id,
        },
      });

      return { item: updatedItem, transaction: txRecord };
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0].message,
        code: "VALIDATION_ERROR",
      });
      return;
    }
    next(error);
  }
}

/**
 * POST /api/inventory/:id/remove-stock
 * Remove stock from inventory with transaction
 * warehouse/manager only
 */
export async function removeStock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!hasWarehouseAccess(req.user?.role)) {
      res.status(403).json({
        success: false,
        error: "Access denied. Warehouse or manager role required.",
        code: "FORBIDDEN",
      });
      return;
    }

    const { id } = req.params;
    const itemId = parseInt(id, 10);

    if (!itemId || itemId <= 0) {
      res.status(400).json({
        success: false,
        error: "Invalid item ID",
        code: "INVALID_ID",
      });
      return;
    }

    const body = removeStockSchema.parse(req.body);

    // Get current item
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      res.status(404).json({
        success: false,
        error: "Inventory item not found",
        code: "NOT_FOUND",
      });
      return;
    }

    const qtyBefore = item.currentQty;
    const quantityToRemove = new Decimal(body.quantity);

    if (qtyBefore.lessThan(quantityToRemove)) {
      res.status(400).json({
        success: false,
        error: "Số lượng tồn kho không đủ để xuất.",
        code: "INSUFFICIENT_STOCK",
      });
      return;
    }

    const qtyAfter = qtyBefore.sub(quantityToRemove);

    // Use Prisma transaction to ensure consistency
    const result = await prisma.$transaction(async (tx: any) => {
      // Update inventory item
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentQty: qtyAfter,
        },
      });

      // Create transaction record
      const txRecord = await tx.inventoryTransaction.create({
        data: {
          itemId: itemId,
          type: "out",
          quantity: quantityToRemove,
          qtyBefore: qtyBefore,
          qtyAfter: qtyAfter,
          supplier: null,
          unitCost: null,
          note: body.note || null,
          createdById: req.user!.id,
        },
      });

      return { item: updatedItem, transaction: txRecord };
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0].message,
        code: "VALIDATION_ERROR",
      });
      return;
    }
    next(error);
  }
}

/**
 * POST /api/inventory/:id/adjust
 * Adjust stock to exact quantity (manager only)
 * Uses Prisma transaction
 */
export async function adjustStock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!isManager(req.user?.role)) {
      res.status(403).json({
        success: false,
        error: "Access denied. Manager role required.",
        code: "FORBIDDEN",
      });
      return;
    }

    const { id } = req.params;
    const itemId = parseInt(id, 10);

    if (!itemId || itemId <= 0) {
      res.status(400).json({
        success: false,
        error: "Invalid item ID",
        code: "INVALID_ID",
      });
      return;
    }

    const body = adjustStockSchema.parse(req.body);

    // Get current item
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      res.status(404).json({
        success: false,
        error: "Inventory item not found",
        code: "NOT_FOUND",
      });
      return;
    }

    const qtyBefore = item.currentQty;
    const newQty = new Decimal(body.new_qty);

    // Use Prisma transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Update inventory item
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentQty: newQty,
        },
      });

      // Create adjustment transaction record
      const txRecord = await tx.inventoryTransaction.create({
        data: {
          itemId: itemId,
          type: "adjustment",
          quantity: newQty.sub(qtyBefore), // Difference
          qtyBefore: qtyBefore,
          qtyAfter: newQty,
          note: body.note || null,
          createdById: req.user!.id,
        },
      });

      return { item: updatedItem, transaction: txRecord };
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0].message,
        code: "VALIDATION_ERROR",
      });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/inventory/transactions
 * Get inventory transactions
 * Optional filters: item_id, from, to
 * warehouse/manager only
 */
export async function getTransactions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!hasWarehouseAccess(req.user?.role)) {
      res.status(403).json({
        success: false,
        error: "Access denied. Warehouse or manager role required.",
        code: "FORBIDDEN",
      });
      return;
    }

    const queryParams = getTransactionsSchema.parse(req.query);

    const whereClause: any = {};

    if (queryParams.item_id) {
      whereClause.itemId = queryParams.item_id;
    }

    if (queryParams.from || queryParams.to) {
      whereClause.createdAt = {};
      if (queryParams.from) {
        whereClause.createdAt.gte = new Date(queryParams.from);
      }
      if (queryParams.to) {
        whereClause.createdAt.lte = new Date(queryParams.to);
      }
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where: whereClause,
      include: {
        item: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0].message,
        code: "VALIDATION_ERROR",
      });
      return;
    }
    next(error);
  }
}
