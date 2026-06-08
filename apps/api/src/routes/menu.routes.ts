import { Router } from "express";
import { verifyStaffToken, requireRole } from "../middlewares/auth.middleware";
import * as menuController from "../controllers/menu.controller";
import multer from "multer";
import { uploadSingle } from "../middlewares/upload.middleware";

const router = Router();

// ============ Middleware ============

/**
 * Middleware para handle erros do multer
 */
function handleMulterError(err: any, _req: any, res: any, next: any) {
  if (err instanceof multer.MulterError) {
    // Multer specific error
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File size exceeds 5MB limit",
        code: "FILE_TOO_LARGE",
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message,
      code: "UPLOAD_ERROR",
    });
  }

  if (err) {
    // Custom errors from fileFilter
    return res.status(400).json({
      success: false,
      error: err.message,
      code: "VALIDATION_ERROR",
    });
  }

  next();
}

/**
 * Middleware để convert form-data fields:
 * - snake_case → camelCase
 * - numeric strings → numbers
 */
function parseFormData(req: any, _res: any, next: any) {
  if (req.body) {
    const transformed: any = {};

    // Map snake_case to camelCase
    const fieldMapping: Record<string, string> = {
      category_id: "categoryId",
      sort_order: "sortOrder",
    };

    // Fields that should be parsed as numbers
    const numericFields = new Set(["categoryId", "sortOrder", "price"]);

    for (const [key, value] of Object.entries(req.body)) {
      const mappedKey = fieldMapping[key] || key;

      // Parse numeric fields
      if (numericFields.has(mappedKey) && typeof value === "string") {
        const parsed = parseFloat(value);
        transformed[mappedKey] = isNaN(parsed) ? value : parsed;
      } else {
        transformed[mappedKey] = value;
      }
    }

    req.body = transformed;
  }

  next();
}

// ============ Public Routes (No Auth) ============

/**
 * GET /api/menu
 * Get public menu - all active categories and items
 * NO AUTH REQUIRED
 */
router.get("/", menuController.getPublicMenu);

// ============ Staff Routes (Auth Required) ============

/**
 * GET /api/menu/categories
 * Get all categories (staff)
 */
router.get("/categories", verifyStaffToken, menuController.getCategories);

/**
 * POST /api/menu/categories
 * Create category (manager only)
 */
router.post(
  "/categories",
  verifyStaffToken,
  requireRole(["manager"]),
  menuController.createCategory,
);

/**
 * PATCH /api/menu/categories/:id
 * Update category (manager only)
 */
router.patch(
  "/categories/:id",
  verifyStaffToken,
  requireRole(["manager"]),
  menuController.updateCategory,
);

/**
 * DELETE /api/menu/categories/:id
 * Delete category (manager only, soft delete)
 */
router.delete(
  "/categories/:id",
  verifyStaffToken,
  requireRole(["manager"]),
  menuController.deleteCategory,
);

/**
 * GET /api/menu/items
 * Get all menu items (staff only)
 */
router.get(
  "/items",
  verifyStaffToken,
  menuController.getMenuItems,
);

/**
 * POST /api/menu/items
 * Create menu item with optional image upload (manager only)
 * Accepts multipart/form-data
 */
router.post(
  "/items",
  verifyStaffToken,
  requireRole(["manager"]),
  uploadSingle,
  handleMulterError,
  parseFormData,
  menuController.createMenuItem,
);

/**
 * PATCH /api/menu/items/:id
 * Update menu item with optional image upload (manager only)
 * Accepts multipart/form-data or application/json
 */
router.patch(
  "/items/:id",
  verifyStaffToken,
  requireRole(["manager"]),
  uploadSingle,
  handleMulterError,
  parseFormData,
  menuController.updateMenuItem,
);

/**
 * DELETE /api/menu/items/:id
 * Delete menu item (manager only, soft delete)
 */
router.delete(
  "/items/:id",
  verifyStaffToken,
  requireRole(["manager"]),
  menuController.deleteMenuItem,
);

/**
 * PATCH /api/menu/items/:id/toggle
 * Toggle menu item availability (manager only)
 * Body: { status: "available" | "unavailable" }
 */
router.patch(
  "/items/:id/toggle",
  verifyStaffToken,
  requireRole(["manager"]),
  menuController.toggleItemStatus,
);

export default router;
