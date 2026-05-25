import { Router } from "express";
import { staffLogin, getStaffMe, registerCustomer, loginCustomer } from "../controllers/auth.controller";
import { verifyStaffToken, verifyCustomerToken } from "../middlewares/auth.middleware";

const router = Router();

/**
 * POST /api/auth/staff/login
 * Body: { email, password }
 * Response: { success, data: { id, name, email, role, token } }
 */
router.post("/staff/login", staffLogin);

/**
 * GET /api/auth/staff/me
 * Protected route - require valid JWT token
 * Header: Authorization: Bearer <token>
 * Response: { success, data: { id, name, email, phone, role, isActive, createdAt, updatedAt } }
 */
router.get("/staff/me", verifyStaffToken, getStaffMe);

/**
 * POST /api/auth/customer/register
 * Body: { name, email?, phone?, password }
 * Response: { success, data: { id, name, email?, phone?, token } }
 */
router.post("/customer/register", registerCustomer);

/**
 * POST /api/auth/customer/login
 * Body: { email/phone, password }
 * Response: { success, data: { id, name, email?, phone?, token } }
 */
router.post("/customer/login", loginCustomer);

export default router;
