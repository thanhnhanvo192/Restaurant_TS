import { Router } from "express";
import {
  getTableInfo,
  openSession,
  closeSession,
} from "../controllers/tableSession.controller";
import { verifyStaffToken, requireRole } from "../middlewares/auth.middleware";

const router = Router();

/**
 * GET /api/tables/:tableId/session
 * Get table info with current open session
 * Access: PUBLIC
 */
router.get("/tables/:tableId/session", getTableInfo);

/**
 * POST /api/tables/:tableId/session
 * Open a new session when customer scans QR
 * Body: { reservationId? }
 * Access: PUBLIC
 */
router.post("/tables/:tableId/session", openSession);

/**
 * PATCH /api/sessions/:id/close
 * Close a session and change table status to 'cleaning'
 * Access: receptionist only
 */
router.patch(
  "/sessions/:id/close",
  verifyStaffToken,
  requireRole(["receptionist"]),
  closeSession,
);

export default router;
