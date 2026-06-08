import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { deleteFromCloudinary } from "../utils/cloudinary";

const prisma = new PrismaClient();

// ============ Zod Schemas ============

const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  sortOrder: z.number().int().default(0),
});

const updateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100).optional(),
  sortOrder: z.number().int().optional(),
});

const createMenuItemSchema = z.object({
  categoryId: z.number().int().positive("Category ID must be positive"),
  name: z.string().min(1, "Item name is required").max(150),
  description: z.string().optional(),
  price: z
    .number()
    .positive("Price must be greater than 0")
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => val > 0, "Price must be greater than 0"),
  sortOrder: z.number().int().default(0),
});

const updateMenuItemSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  name: z.string().min(1).max(150).optional(),
  description: z.string().optional(),
  price: z
    .number()
    .positive()
    .or(z.string().transform((val) => parseFloat(val)))
    .optional(),
  sortOrder: z.number().int().optional(),
});

const toggleStatusSchema = z.object({
  status: z.enum(["available", "unavailable"]),
});

// ============ Menu Categories ============

/**
 * GET /api/menu/categories
 * Get all active categories (staff only)
 */
export async function getCategories(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/menu/categories
 * Create new category (manager only)
 */
export async function createCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createCategorySchema.parse(req.body);

    const category = await prisma.menuCategory.create({
      data: {
        name: body.name,
        sortOrder: body.sortOrder,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0].message,
        code: "VALIDATION_ERROR",
      });
      return;
    }
    next(error);
  }
}

/**
 * PATCH /api/menu/categories/:id
 * Update category (manager only)
 */
export async function updateCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id, 10);

    if (isNaN(categoryId)) {
      res.status(400).json({
        success: false,
        error: "Invalid category ID",
        code: "INVALID_ID",
      });
      return;
    }

    const body = updateCategorySchema.parse(req.body);

    // Verify category exists
    const existingCategory = await prisma.menuCategory.findUnique({
      where: { id: categoryId },
    });

    if (!existingCategory) {
      res.status(404).json({
        success: false,
        error: "Category not found",
        code: "NOT_FOUND",
      });
      return;
    }

    const category = await prisma.menuCategory.update({
      where: { id: categoryId },
      data: body,
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0].message,
        code: "VALIDATION_ERROR",
      });
      return;
    }
    next(error);
  }
}

/**
 * DELETE /api/menu/categories/:id
 * Soft delete category (manager only)
 */
export async function deleteCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id, 10);

    if (isNaN(categoryId)) {
      res.status(400).json({
        success: false,
        error: "Invalid category ID",
        code: "INVALID_ID",
      });
      return;
    }

    // Verify category exists
    const existingCategory = await prisma.menuCategory.findUnique({
      where: { id: categoryId },
    });

    if (!existingCategory) {
      res.status(404).json({
        success: false,
        error: "Category not found",
        code: "NOT_FOUND",
      });
      return;
    }

    // Soft delete: set isActive to false
    const category = await prisma.menuCategory.update({
      where: { id: categoryId },
      data: { isActive: false },
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

// ============ Menu Items ============

/**
 * GET /api/menu
 * Get public menu - all active categories and items (NO AUTH REQUIRED)
 */
export async function getPublicMenu(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        menuItems: {
          where: { status: "available" },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            status: true,
            sortOrder: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/menu/items
 * Create new menu item (manager only)
 * Accepts multipart/form-data with image upload
 */
export async function createMenuItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createMenuItemSchema.parse(req.body);

    // Handle image upload
    let imageUrl: string | null = null;
    if (req.file) {
      // In multer-storage-cloudinary, req.file.path contains the Cloudinary URL
      imageUrl = req.file.path;
    }

    // Verify category exists
    const category = await prisma.menuCategory.findUnique({
      where: { id: body.categoryId },
    });

    if (!category) {
      // If upload failed, clean up the file on Cloudinary
      if (req.file) {
        deleteFromCloudinary(req.file.path).catch((err) => {
          console.error("Failed to delete failed upload from Cloudinary:", err);
        });
      }

      res.status(400).json({
        success: false,
        error: "Category not found",
        code: "INVALID_CATEGORY",
      });
      return;
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        categoryId: body.categoryId,
        name: body.name,
        description: body.description || null,
        price: new Decimal(body.price),
        imageUrl,
        status: "available",
        sortOrder: body.sortOrder,
      },
    });

    res.status(201).json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    // Clean up uploaded file from Cloudinary if validation failed
    if (req.file) {
      deleteFromCloudinary(req.file.path).catch((err) => {
        console.error("Failed to delete failed upload from Cloudinary:", err);
      });
    }

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0].message,
        code: "VALIDATION_ERROR",
      });
      return;
    }
    next(error);
  }
}

/**
 * PATCH /api/menu/items/:id
 * Update menu item (manager only)
 * Can update image by sending multipart/form-data
 */
export async function updateMenuItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      res.status(400).json({
        success: false,
        error: "Invalid item ID",
        code: "INVALID_ID",
      });
      return;
    }

    const body = updateMenuItemSchema.parse(req.body);

    // Verify item exists
    const existingItem = await prisma.menuItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      if (req.file) {
        deleteFromCloudinary(req.file.path).catch((err) => {
          console.error("Failed to delete failed upload from Cloudinary:", err);
        });
      }

      res.status(404).json({
        success: false,
        error: "Menu item not found",
        code: "NOT_FOUND",
      });
      return;
    }

    // Verify category if provided
    if (body.categoryId) {
      const category = await prisma.menuCategory.findUnique({
        where: { id: body.categoryId },
      });

      if (!category) {
        if (req.file) {
          deleteFromCloudinary(req.file.path).catch((err) => {
            console.error("Failed to delete failed upload from Cloudinary:", err);
          });
        }

        res.status(400).json({
          success: false,
          error: "Category not found",
          code: "INVALID_CATEGORY",
        });
        return;
      }
    }

    // Handle image replacement
    let imageUrl = existingItem.imageUrl;
    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (existingItem.imageUrl) {
        deleteFromCloudinary(existingItem.imageUrl).catch((err) => {
          console.error("Failed to delete old image from Cloudinary:", err);
        });
      }
      // In multer-storage-cloudinary, req.file.path contains the Cloudinary URL
      imageUrl = req.file.path;
    }

    const updateData: any = {
      ...body,
      imageUrl,
    };

    if (body.price !== undefined) {
      updateData.price = new Decimal(body.price);
    }

    const menuItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: updateData,
    });

    res.json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    if (req.file) {
      deleteFromCloudinary(req.file.path).catch((err) => {
        console.error("Failed to delete failed upload from Cloudinary:", err);
      });
    }

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0].message,
        code: "VALIDATION_ERROR",
      });
      return;
    }
    next(error);
  }
}

/**
 * DELETE /api/menu/items/:id
 * Soft delete menu item (manager only)
 */
export async function deleteMenuItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      res.status(400).json({
        success: false,
        error: "Invalid item ID",
        code: "INVALID_ID",
      });
      return;
    }

    // Verify item exists
    const existingItem = await prisma.menuItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      res.status(404).json({
        success: false,
        error: "Menu item not found",
        code: "NOT_FOUND",
      });
      return;
    }

    // Delete image from Cloudinary if it exists
    if (existingItem.imageUrl) {
      deleteFromCloudinary(existingItem.imageUrl).catch((err) => {
        console.error("Failed to delete image from Cloudinary on soft-delete:", err);
      });
    }

    // Update status to unavailable (soft delete) and remove the image URL
    const menuItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: { 
        status: "unavailable",
        imageUrl: null,
      },
    });

    res.json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/menu/items/:id/toggle
 * Toggle menu item availability (manager only)
 */
export async function toggleItemStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      res.status(400).json({
        success: false,
        error: "Invalid item ID",
        code: "INVALID_ID",
      });
      return;
    }

    const body = toggleStatusSchema.parse(req.body);

    // Verify item exists
    const existingItem = await prisma.menuItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      res.status(404).json({
        success: false,
        error: "Menu item not found",
        code: "NOT_FOUND",
      });
      return;
    }

    const menuItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: { status: body.status },
    });

    res.json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0].message,
        code: "VALIDATION_ERROR",
      });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/menu/items
 * Get all menu items with category details (staff only)
 */
export async function getMenuItems(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await prisma.menuItem.findMany({
      include: {
        category: true,
      },
      orderBy: [
        { categoryId: "asc" },
        { sortOrder: "asc" },
      ],
    });

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

// Import Decimal for proper price handling
import { Decimal } from "@prisma/client/runtime/library";
