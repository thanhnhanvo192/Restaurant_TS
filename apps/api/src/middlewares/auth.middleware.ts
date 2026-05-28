import { Request, Response, NextFunction } from "express";
import {
  verifyToken,
  StaffTokenPayload,
  verifyUserToken,
  UserTokenPayload,
} from "../utils/jwt";

/**
 * Extend Express Request để thêm user property
 * Khi middleware verifyStaffToken chạy, user sẽ được attach vào req
 * Khi middleware verifyCustomerToken chạy, customer sẽ được attach vào req
 */
declare global {
  namespace Express {
    interface Request {
      user?: StaffTokenPayload;
      customer?: UserTokenPayload;
    }
  }
}

/**
 * Middleware để verify JWT token từ Authorization header
 * Extract Bearer token, verify, attach staff info vào req.user
 * Nếu invalid/missing → trả 401
 */
export async function verifyStaffToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: "Missing authorization header",
        code: "MISSING_AUTH_HEADER",
      });
      return;
    }

    // Extract token từ "Bearer <token>"
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      res.status(401).json({
        success: false,
        error: "Invalid authorization format. Expected: Bearer <token>",
        code: "INVALID_AUTH_FORMAT",
      });
      return;
    }

    const token = parts[1];

    // Verify token
    const payload = await verifyToken(token);
    req.user = payload;

    next();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token verification failed";

    res.status(401).json({
      success: false,
      error: message,
      code: "INVALID_TOKEN",
    });
  }
}

/**
 * Middleware để check role của staff
 * Chỉ allow nếu staff.role có trong allowed roles
 * Nếu không đủ quyền → trả 403
 *
 * Usage: app.get('/admin', requireRole(['manager']), handler)
 */
export function requireRole(allowedRoles: StaffTokenPayload["role"][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // verifyStaffToken phải chạy trước, vì vậy req.user phải có
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Not authenticated",
        code: "NOT_AUTHENTICATED",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden. Required role: ${allowedRoles.join(" or ")}`,
        code: "INSUFFICIENT_ROLE",
      });
      return;
    }

    next();
  };
}

/**
 * Middleware để verify JWT token của customer từ Authorization header
 * Extract Bearer token, verify, attach customer info vào req.customer
 * Nếu invalid/missing → trả 401
 */
export async function verifyCustomerToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: "Missing authorization header",
        code: "MISSING_AUTH_HEADER",
      });
      return;
    }

    // Extract token từ "Bearer <token>"
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      res.status(401).json({
        success: false,
        error: "Invalid authorization format. Expected: Bearer <token>",
        code: "INVALID_AUTH_FORMAT",
      });
      return;
    }

    const token = parts[1];

    // Verify token
    const payload = await verifyUserToken(token);
    req.customer = payload;

    next();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token verification failed";

    res.status(401).json({
      success: false,
      error: message,
      code: "INVALID_TOKEN",
    });
  }
}

/**
 * Middleware để verify JWT token (either customer hoặc staff)
 * Tries customer auth first, then staff auth
 * Nếu cả hai đều invalid → trả 401
 * 
 * Usage: app.patch('/resource/:id', verifyTokenEither, handler)
 * Handler có thể check req.customer hoặc req.user
 */
export async function verifyTokenEither(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: "Missing authorization header",
      code: "MISSING_AUTH_HEADER",
    });
    return;
  }

  // Extract token từ "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({
      success: false,
      error: "Invalid authorization format. Expected: Bearer <token>",
      code: "INVALID_AUTH_FORMAT",
    });
    return;
  }

  const token = parts[1];

  // Try customer auth first
  try {
    const payload = await verifyUserToken(token);
    req.customer = payload;
    console.log(`[Auth] ✅ Customer ${payload.id} authenticated`);
    next();
    return;
  } catch (error) {
    // Customer auth failed, try staff auth
  }

  // Try staff auth
  try {
    const payload = await verifyToken(token);
    req.user = payload;
    console.log(`[Auth] ✅ Staff ${payload.id} (${payload.role}) authenticated`);
    next();
    return;
  } catch (error) {
    // Both failed
  }

  // Both auth methods failed
  res.status(401).json({
    success: false,
    error: "Invalid token - must be valid customer or staff token",
    code: "INVALID_TOKEN",
  });
}
