import { Router } from "express";
import { 
  staffLogin, 
  getStaffMe, 
  registerCustomer, 
  loginCustomer,
  getStaffList,
  createStaff,
  updateStaff
} from "../controllers/auth.controller";
import { verifyStaffToken, requireRole } from "../middlewares/auth.middleware";

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
 * GET /api/auth/staff
 * Get list of all staff members
 * Access: manager only
 */
router.get("/staff", verifyStaffToken, requireRole(["manager"]), getStaffList);

/**
 * POST /api/auth/staff
 * Create a new staff member
 * Access: manager only
 */
router.post("/staff", verifyStaffToken, requireRole(["manager"]), createStaff);

/**
 * PATCH /api/auth/staff/:id
 * Update staff details or toggle status
 * Access: manager only
 */
router.patch("/staff/:id", verifyStaffToken, requireRole(["manager"]), updateStaff);

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

