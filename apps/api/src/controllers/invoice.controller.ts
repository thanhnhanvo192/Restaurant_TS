import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { getSocketService } from "../socket";
import {
  createPaymentUrl,
  verifyReturnUrl,
  verifyIpn,
} from "../services/vnpay.service";

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

/**
 * POST /api/invoices/:id/pay/vnpay
 * Tạo link thanh toán VNPay cho hóa đơn
 * Receptionist or Manager
 */
export async function createVnpayPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate receptionist or manager role
    if (!req.user || (req.user.role !== "receptionist" && req.user.role !== "manager")) {
      res.status(403).json({
        success: false,
        error: "Only receptionist or manager can generate VNPay payment URL",
        code: "FORBIDDEN_ROLE",
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

    // Verify invoice exists and is unpaid
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
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

    // Check if there is already an active pending payment for this invoice
    const pendingPayment = await prisma.payment.findFirst({
      where: {
        invoiceId: invoiceId,
        status: "pending",
      },
    });

    if (pendingPayment) {
      res.status(400).json({
        success: false,
        error: "There is already a pending payment for this invoice",
        code: "PENDING_PAYMENT_EXISTS",
      });
      return;
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoiceId,
        method: "vnpay",
        amount: invoice.total,
        status: "pending",
      },
    });

    // Client IP Address parsing
    const ipAddr = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    let ipAddress = Array.isArray(ipAddr) ? ipAddr[0] : ipAddr;
    if (ipAddress.includes(",")) {
      ipAddress = ipAddress.split(",")[0].trim();
    }
    if (ipAddress === "::1" || ipAddress === "::ffff:127.0.0.1") {
      ipAddress = "127.0.0.1";
    }

    const returnUrl = process.env.VNPAY_RETURN_URL || `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/vnpay-return`;

    const paymentUrl = createPaymentUrl({
      invoiceId: invoiceId,
      amount: Number(invoice.total),
      orderInfo: `Thanh toan hoa don #${invoiceId}`,
      ipAddr: ipAddress,
      returnUrl: returnUrl,
    });

    res.status(201).json({
      success: true,
      data: {
        paymentUrl,
        paymentId: payment.id,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/payments/vnpay/return
 * Xử lý kết quả redirect về từ VNPay (Public route)
 */
export async function handleVnpayReturn(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const verifyResult = verifyReturnUrl(req.query);

    const txnRef = verifyResult.transactionRef;
    const invoiceId = Number(txnRef.split("_")[0]);

    if (!verifyResult.isValid) {
      res.redirect(`${frontendUrl}/payment/failed?error=checksum_failed`);
      return;
    }

    if (verifyResult.responseCode !== "00") {
      // Cập nhật payment thành failed
      try {
        await prisma.payment.updateMany({
          where: {
            invoiceId: invoiceId,
            method: "vnpay",
            status: "pending",
          },
          data: {
            status: "failed",
            transactionId: verifyResult.transactionRef,
            gatewayResponse: req.query as any,
          },
        });
      } catch (updateError) {
        console.error("Failed to update payment status to failed in return:", updateError);
      }

      res.redirect(`${frontendUrl}/payment/failed?invoiceId=${invoiceId}`);
      return;
    }

    // Success -> Update database in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          session: {
            include: {
              table: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      if (invoice.status === "paid") {
        return invoice;
      }

      // 1. Update payment record
      const payment = await tx.payment.findFirst({
        where: {
          invoiceId: invoiceId,
          method: "vnpay",
          status: "pending",
        },
      });

      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "success",
            transactionId: verifyResult.transactionRef,
            gatewayResponse: req.query as any,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            invoiceId: invoiceId,
            method: "vnpay",
            amount: invoice.total,
            status: "success",
            transactionId: verifyResult.transactionRef,
            gatewayResponse: req.query as any,
          },
        });
      }

      // 2. Update invoice status
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
            },
          },
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
        where: { id: invoice.session.table.id },
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
        tableId: result.session.table.id,
        tableNumber: result.session.table.tableNumber,
        amount: result.total,
        paidAt: result.paidAt,
      });
      socketService.emitToReceptionists("table-status-changed", {
        tableId: result.session.table.id,
        status: "cleaning",
      });
    } catch (socketError) {
      console.error("Socket.IO emit error in return redirect handler:", socketError);
    }

    res.redirect(`${frontendUrl}/payment/success?invoiceId=${invoiceId}`);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/payments/vnpay/ipn
 * Xử lý server-to-server callback từ VNPay (Public route)
 */
export async function handleVnpayIpn(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const params = req.method === "POST" ? req.body : req.query;
    const verifyResult = verifyIpn(params);

    if (!verifyResult.isValid) {
      res.json({ RspCode: "97", Message: "Checksum failed" });
      return;
    }

    const txnRef = verifyResult.transactionRef;
    const invoiceId = Number(txnRef.split("_")[0]);

    if (!invoiceId || isNaN(invoiceId)) {
      res.json({ RspCode: "01", Message: "Order not found" });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      res.json({ RspCode: "01", Message: "Order not found" });
      return;
    }

    // Kiểm tra số tiền nhận được (đã chia 100) vs total hóa đơn
    if (Math.abs(Number(invoice.total) - verifyResult.amount) > 1) {
      res.json({ RspCode: "04", Message: "Invalid amount" });
      return;
    }

    if (invoice.status === "paid") {
      res.json({ RspCode: "02", Message: "Order already confirmed" });
      return;
    }

    if (verifyResult.responseCode !== "00") {
      // Giao dịch thất bại
      try {
        await prisma.payment.updateMany({
          where: {
            invoiceId: invoiceId,
            method: "vnpay",
            status: "pending",
          },
          data: {
            status: "failed",
            transactionId: verifyResult.transactionRef,
            gatewayResponse: params as any,
          },
        });
      } catch (updateError) {
        console.error("Failed to update payment status to failed in IPN:", updateError);
      }

      res.json({ RspCode: "00", Message: "Confirm Success" });
      return;
    }

    // Giao dịch thành công -> Xử lý database
    const result = await prisma.$transaction(async (tx: any) => {
      const currentInvoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          session: {
            include: {
              table: true,
            },
          },
        },
      });

      if (!currentInvoice) {
        throw new Error("Invoice not found");
      }

      if (currentInvoice.status === "paid") {
        return currentInvoice;
      }

      // 1. Update payment
      const payment = await tx.payment.findFirst({
        where: {
          invoiceId: invoiceId,
          method: "vnpay",
          status: "pending",
        },
      });

      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "success",
            transactionId: verifyResult.transactionRef,
            gatewayResponse: params as any,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            invoiceId: invoiceId,
            method: "vnpay",
            amount: currentInvoice.total,
            status: "success",
            transactionId: verifyResult.transactionRef,
            gatewayResponse: params as any,
          },
        });
      }

      // 2. Update invoice status
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
            },
          },
        },
      });

      // 3. Close table session
      await tx.tableSession.update({
        where: { id: currentInvoice.session.id },
        data: {
          status: "closed",
          closedAt: new Date(),
        },
      });

      // 4. Update table status to cleaning
      await tx.table.update({
        where: { id: currentInvoice.session.table.id },
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
        tableId: result.session.table.id,
        tableNumber: result.session.table.tableNumber,
        amount: result.total,
        paidAt: result.paidAt,
      });
      socketService.emitToReceptionists("table-status-changed", {
        tableId: result.session.table.id,
        status: "cleaning",
      });
    } catch (socketError) {
      console.error("Socket.IO emit error in IPN handler:", socketError);
    }

    res.json({ RspCode: "00", Message: "Confirm Success" });
  } catch (error) {
    console.error("VNPay IPN error:", error);
    res.json({ RspCode: "99", Message: "Unknow error" });
  }
}
