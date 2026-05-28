import { Router } from "express";
import {
  verifyStaffToken,
  requireRole,
  verifyCustomerToken,
  verifyTokenEither,
} from "../middlewares/auth.middleware";
import * as reservationController from "../controllers/reservation.controller";

const router = Router();

// ============ Routes ============

/**
 * GET /api/reservations/available-tables
 * PUBLIC - Get available tables for given date, time, and guest count
 * Query params: date (YYYY-MM-DD), time (HH:mm), guestCount
 */
router.get("/available-tables", reservationController.getAvailableTables);

/**
 * POST /api/reservations
 * CUSTOMER AUTH - Create a new reservation
 * Body: { tableId, date, time, guestCount, customerNote? }
 */
router.post("/", verifyCustomerToken, reservationController.createReservation);

/**
 * GET /api/reservations/my
 * CUSTOMER AUTH - Get current user's reservations
 */
router.get("/my", verifyCustomerToken, reservationController.getMyReservations);

/**
 * GET /api/reservations
 * RECEPTIONIST/MANAGER - Get all reservations with optional filters
 * Query params: status?, date?, customerId?
 */
router.get(
  "/",
  verifyStaffToken,
  requireRole(["receptionist", "manager"]),
  reservationController.getReservations,
);

/**
 * PATCH /api/reservations/:id/confirm
 * RECEPTIONIST/MANAGER - Confirm a pending reservation
 * Body: { staffNote? }
 */
router.patch(
  "/:id/confirm",
  verifyStaffToken,
  requireRole(["receptionist", "manager"]),
  reservationController.confirmReservation,
);

/**
 * PATCH /api/reservations/:id/cancel
 * CUSTOMER (own reservation) or RECEPTIONIST/MANAGER - Cancel a reservation
 * Body: { reason? }
 */
router.patch(
  "/:id/cancel",
  verifyTokenEither,
  reservationController.cancelReservation,
);

export default router;
