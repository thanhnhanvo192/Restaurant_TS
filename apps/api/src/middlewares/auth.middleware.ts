import { Request, Response, NextFunction } from "express";
import { verifyToken, StaffTokenPayload } from "../utils/jwt";

/**
 * Extend Express Request để thêm user property
 * Khi middleware verifyStaffToken chạy, user sẽ được attach vào req
 */
declare global {
  namespace Express {
    interface Request {
      user?: StaffTokenPayload;
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
