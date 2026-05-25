import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { signToken } from "../utils/jwt";

const prisma = new PrismaClient();

/**
 * Zod schema để validate staff login request
 */
const staffLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});


/**
 * Response type cho staff login
 */
interface StaffLoginResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  token: string;
}

/**
 * POST /api/auth/staff/login
 * Login staff với email + password
 * Trả về staff info + JWT token
 */
export async function staffLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate input
    const body = staffLoginSchema.parse(req.body);

    // Find staff by email
    const staff = await prisma.staff.findUnique({
      where: { email: body.email },
    });

    if (!staff) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
      return;
    }

    // Check if staff is active
    if (!staff.isActive) {
      res.status(403).json({
        success: false,
        error: "Staff account is inactive",
        code: "STAFF_INACTIVE",
      });
      return;
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(body.password, staff.password);
    if (!isPasswordMatch) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
      return;
    }

    // Sign JWT token
    const token = await signToken({
      id: staff.id,
      email: staff.email,
      role: staff.role,
    });

    // Return response
    const response: StaffLoginResponse = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      token,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.errors,
      });
      return;
    }

    next(error);
  }
}

/**
 * GET /api/auth/staff/me
 * Lấy thông tin staff hiện tại (protected route)
 * Require: JWT token hợp lệ trong Authorization header
 */
export async function getStaffMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // req.user được set bởi verifyStaffToken middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Not authenticated",
        code: "NOT_AUTHENTICATED",
      });
      return;
    }

    // Fetch staff data từ DB để lấy thông tin mới nhất
    const staff = await prisma.staff.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!staff) {
      res.status(404).json({
        success: false,
        error: "Staff not found",
        code: "STAFF_NOT_FOUND",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
}
