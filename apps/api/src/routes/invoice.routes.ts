import { Router, Request, Response, NextFunction } from "express";
import {
  createInvoice,
  getInvoice,
  getSessionInvoice,
  payByCash,
} from "../controllers/invoice.controller";
import { verifyStaffToken } from "../middlewares/auth.middleware";

const router = Router();

// ============ Middleware ============

/**
 * Middleware verify receptionist or manager role
 */
function verifyReceptionistOrManager(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user || (req.user.role !== "receptionist" && req.user.role !== "manager")) {
    res.status(403).json({
      success: false,
      error: "This action requires receptionist or manager role",
      code: "FORBIDDEN_ROLE",
    });
    return;
  }
  next();
}

// ============ Routes ============

/**
 * POST /api/invoices
 * Create invoice từ served orders của session
 * Receptionist or Manager
 * Body: { sessionId, discount_pct?: number }
 */
router.post("/", verifyStaffToken, verifyReceptionistOrManager, createInvoice);

/**
 * GET /api/invoices/sessions/:sessionId/invoice
 * Get invoice for a table session
 * Staff only (receptionist, manager)
 * Must be before /:id route to avoid conflict
 */
router.get("/sessions/:sessionId/invoice", verifyStaffToken, getSessionInvoice);

/**
 * POST /api/invoices/:id/pay/cash
 * Process cash payment for invoice
 * Receptionist or Manager
 * - Creates payment record
 * - Marks invoice as paid
 * - Closes table session
 * - Updates table status to cleaning
 * - Emits 'invoice-paid' event
 */
router.post("/:id/pay/cash", verifyStaffToken, verifyReceptionistOrManager, payByCash);

/**
 * GET /api/invoices/:id
 * Get invoice details
 * Staff only (receptionist, manager)
 * Must be after more specific routes
 */
router.get("/:id", verifyStaffToken, getInvoice);

export default router;
