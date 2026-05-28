import { Router, Request, Response, NextFunction } from "express";
import {
  createOrder,
  getSessionOrders,
  confirmOrder,
  completeOrder,
  cancelOrder,
} from "../controllers/order.controller";
import {
  verifyStaffToken,
  verifyCustomerToken,
} from "../middlewares/auth.middleware";

const router = Router();

// ============ Middleware ============

/**
 * Middleware verify receptionist role (for confirm/complete/cancel)
 */
function verifyReceptionist(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user || req.user.role !== "receptionist") {
    res.status(403).json({
      success: false,
      error: "This action requires receptionist role",
      code: "FORBIDDEN_ROLE",
    });
    return;
  }
  next();
}

// ============ Routes ============

/**
 * POST /api/orders
 * Create new order (PUBLIC - customer at table)
 * Body: { sessionId, items: [{ menuItemId, quantity, note }], note? }
 */
router.post("/", createOrder);

/**
 * GET /api/orders/:sessionId
 * Get all orders for a table session (staff + customer auth)
 * Can verify with either staff or customer token
 */
router.get(
  "/:sessionId",
  (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      // No auth provided - allow public access
      return next();
    }
    // Try to verify token (either staff or customer)
    const isStaffToken = true; // Try staff first
    if (isStaffToken) {
      verifyStaffToken(req, res, () => {
        // If staff verification fails, try customer
        if (!req.user) {
          verifyCustomerToken(req, res, next);
        } else {
          next();
        }
      });
    } else {
      verifyCustomerToken(req, res, next);
    }
  },
  getSessionOrders,
);

/**
 * PATCH /api/orders/:id/confirm
 * Confirm order (receptionist only)
 * Staff must be authenticated as receptionist
 */
router.patch(
  "/:id/confirm",
  verifyStaffToken,
  verifyReceptionist,
  confirmOrder,
);

/**
 * PATCH /api/orders/:id/complete
 * Mark order as served (receptionist only)
 * Called when kitchen finishes cooking
 */
router.patch(
  "/:id/complete",
  verifyStaffToken,
  verifyReceptionist,
  completeOrder,
);

/**
 * PATCH /api/orders/:id/cancel
 * Cancel order (receptionist only)
 */
router.patch("/:id/cancel", verifyStaffToken, verifyReceptionist, cancelOrder);

export default router;
