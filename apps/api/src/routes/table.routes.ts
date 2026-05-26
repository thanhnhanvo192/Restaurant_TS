import { Router } from "express";
import {
  getTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  generateQR,
} from "../controllers/table.controller";
import { verifyStaffToken, requireRole } from "../middlewares/auth.middleware";

const router = Router();

/**
 * GET /api/tables
 * Get all tables with current status
 * Access: all staff (manager, receptionist, warehouse)
 */
router.get("/", verifyStaffToken, getTables);

/**
 * GET /api/tables/:id
 * Get table by ID
 * Access: all staff
 */
router.get("/:id", verifyStaffToken, getTableById);

/**
 * POST /api/tables
 * Create a new table
 * Body: { tableNumber, capacity, location?, notes? }
 * Access: manager only
 */
router.post("/", verifyStaffToken, requireRole(["manager"]), createTable);

/**
 * PATCH /api/tables/:id
 * Update table
 * Body: { tableNumber?, capacity?, location?, notes?, status? }
 * Access: manager only
 */
router.patch("/:id", verifyStaffToken, requireRole(["manager"]), updateTable);

/**
 * DELETE /api/tables/:id
 * Soft delete table
 * Access: manager only
 */
router.delete("/:id", verifyStaffToken, requireRole(["manager"]), deleteTable);

/**
 * POST /api/tables/:id/generate-qr
 * Generate QR code for table
 * Response: { success: true, data: { qrCodeUrl: "data:image/png;base64,..." } }
 * Access: manager only
 */
router.post(
  "/:id/generate-qr",
  verifyStaffToken,
  requireRole(["manager"]),
  generateQR,
);

export default router;
