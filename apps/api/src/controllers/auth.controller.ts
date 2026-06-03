import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { signToken, signUserToken } from "../utils/jwt";

const prisma = new PrismaClient();

/**
 * Zod schema để validate staff login request
 */
const staffLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/**
 * Zod schema để validate customer register request
 * Require: name + password, ít nhất một trong email hoặc phone
 */
const customerRegisterSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z
      .string()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .min(10, "Invalid phone number")
      .optional()
      .or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.email || data.phone, {
    message: "Email or phone number is required",
    path: ["email"],
  });

/**
 * Zod schema để validate customer login request
 * Require: (email hoặc phone) + password
 */
const customerLoginSchema = z
  .object({
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(10).optional().or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.email || data.phone, {
    message: "Email or phone number is required",
    path: ["email"],
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
 * Response type cho customer login/register
 */
interface CustomerAuthResponse {
  id: number;
  name: string;
  email?: string;
  phone?: string;
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

/**
 * POST /api/auth/customer/register
 * Register customer mới với name + email/phone + password
 * Trả về customer info + JWT token
 */
export async function registerCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate input
    const body = customerRegisterSchema.parse(req.body);

    // Prepare email/phone (convert empty string to null)
    const email = body.email || null;
    const phone = body.phone || null;

    // Check if user với email hoặc phone đã tồn tại
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: "Email or phone number already registered",
        code: "USER_EXISTS",
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        phone,
        password: hashedPassword,
      },
    });

    // Sign JWT token
    const token = await signUserToken({
      id: user.id,
      email: user.email || undefined,
    });

    // Return response
    const response: CustomerAuthResponse = {
      id: user.id,
      name: user.name,
      email: user.email || undefined,
      phone: user.phone || undefined,
      token,
    };

    res.status(201).json({
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
 * POST /api/auth/customer/login
 * Login customer với email hoặc phone + password
 * Trả về customer info + JWT token
 */
export async function loginCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate input
    const body = customerLoginSchema.parse(req.body);

    // Find user by email hoặc phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(body.email ? [{ email: body.email }] : []),
          ...(body.phone ? [{ phone: body.phone }] : []),
        ],
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid email/phone or password",
        code: "INVALID_CREDENTIALS",
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: "User account is inactive",
        code: "USER_INACTIVE",
      });
      return;
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(body.password, user.password);
    if (!isPasswordMatch) {
      res.status(401).json({
        success: false,
        error: "Invalid email/phone or password",
        // error: "Password failed",
        code: "INVALID_CREDENTIALS",
      });
      return;
    }

    // Sign JWT token
    const token = await signUserToken({
      id: user.id,
      email: user.email || undefined,
    });

    // Return response
    const response: CustomerAuthResponse = {
      id: user.id,
      name: user.name,
      email: user.email || undefined,
      phone: user.phone || undefined,
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
 * Zod schema to validate create staff request
 */
const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address").max(150),
  phone: z.string().max(20).optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["manager", "receptionist", "warehouse"]),
});

/**
 * Zod schema to validate update staff request
 */
const updateStaffSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(150).optional(),
  phone: z.string().max(20).optional().nullable(),
  password: z.string().min(6).optional(),
  role: z.enum(["manager", "receptionist", "warehouse"]).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/auth/staff
 * Get list of all staff members (manager only)
 */
export async function getStaffList(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const staffList = await prisma.staff.findMany({
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
      orderBy: [
        { role: "asc" },
        { name: "asc" },
      ],
    });

    res.status(200).json({
      success: true,
      data: staffList,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/staff
 * Create a new staff member (manager only)
 */
export async function createStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createStaffSchema.parse(req.body);

    // Check if staff email already exists
    const existingStaff = await prisma.staff.findUnique({
      where: { email: body.email },
    });

    if (existingStaff) {
      res.status(409).json({
        success: false,
        error: "Staff email already registered",
        code: "STAFF_EXISTS",
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Create staff
    const newStaff = await prisma.staff.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        password: hashedPassword,
        role: body.role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: newStaff,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0].message,
        code: "VALIDATION_ERROR",
        details: error.errors,
      });
      return;
    }
    next(error);
  }
}

/**
 * PATCH /api/auth/staff/:id
 * Update a staff member details or deactivate them (manager only)
 */
export async function updateStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const staffId = parseInt(id, 10);

    if (isNaN(staffId) || staffId <= 0) {
      res.status(400).json({
        success: false,
        error: "Invalid staff ID",
        code: "INVALID_ID",
      });
      return;
    }

    const body = updateStaffSchema.parse(req.body);

    // Verify staff exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!existingStaff) {
      res.status(404).json({
        success: false,
        error: "Staff member not found",
        code: "NOT_FOUND",
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) {
      // Check if email taken by someone else
      if (body.email !== existingStaff.email) {
        const emailTaken = await prisma.staff.findUnique({
          where: { email: body.email },
        });
        if (emailTaken) {
          res.status(409).json({
            success: false,
            error: "Email already taken by another staff member",
            code: "EMAIL_TAKEN",
          });
          return;
        }
      }
      updateData.email = body.email;
    }
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Hash password if updating password
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    // Update staff
    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: updateData,
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

    res.status(200).json({
      success: true,
      data: updatedStaff,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0].message,
        code: "VALIDATION_ERROR",
        details: error.errors,
      });
      return;
    }
    next(error);
  }
}

