import { Router, Request, Response, NextFunction } from "express";
import {
  getRevenueSummary,
  getRevenueChart,
  getTopItems,
} from "../controllers/stats.controller";
import { verifyStaffToken } from "../middlewares/auth.middleware";

const router = Router();

// ============ Middleware ============

/**
 * Middleware verify manager role
 */
function verifyManager(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "manager") {
    res.status(403).json({
      success: false,
      error: "This action requires manager role",
      code: "FORBIDDEN_ROLE",
    });
    return;
  }
  next();
}

// ============ Routes ============

/**
 * GET /api/stats/revenue?period=today
 * Get revenue summary for a specific period (today, week, month)
 * Query params: period = 'today' | 'week' | 'month' (default: today)
 * Manager only
 * Response: { total_revenue, total_orders, total_tables_served }
 */
router.get("/revenue", verifyStaffToken, verifyManager, getRevenueSummary);

/**
 * GET /api/stats/revenue-chart?days=30
 * Get revenue chart data for last N days
 * Query params: days = number (default: 30, min: 1)
 * Manager only
 * Response: [{ date, revenue, order_count }, ...]
 * Note: Dates with no revenue will show revenue = 0
 */
router.get("/revenue-chart", verifyStaffToken, verifyManager, getRevenueChart);

/**
 * GET /api/stats/top-items?limit=10&from=2026-05-01&to=2026-06-01
 * Get top items by quantity and revenue
 * Query params:
 *   - limit = number (default: 10, min: 1)
 *   - from = YYYY-MM-DD (optional, start date for date range filter)
 *   - to = YYYY-MM-DD (optional, end date for date range filter)
 * Manager only
 * Response: [{ menu_item_id, name, category, total_quantity, total_revenue }, ...]
 * Note: Only counts served orders with paid invoices
 */
router.get("/top-items", verifyStaffToken, verifyManager, getTopItems);

export default router;
