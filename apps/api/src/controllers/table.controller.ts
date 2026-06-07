import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import QRCode from "qrcode";
import { PrismaClient } from "@prisma/client";
import { getSocketService } from "../socket";

const prisma = new PrismaClient();

/**
 * Zod schema để validate create table request
 */
const createTableSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  location: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Zod schema để validate update table request
 */
const updateTableSchema = z.object({
  tableNumber: z.string().optional(),
  capacity: z.number().int().min(1).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["available", "reserved", "occupied", "cleaning"]).optional(),
});

/**
 * Get all tables with current status
 * GET /api/tables
 * Response: { success: true, data: [...tables] }
 */
export async function getTables(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tables = await prisma.table.findMany({
      where: { isActive: true },
      include: {
        reservations: {
          where: {
            status: { in: ["pending", "confirmed"] },
            reservedDate: { gte: new Date() },
          },
        },
        tableSessions: {
          where: { status: "open" },
          take: 1,
          orderBy: { openedAt: "desc" },
        },
      },
      orderBy: { id: "asc" },
    });

    res.status(200).json({
      success: true,
      data: tables,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get table by ID
 * GET /api/tables/:id
 * Response: { success: true, data: table }
 */
export async function getTableById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const tableId = parseInt(id, 10);

    if (isNaN(tableId)) {
      res.status(400).json({
        success: false,
        error: "Invalid table ID",
        code: "INVALID_TABLE_ID",
      });
      return;
    }

    const table = await prisma.table.findUnique({
      where: { id: tableId, isActive: true },
      include: {
        reservations: {
          where: {
            status: { in: ["pending", "confirmed"] },
            reservedDate: { gte: new Date() },
          },
        },
        tableSessions: {
          where: { status: "open" },
          take: 1,
          orderBy: { openedAt: "desc" },
        },
      },
    });

    if (!table) {
      res.status(404).json({
        success: false,
        error: "Table not found",
        code: "TABLE_NOT_FOUND",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: table,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new table
 * POST /api/tables
 * Body: { table_number, capacity, location?, notes? }
 * Response: { success: true, data: table }
 */
export async function createTable(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createTableSchema.parse(req.body);

    // Check if table number already exists
    const existingTable = await prisma.table.findUnique({
      where: { tableNumber: body.tableNumber },
    });

    if (existingTable) {
      res.status(409).json({
        success: false,
        error: "Table number already exists",
        code: "TABLE_NUMBER_DUPLICATE",
      });
      return;
    }

    const table = await prisma.table.create({
      data: {
        tableNumber: body.tableNumber,
        capacity: body.capacity,
        location: body.location,
        notes: body.notes,
        status: "available",
      },
    });

    res.status(201).json({
      success: true,
      data: table,
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
 * Update table
 * PATCH /api/tables/:id
 * Body: { table_number?, capacity?, location?, notes?, status? }
 * Response: { success: true, data: table }
 */
export async function updateTable(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const tableId = parseInt(id, 10);

    if (isNaN(tableId)) {
      res.status(400).json({
        success: false,
        error: "Invalid table ID",
        code: "INVALID_TABLE_ID",
      });
      return;
    }

    const body = updateTableSchema.parse(req.body);

    // Check if table exists
    const existingTable = await prisma.table.findUnique({
      where: { id: tableId, isActive: true },
    });

    if (!existingTable) {
      res.status(404).json({
        success: false,
        error: "Table not found",
        code: "TABLE_NOT_FOUND",
      });
      return;
    }

    // Check if new table number already exists
    if (body.tableNumber && body.tableNumber !== existingTable.tableNumber) {
      const duplicate = await prisma.table.findUnique({
        where: { tableNumber: body.tableNumber },
      });
      if (duplicate) {
        res.status(409).json({
          success: false,
          error: "Table number already exists",
          code: "TABLE_NUMBER_DUPLICATE",
        });
        return;
      }
    }

    const table = await prisma.table.update({
      where: { id: tableId },
      data: {
        tableNumber: body.tableNumber,
        capacity: body.capacity,
        location: body.location,
        notes: body.notes,
        status: body.status as any,
      },
    });

    try {
      const socketService = getSocketService();
      socketService.emitToReceptionists("table-status-changed", {
        tableId: table.id,
        status: table.status,
      });
    } catch (socketError) {
      console.error("[Socket] Failed to emit table-status-changed in updateTable:", socketError);
    }

    res.status(200).json({
      success: true,
      data: table,
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
 * Soft delete table
 * DELETE /api/tables/:id
 * Response: { success: true, data: { id } }
 */
export async function deleteTable(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const tableId = parseInt(id, 10);

    if (isNaN(tableId)) {
      res.status(400).json({
        success: false,
        error: "Invalid table ID",
        code: "INVALID_TABLE_ID",
      });
      return;
    }

    // Check if table exists
    const existingTable = await prisma.table.findUnique({
      where: { id: tableId, isActive: true },
    });

    if (!existingTable) {
      res.status(404).json({
        success: false,
        error: "Table not found",
        code: "TABLE_NOT_FOUND",
      });
      return;
    }

    // Soft delete
    const table = await prisma.table.update({
      where: { id: tableId },
      data: { isActive: false },
    });

    res.status(200).json({
      success: true,
      data: { id: table.id },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate QR code for table
 * POST /api/tables/:id/generate-qr
 * Response: { success: true, data: { qrCodeUrl: "data:image/png;base64,..." } }
 */
export async function generateQR(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const tableId = parseInt(id, 10);

    if (isNaN(tableId)) {
      res.status(400).json({
        success: false,
        error: "Invalid table ID",
        code: "INVALID_TABLE_ID",
      });
      return;
    }

    // Check if table exists
    const table = await prisma.table.findUnique({
      where: { id: tableId, isActive: true },
    });

    if (!table) {
      res.status(404).json({
        success: false,
        error: "Table not found",
        code: "TABLE_NOT_FOUND",
      });
      return;
    }

    // Generate QR code URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const qrContent = `${frontendUrl}/table/${tableId}`;

    // Generate QR as base64 data URI
    const qrCodeUrl = await QRCode.toDataURL(qrContent, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 300,
      margin: 2,
    });

    // Save to database
    const updatedTable = await prisma.table.update({
      where: { id: tableId },
      data: { qrCodeUrl },
    });

    res.status(200).json({
      success: true,
      data: {
        id: updatedTable.id,
        tableNumber: updatedTable.tableNumber,
        qrCodeUrl: updatedTable.qrCodeUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}
