import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { getSocketService } from "../socket";

const prisma = new PrismaClient();

// ============ Validation Schemas ============

/**
 * Schema để validate tạo invoice
 * { discount_pct?: number }
 */
const createInvoiceSchema = z.object({
  discount_pct: z.number().min(0).max(100).optional(),
});

/**
 * Schema để validate pay by cash
 * { invoice_id: number }
 */
const payByCashSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ============ Controllers ============

/**
 * POST /api/invoices
 * Tạo invoice từ all served order items của session
 * Receptionist only
 *
 * Body: { sessionId, discount_pct?: number }
 *
 * Flow:
 * 1. Lấy table session (phải open)
 * 2. Lấy tất cả order của session (status = 'served')
 * 3. Lấy tất cả order items
 * 4. Tính subtotal = sum(quantity * unit_price)
 * 5. Tính discount_amount = subtotal * (discount_pct / 100)
 * 6. Tính total = subtotal - discount_amount
 * 7. Dùng transaction: tạo invoice + payment record
 */
export async function createInvoice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate receptionist or manager role
    if (!req.user || (req.user.role !== "receptionist" && req.user.role !== "manager")) {
      res.status(403).json({
        success: false,
        error: "Only receptionist or manager can create invoice",
        code: "FORBIDDEN_ROLE",
      });
      return;
    }

    // Parse body
    const body = createInvoiceSchema.parse(req.body);
    const sessionId = Number(req.body.sessionId);

    if (!sessionId || isNaN(sessionId)) {
      res.status(400).json({
        success: false,
        error: "Invalid session ID",
        code: "INVALID_SESSION",
      });
      return;
    }

    // Verify table session exists and is open
    const tableSession = await prisma.tableSession.findUnique({
      where: { id: sessionId },
    });

    if (!tableSession) {
      res.status(404).json({
        success: false,
        error: "Table session not found",
        code: "SESSION_NOT_FOUND",
      });
      return;
    }

    if (tableSession.status !== "open") {
      res.status(400).json({
        success: false,
        error: "Table session is closed",
        code: "SESSION_CLOSED",
      });
      return;
    }

    // Lấy tất cả orders của session với status = 'served'
    const orders = await prisma.order.findMany({
      where: {
        sessionId: sessionId,
        status: "served",
      },
      include: {
        orderItems: true,
      },
    });

    if (orders.length === 0) {
      res.status(400).json({
        success: false,
        error: "No served orders found in this session",
        code: "NO_SERVED_ORDERS",
      });
      return;
    }

    // Tính subtotal
    let subtotal = 0;
    orders.forEach((order) => {
      order.orderItems.forEach((item) => {
        subtotal += Number(item.quantity) * Number(item.unitPrice);
      });
    });

    // Tính discount
    const discountPct = body.discount_pct || 0;
    const discountAmount = (subtotal * discountPct) / 100;
    const total = subtotal - discountAmount;

    // Tạo invoice + payment record trong transaction
    const invoice = await prisma.$transaction(async (tx: any) => {
      // Upsert invoice (nếu đã tồn tại thì update lại thông tin mới nhất)
      const newInvoice = await tx.invoice.upsert({
        where: { sessionId: sessionId },
        create: {
          sessionId: sessionId,
          createdById: req.user!.id,
          subtotal: subtotal,
          discountPct: discountPct,
          discountAmount: discountAmount,
          total: total,
          status: "unpaid",
        },
        update: {
          subtotal: subtotal,
          discountPct: discountPct,
          discountAmount: discountAmount,
          total: total,
          createdById: req.user!.id,
        },
        include: {
          session: {
            include: {
              table: true,
            },
          },
          createdBy: true,
          payments: true,
        },
      });

      return newInvoice;
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/invoices/:id
 * Lấy thông tin invoice theo ID
 * Staff only
 */
export async function getInvoice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Verify staff token
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      });
      return;
    }

    const invoiceId = Number(req.params.id);

    if (!invoiceId || isNaN(invoiceId)) {
      res.status(400).json({
        success: false,
        error: "Invalid invoice ID",
        code: "INVALID_INVOICE_ID",
      });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        session: {
          include: {
            table: true,
            orders: {
              include: {
                orderItems: {
                  include: {
                    menuItem: true,
                  },
                },
              },
            },
          },
        },
        createdBy: true,
        payments: true,
      },
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: "Invoice not found",
        code: "INVOICE_NOT_FOUND",
      });
      return;
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/sessions/:sessionId/invoice
 * Lấy invoice của table session
 * Staff only
 */
export async function getSessionInvoice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Verify staff token
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      });
      return;
    }

    const sessionId = Number(req.params.sessionId);

    if (!sessionId || isNaN(sessionId)) {
      res.status(400).json({
        success: false,
        error: "Invalid session ID",
        code: "INVALID_SESSION_ID",
      });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { sessionId: sessionId },
      include: {
        session: {
          include: {
            table: true,
            orders: {
              include: {
                orderItems: {
                  include: {
                    menuItem: true,
                  },
                },
              },
            },
          },
        },
        createdBy: true,
        payments: true,
      },
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: "Invoice not found for this session",
        code: "INVOICE_NOT_FOUND",
      });
      return;
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/invoices/:id/pay/cash
 * Thanh toán invoice bằng tiền mặt
 * Receptionist only
 *
 * Flow:
 * 1. Verify invoice exists và status = 'unpaid'
 * 2. Trong transaction:
 *    a. Tạo payment record (method: 'cash', status: 'success')
 *    b. Update invoice: status → 'paid', paid_at = now()
 *    c. Close table session: status → 'closed'
 *    d. Update table status → 'cleaning'
 * 3. Emit 'invoice-paid' → room 'staff:receptionist'
 */
export async function payByCash(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate receptionist or manager role
    if (!req.user || (req.user.role !== "receptionist" && req.user.role !== "manager")) {
      res.status(403).json({
        success: false,
        error: "Only receptionist or manager can process cash payment",
        code: "FORBIDDEN_ROLE",
      });
      return;
    }

    const body = payByCashSchema.parse(req.params);
    const invoiceId = body.id;

    // Verify invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        session: true,
      },
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: "Invoice not found",
        code: "INVOICE_NOT_FOUND",
      });
      return;
    }

    if (invoice.status !== "unpaid") {
      res.status(400).json({
        success: false,
        error: `Invoice cannot be paid: current status is '${invoice.status}'`,
        code: "INVALID_INVOICE_STATUS",
      });
      return;
    }

    // Lấy table từ session
    const table = await prisma.table.findUnique({
      where: { id: invoice.session.tableId },
    });

    if (!table) {
      res.status(404).json({
        success: false,
        error: "Table not found",
        code: "TABLE_NOT_FOUND",
      });
      return;
    }

    // Transaction: payment + invoice + session + table
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Tạo payment record
      await tx.payment.create({
        data: {
          invoiceId: invoiceId,
          method: "cash",
          amount: invoice.total,
          status: "success",
        },
      });

      // 2. Update invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "paid",
          paidAt: new Date(),
        },
        include: {
          session: {
            include: {
              table: true,
              orders: true,
            },
          },
          createdBy: true,
          payments: true,
        },
      });

      // 3. Close table session
      await tx.tableSession.update({
        where: { id: invoice.session.id },
        data: {
          status: "closed",
          closedAt: new Date(),
        },
      });

      // 4. Update table status to cleaning
      await tx.table.update({
        where: { id: table.id },
        data: {
          status: "cleaning",
        },
      });

      return updatedInvoice;
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    // Emit Socket.IO event
    try {
      const socketService = getSocketService();
      socketService.emitToReceptionists("invoice-paid", {
        invoiceId: result.id,
        tableId: table.id,
        tableNumber: table.tableNumber,
        amount: result.total,
        paidAt: result.paidAt,
      });
      socketService.emitToReceptionists("table-status-changed", {
        tableId: table.id,
        status: "cleaning",
      });
    } catch (socketError) {
      console.error("Socket.IO emit error:", socketError);
      // Socket error không block response
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
