import { Router } from "express";
import { verifyStaffToken, requireRole } from "../middlewares/auth.middleware";
import * as menuController from "../controllers/menu.controller";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// ============ Multer Configuration ============

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter - only allow images
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

  const ext = path.extname(file.originalname).toLowerCase();
  const isValidMime = allowedMimes.includes(file.mimetype);
  const isValidExt = allowedExtensions.includes(ext);

  // Accept if MIME type is valid OR file extension is valid
  if (isValidMime || isValidExt) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Only image files are allowed (jpg, jpeg, png, gif, webp). Received: ${file.mimetype} with extension ${ext}`,
      ),
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ============ Middleware ============

/**
 * Middleware para handle erros do multer
 */
function handleMulterError(err: any, req: any, res: any, next: any) {
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
function parseFormData(req: any, res: any, next: any) {
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
 * POST /api/menu/items
 * Create menu item with optional image upload (manager only)
 * Accepts multipart/form-data
 */
router.post(
  "/items",
  verifyStaffToken,
  requireRole(["manager"]),
  upload.single("image"),
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
  upload.single("image"),
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
