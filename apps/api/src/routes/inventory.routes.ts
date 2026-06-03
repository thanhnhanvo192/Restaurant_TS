import { Router } from "express";
import { verifyStaffToken, requireRole } from "../middlewares/auth.middleware";
import * as inventoryController from "../controllers/inventory.controller";

const router = Router();

// ============ Inventory Items Routes ============

/**
 * GET /api/inventory
 * Get all inventory items (optional filter by type: ingredient | product)
 * warehouse/manager only
 */
router.get(
  "/",
  verifyStaffToken,
  requireRole(["warehouse", "manager"]),
  inventoryController.getItems,
);

/**
 * GET /api/inventory/low-stock
 * Get items with low stock (current_qty <= min_qty)
 * warehouse/manager only
 */
router.get(
  "/low-stock",
  verifyStaffToken,
  requireRole(["warehouse", "manager"]),
  inventoryController.getLowStockItems,
);

/**
 * POST /api/inventory
 * Create new inventory item
 * warehouse/manager only
 */
router.post(
  "/",
  verifyStaffToken,
  requireRole(["warehouse", "manager"]),
  inventoryController.createItem,
);

/**
 * PATCH /api/inventory/:id
 * Update inventory item details
 * warehouse/manager only
 */
router.patch(
  "/:id",
  verifyStaffToken,
  requireRole(["warehouse", "manager"]),
  inventoryController.updateItem,
);

/**
 * POST /api/inventory/:id/add-stock
 * Add stock to inventory (creates transaction record)
 * warehouse/manager only
 */
router.post(
  "/:id/add-stock",
  verifyStaffToken,
  requireRole(["warehouse", "manager"]),
  inventoryController.addStock,
);

/**
 * POST /api/inventory/:id/adjust
 * Adjust stock to exact quantity (manager only)
 * Creates adjustment transaction record
 */
router.post(
  "/:id/adjust",
  verifyStaffToken,
  requireRole(["manager"]),
  inventoryController.adjustStock,
);

/**
 * GET /api/inventory/transactions
 * Get inventory transactions
 * Optional query params: item_id, from (datetime), to (datetime)
 * warehouse/manager only
 */
router.get(
  "/transactions",
  verifyStaffToken,
  requireRole(["warehouse", "manager"]),
  inventoryController.getTransactions,
);

export default router;
