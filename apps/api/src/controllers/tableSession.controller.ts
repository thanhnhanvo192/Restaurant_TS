import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { getSocketService } from "../socket";

const prisma = new PrismaClient();

// ============ Zod Schemas ============

const openSessionSchema = z.object({
  reservationId: z.number().int().positive().optional(),
});

// ============ Controllers ============

/**
 * Get table info with current open session
 * GET /api/tables/:tableId/session
 * Access: PUBLIC
 * Response: { success: true, data: { table, session } }
 */
export async function getTableInfo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { tableId } = req.params;
    const id = parseInt(tableId, 10);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: "Invalid table ID",
        code: "INVALID_TABLE_ID",
      });
      return;
    }

    const table = await prisma.table.findUnique({
      where: { id, isActive: true },
      include: {
        tableSessions: {
          where: { status: "open" },
          take: 1,
          orderBy: { openedAt: "desc" },
          include: {
            orders: {
              select: {
                id: true,
                status: true,
                createdAt: true,
              },
            },
            reservation: {
              select: {
                id: true,
                guestCount: true,
                reservedDate: true,
                reservedTime: true,
              },
            },
          },
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
      data: {
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          status: table.status,
          location: table.location,
        },
        session: table.tableSessions[0] || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Open a new session when customer scans QR
 * POST /api/tables/:tableId/session
 * Body: { reservationId? }
 * Access: PUBLIC
 *
 * Logic:
 * - If table status = 'available': create new session, change table to 'occupied'
 * - If table status = 'occupied': return existing open session
 * - Otherwise: return error
 *
 * Response: { success: true, data: session }
 */
export async function openSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { tableId } = req.params;
    const id = parseInt(tableId, 10);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: "Invalid table ID",
        code: "INVALID_TABLE_ID",
      });
      return;
    }

    const body = openSessionSchema.parse(req.body);
    const { reservationId } = body;

    // Get current table
    const table = await prisma.table.findUnique({
      where: { id, isActive: true },
      include: {
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

    // If reservation provided, validate it exists and belongs to this table
    if (reservationId) {
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        res.status(404).json({
          success: false,
          error: "Reservation not found",
          code: "RESERVATION_NOT_FOUND",
        });
        return;
      }

      if (reservation.tableId !== id) {
        res.status(400).json({
          success: false,
          error: "Reservation does not belong to this table",
          code: "RESERVATION_TABLE_MISMATCH",
        });
        return;
      }
    }

    // Handle different table statuses
    if (table.status === "available" || (table.status === "reserved" && reservationId)) {
      // Create new session and update table status in transaction
      const result = await prisma.$transaction(async (tx: any) => {
        // Create new session
        const session = await tx.tableSession.create({
          data: {
            tableId: id,
            reservationId: reservationId || null,
            status: "open",
          },
          include: {
            orders: true,
            reservation: true,
          },
        });

        // Update table status to occupied
        await tx.table.update({
          where: { id },
          data: { status: "occupied" },
        });

        return session;
      }, {
        maxWait: 10000,
        timeout: 20000,
      });

      res.status(201).json({
        success: true,
        data: result,
      });

      // Emit table status changed to occupied
      try {
        const socketService = getSocketService();
        socketService.emitToReceptionists("table-status-changed", {
          tableId: id,
          status: "occupied",
        });
      } catch (socketError) {
        console.error("[Socket] Failed to emit table-status-changed in openSession:", socketError);
      }
    } else if (table.status === "occupied") {
      // Table is already occupied, return existing session
      if (table.tableSessions.length === 0) {
        res.status(400).json({
          success: false,
          error: "Table is occupied but no open session found",
          code: "SESSION_NOT_FOUND",
        });
        return;
      }

      const existingSession = table.tableSessions[0];
      const sessionData = await prisma.tableSession.findUnique({
        where: { id: existingSession.id },
        include: {
          orders: {
            select: {
              id: true,
              status: true,
              createdAt: true,
            },
          },
          reservation: true,
        },
      });

      res.status(200).json({
        success: true,
        data: sessionData,
      });
    } else {
      // Table status is 'reserved' or 'cleaning'
      const statusMessages: Record<string, string> = {
        available: "Table is available",
        reserved: "Table is reserved for a future booking",
        occupied: "Table is occupied",
        cleaning: "Table is being cleaned",
      };

      res.status(400).json({
        success: false,
        error: statusMessages[table.status],
        code: `TABLE_${table.status.toUpperCase()}`,
      });
    }
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
 * Close a session and change table status to 'cleaning'
 * PATCH /api/sessions/:id/close
 * Access: receptionist only
 *
 * Response: { success: true, data: session }
 */
export async function closeSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const sessionId = parseInt(id, 10);

    if (isNaN(sessionId)) {
      res.status(400).json({
        success: false,
        error: "Invalid session ID",
        code: "INVALID_SESSION_ID",
      });
      return;
    }

    // Get current session
    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: "Session not found",
        code: "SESSION_NOT_FOUND",
      });
      return;
    }

    if (session.status === "closed") {
      res.status(400).json({
        success: false,
        error: "Session is already closed",
        code: "SESSION_ALREADY_CLOSED",
      });
      return;
    }

    // Close session and update table status in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Update session status to closed
      const updatedSession = await tx.tableSession.update({
        where: { id: sessionId },
        data: {
          status: "closed",
          closedAt: new Date(),
        },
        include: {
          orders: true,
          reservation: true,
        },
      });

      // Update table status to cleaning
      await tx.table.update({
        where: { id: session.tableId },
        data: { status: "cleaning" },
      });

      return updatedSession;
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    res.status(200).json({
      success: true,
      data: result,
    });

    // Emit table status changed to cleaning
    try {
      const socketService = getSocketService();
      socketService.emitToReceptionists("table-status-changed", {
        tableId: session.tableId,
        status: "cleaning",
      });
    } catch (socketError) {
      console.error("[Socket] Failed to emit table-status-changed in closeSession:", socketError);
    }
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
