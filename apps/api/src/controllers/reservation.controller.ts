import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { io } from "../index";

const prisma = new PrismaClient();

// ============ Zod Schemas ============

const getAvailableTablesSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),
  guestCount: z.number().int().positive("Guest count must be positive"),
});

const createReservationSchema = z.object({
  tableId: z.number().int().positive("Table ID must be positive"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),
  guestCount: z.number().int().positive("Guest count must be positive"),
  customerNote: z.string().optional(),
});

const getReservationsSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
  date: z.string().optional(),
  customerId: z.number().int().optional(),
});

const confirmReservationSchema = z.object({
  staffNote: z.string().optional(),
});

const cancelReservationSchema = z.object({
  reason: z.string().optional(),
});

// ============ Helper Functions ============

/**
 * Helper: Check if a table is available for given date/time
 * Available means:
 * 1. Capacity >= guestCount
 * 2. No confirmed/pending reservations in ±2 hour window
 * 3. No open table sessions
 */
async function isTableAvailable(
  tableId: number,
  reservedDate: Date,
  reservedTime: string,
  guestCount: number,
): Promise<boolean> {
  // Check capacity
  const table = await prisma.table.findUnique({
    where: { id: tableId },
  });

  if (!table || !table.isActive || table.capacity < guestCount) {
    return false;
  }

  // Parse the requested time
  const [hour, minute] = reservedTime.split(":").map(Number);

  // Create a datetime for the requested reservation
  const requestedDateTime = new Date(reservedDate);
  requestedDateTime.setHours(hour, minute, 0, 0);

  // Define the ±2 hour window
  const windowStart = new Date(
    requestedDateTime.getTime() - 2 * 60 * 60 * 1000,
  );
  const windowEnd = new Date(requestedDateTime.getTime() + 2 * 60 * 60 * 1000);

  // Determine which dates to check (handles case where window spans multiple days)
  const startDate = new Date(windowStart);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(windowEnd);
  endDate.setHours(23, 59, 59, 999);

  // Find all reservations for this table within the date range
  const conflictingReservations = await prisma.reservation.findMany({
    where: {
      tableId,
      reservedDate: {
        gte: startDate,
        lte: endDate,
      },
      status: { in: ["pending", "confirmed"] },
    },
  });

  // Check if any reservation falls within the ±2 hour window
  for (const res of conflictingReservations) {
    // Extract time from the Time field
    const resTime =
      res.reservedTime instanceof Date
        ? `${String(res.reservedTime.getHours()).padStart(2, "0")}:${String(res.reservedTime.getMinutes()).padStart(2, "0")}`
        : String(res.reservedTime);

    const [resHour, resMinute] = resTime.split(":").map(Number);

    // Create datetime for this reservation
    const resDateTime = new Date(res.reservedDate);
    resDateTime.setHours(resHour, resMinute, 0, 0);

    // Check if this reservation's time falls within our window
    if (resDateTime >= windowStart && resDateTime <= windowEnd) {
      return false;
    }
  }

  // Check for open table sessions
  const openSession = await prisma.tableSession.findFirst({
    where: {
      tableId,
      status: "open",
    },
  });

  return !openSession;
}

// ============ Controllers ============

/**
 * GET /api/reservations/available-tables
 * PUBLIC - Get available tables for given date, time, and guest count
 * Query params: date (YYYY-MM-DD), time (HH:mm), guestCount
 */
export async function getAvailableTables(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = getAvailableTablesSchema.parse({
      date: req.query.date,
      time: req.query.time,
      guestCount: Number(req.query.guest_count),
    });

    const reservedDate = new Date(query.date);
    const [hour, minute] = query.time.split(":").map(Number);
    const requestedDateTime = new Date(reservedDate);
    requestedDateTime.setHours(hour, minute, 0, 0);

    // Get all active tables with their availability
    const availableTables = await prisma.table.findMany({
      where: {
        isActive: true,
        capacity: {
          gte: query.guestCount,
        },
      },
      select: {
        id: true,
        tableNumber: true,
        capacity: true,
        location: true,
        status: true,
      },
      orderBy: { id: "asc" },
    });

    // Filter tables without conflicting reservations or open sessions
    const filtered: typeof availableTables = [];

    for (const table of availableTables) {
      const available = await isTableAvailable(
        table.id,
        reservedDate,
        query.time,
        query.guestCount,
      );

      if (available) {
        filtered.push(table);
      }
    }

    res.status(200).json({
      success: true,
      data: filtered,
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
 * POST /api/reservations
 * CUSTOMER AUTH - Create a new reservation
 * Body: { tableId, date, time, guestCount, customerNote? }
 */
export async function createReservation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.customer) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "NOT_AUTHENTICATED",
      });
      return;
    }

    const body = createReservationSchema.parse(req.body);

    const reservedDate = new Date(body.date);
    // Parse time for validation
    const [_hour, _minute] = body.time.split(":").map(Number);

    // Check if table is available
    const available = await isTableAvailable(
      body.tableId,
      reservedDate,
      body.time,
      body.guestCount,
    );

    if (!available) {
      res.status(400).json({
        success: false,
        error: "Table is not available for the requested date and time",
        code: "TABLE_NOT_AVAILABLE",
      });
      return;
    }

    // Create reservation
    const reservation = await prisma.reservation.create({
      data: {
        userId: req.customer.id,
        tableId: body.tableId,
        reservedDate,
        reservedTime: new Date(`2000-01-01T${body.time}:00`),
        guestCount: body.guestCount,
        customerNote: body.customerNote,
        status: "pending",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            location: true,
          },
        },
      },
    });

    console.log(
      `[Reservation] ✅ Created reservation #${reservation.id} for user #${req.customer.id}`,
    );

    // Emit Socket.IO event to staff receptionist room
    console.log(
      `[Socket.IO] 📡 Before emit - Broadcasting to room: staff:receptionist`,
    );

    try {
      io.to("staff:receptionist").emit("new-reservation", {
        reservationId: reservation.id,
        userId: reservation.userId,
        userName: reservation.user?.name || "",
        tableId: reservation.tableId,
        tableNumber: reservation.table?.tableNumber || "",
        date: reservation.reservedDate.toISOString(),
        time: reservation.reservedTime.toISOString(),
        guestCount: reservation.guestCount,
        customerNote: reservation.customerNote || "",
      });

      console.log(
        `[Socket.IO] ✅ Emitted new-reservation event to staff:receptionist`,
      );
    } catch (error) {
      console.error(`[Socket.IO] ❌ Failed to emit event:`, error);
    }

    res.status(201).json({
      success: true,
      data: reservation,
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
 * GET /api/reservations
 * RECEPTIONIST/MANAGER - Get all reservations with optional filters
 * Query params: status?, date?, customerId?
 */
export async function getReservations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "NOT_AUTHENTICATED",
      });
      return;
    }

    const query = getReservationsSchema.parse({
      status: req.query.status,
      date: req.query.date,
      customerId: req.query.customerId
        ? Number(req.query.customerId)
        : undefined,
    });

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.date) {
      const dateObj = new Date(query.date);
      where.reservedDate = dateObj;
    }

    if (query.customerId) {
      where.userId = query.customerId;
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            location: true,
          },
        },
        confirmedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { reservedDate: "desc" },
    });

    res.status(200).json({
      success: true,
      data: reservations,
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
 * GET /api/reservations/my
 * CUSTOMER AUTH - Get current user's reservations
 */
export async function getMyReservations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.customer) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "NOT_AUTHENTICATED",
      });
      return;
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        userId: req.customer.id,
      },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            location: true,
          },
        },
        confirmedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { reservedDate: "desc" },
    });

    res.status(200).json({
      success: true,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/reservations/:id/confirm
 * RECEPTIONIST/MANAGER - Confirm a pending reservation
 * Body: { staffNote? }
 */
export async function confirmReservation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "NOT_AUTHENTICATED",
      });
      return;
    }

    const { id } = req.params;
    const reservationId = parseInt(id, 10);

    if (isNaN(reservationId)) {
      res.status(400).json({
        success: false,
        error: "Invalid reservation ID",
        code: "INVALID_RESERVATION_ID",
      });
      return;
    }

    const body = confirmReservationSchema.parse(req.body);

    // Check if reservation exists and is pending
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

    if (reservation.status !== "pending") {
      res.status(400).json({
        success: false,
        error: `Reservation is already ${reservation.status}`,
        code: "INVALID_STATUS",
      });
      return;
    }

    // Update reservation
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: "confirmed",
        confirmedById: req.user.id,
        staffNote: body.staffNote,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            location: true,
          },
        },
        confirmedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: updated,
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
 * PATCH /api/reservations/:id/cancel
 * CUSTOMER (own reservation) or RECEPTIONIST/MANAGER - Cancel a reservation
 * Body: { reason? }
 */
export async function cancelReservation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const reservationId = parseInt(id, 10);

    if (isNaN(reservationId)) {
      res.status(400).json({
        success: false,
        error: "Invalid reservation ID",
        code: "INVALID_RESERVATION_ID",
      });
      return;
    }

    const body = cancelReservationSchema.parse(req.body);

    // Check if reservation exists
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

    // Check authorization (customer can only cancel their own, staff can cancel anyone's)
    if (req.customer && req.customer.id !== reservation.userId) {
      res.status(403).json({
        success: false,
        error: "You can only cancel your own reservations",
        code: "FORBIDDEN",
      });
      return;
    }

    if (!req.customer && !req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "NOT_AUTHENTICATED",
      });
      return;
    }

    // Check if already cancelled or completed
    if (
      reservation.status === "cancelled" ||
      reservation.status === "completed"
    ) {
      res.status(400).json({
        success: false,
        error: `Reservation is already ${reservation.status}`,
        code: "INVALID_STATUS",
      });
      return;
    }

    // Update reservation
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: "cancelled",
        staffNote: body.reason,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            location: true,
          },
        },
        confirmedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: updated,
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

export default {
  getAvailableTables,
  createReservation,
  getReservations,
  getMyReservations,
  confirmReservation,
  cancelReservation,
};
