import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { getSocketService } from "../socket";

const prisma = new PrismaClient();

// ============ Validation Schemas ============

/**
 * Schema để validate item trong order
 * { menuItemId, quantity, note? }
 */
const orderItemSchema = z.object({
  menuItemId: z.number().int().positive("Menu item ID must be positive"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  note: z.string().optional(),
});

/**
 * Schema để validate tạo order mới
 * body: { items: OrderItemSchema[], note?: string }
 */
const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Order must have at least 1 item"),
  note: z.string().optional(),
});

/**
 * Schema để validate confirm/complete order
 */
const orderActionSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ============ Controllers ============

/**
 * POST /api/orders
 * Khách tại bàn gọi món (PUBLIC)
 * - Validate items tồn tại và đang available
 * - Tính unit_price từ menu_items.price tại thời điểm order
 * - Sau khi tạo: emit 'new-order' → room 'staff:receptionist'
 *
 * Body: { sessionId, items: [{ menuItemId, quantity, note }], note? }
 */
export async function createOrder(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Parse từ body
    const body = createOrderSchema.parse(req.body);
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

    // Validate menu items exist and are available
    const menuItemIds = body.items.map((item) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
      },
    });

    if (menuItems.length !== body.items.length) {
      res.status(400).json({
        success: false,
        error: "Some menu items not found",
        code: "INVALID_MENU_ITEMS",
      });
      return;
    }

    // Verify all items are available
    const unavailableItems = menuItems.filter(
      (item) => item.status !== "available",
    );
    if (unavailableItems.length > 0) {
      res.status(400).json({
        success: false,
        error: `Items not available: ${unavailableItems.map((i) => i.name).join(", ")}`,
        code: "ITEMS_UNAVAILABLE",
      });
      return;
    }

    // Create order with order items in transaction
    const order = await prisma.order.create({
      data: {
        sessionId,
        status: "pending",
        note: body.note || null,
        orderItems: {
          create: body.items.map((item) => {
            // Find unit price từ menu items
            const menuItem = menuItems.find((m) => m.id === item.menuItemId);
            return {
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              unitPrice: menuItem!.price,
              note: item.note || null,
            };
          }),
        },
      },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        session: true,
      },
    });

    // Emit to receptionist staff
    try {
      const socketService = getSocketService();
      socketService.emitToReceptionists("new-order", {
        orderId: order.id,
        sessionId: order.sessionId,
        tableId: order.session.tableId,
        itemCount: order.orderItems.length,
        totalPrice: order.orderItems.reduce(
          (sum, item) => sum + Number(item.unitPrice) * item.quantity,
          0,
        ),
        createdAt: order.createdAt,
      });
    } catch (error) {
      console.error("[Socket] Failed to emit new-order:", error);
      // Continue even if socket fails
    }

    res.status(201).json({
      success: true,
      data: {
        id: order.id,
        sessionId: order.sessionId,
        status: order.status,
        items: order.orderItems.map((item) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.unitPrice) * item.quantity,
          note: item.note,
        })),
        note: order.note,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        code: "VALIDATION_ERROR",
        details: error.errors,
      });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/sessions/:sessionId/orders
 * Lấy tất cả orders của 1 bàn (staff + customer)
 */
export async function getSessionOrders(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionId = Number(req.params.sessionId);

    if (!sessionId || isNaN(sessionId)) {
      res.status(400).json({
        success: false,
        error: "Invalid session ID",
        code: "INVALID_SESSION",
      });
      return;
    }

    // Verify session exists
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

    const orders = await prisma.order.findMany({
      where: { sessionId },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: orders.map((order) => ({
        id: order.id,
        sessionId: order.sessionId,
        status: order.status,
        items: order.orderItems.map((item) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.unitPrice) * item.quantity,
          note: item.note,
        })),
        note: order.note,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/orders/:id/confirm
 * Tiếp tân xác nhận order (receptionist only)
 * - Update status → 'confirmed'
 * - Emit 'order-confirmed' → room 'staff:kitchen' + 'table:{tableId}'
 */
export async function confirmOrder(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation = orderActionSchema.parse(req.params);

    // Get order with session info
    const order = await prisma.order.findUnique({
      where: { id: validation.id },
      include: {
        session: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: "Order not found",
        code: "ORDER_NOT_FOUND",
      });
      return;
    }

    if (order.status !== "pending") {
      res.status(400).json({
        success: false,
        error: `Order cannot be confirmed (current status: ${order.status})`,
        code: "INVALID_ORDER_STATUS",
      });
      return;
    }

    // Get user info from req if available
    const confirmedById = req.user?.id;

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: validation.id },
      data: {
        status: "confirmed",
        confirmedById: confirmedById,
      },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        session: true,
      },
    });

    // Emit to kitchen staff and table
    try {
      const socketService = getSocketService();
      const orderData = {
        orderId: updatedOrder.id,
        sessionId: updatedOrder.sessionId,
        tableId: updatedOrder.session.tableId,
        items: updatedOrder.orderItems.map((item) => ({
          name: item.menuItem.name,
          quantity: item.quantity,
          note: item.note,
        })),
        note: updatedOrder.note,
        confirmedAt: updatedOrder.updatedAt,
      };

      // Emit to kitchen
      socketService.emitToKitchen("order-confirmed", orderData);

      // Emit to table
      socketService.emitToTable(
        updatedOrder.session.tableId,
        "order-confirmed",
        {
          orderId: updatedOrder.id,
          status: "confirmed",
          confirmedAt: updatedOrder.updatedAt,
        },
      );
    } catch (error) {
      console.error("[Socket] Failed to emit order-confirmed:", error);
    }

    res.json({
      success: true,
      data: {
        id: updatedOrder.id,
        sessionId: updatedOrder.sessionId,
        status: updatedOrder.status,
        items: updatedOrder.orderItems.map((item) => ({
          id: item.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          note: item.note,
        })),
        confirmedAt: updatedOrder.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid order ID",
        code: "INVALID_ID",
      });
      return;
    }
    next(error);
  }
}

/**
 * PATCH /api/orders/:id/complete
 * Đánh dấu món xong (bếp báo xong, receptionist mark)
 * - Update status → 'served'
 * - Emit 'order-completed' → room 'table:{tableId}'
 */
export async function completeOrder(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation = orderActionSchema.parse(req.params);

    const order = await prisma.order.findUnique({
      where: { id: validation.id },
      include: {
        session: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: "Order not found",
        code: "ORDER_NOT_FOUND",
      });
      return;
    }

    if (order.status !== "confirmed") {
      res.status(400).json({
        success: false,
        error: `Order cannot be completed (current status: ${order.status})`,
        code: "INVALID_ORDER_STATUS",
      });
      return;
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: validation.id },
      data: {
        status: "served",
      },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        session: true,
      },
    });

    // Emit to table
    try {
      const socketService = getSocketService();
      socketService.emitToTable(
        updatedOrder.session.tableId,
        "order-completed",
        {
          orderId: updatedOrder.id,
          status: "served",
          items: updatedOrder.orderItems.map((item) => ({
            name: item.menuItem.name,
            quantity: item.quantity,
          })),
          completedAt: updatedOrder.updatedAt,
        },
      );
    } catch (error) {
      console.error("[Socket] Failed to emit order-completed:", error);
    }

    res.json({
      success: true,
      data: {
        id: updatedOrder.id,
        sessionId: updatedOrder.sessionId,
        status: updatedOrder.status,
        items: updatedOrder.orderItems.map((item) => ({
          id: item.id,
          name: item.menuItem.name,
          quantity: item.quantity,
        })),
        completedAt: updatedOrder.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid order ID",
        code: "INVALID_ID",
      });
      return;
    }
    next(error);
  }
}

/**
 * PATCH /api/orders/:id/cancel
 * Hủy order (receptionist only)
 */
export async function cancelOrder(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation = orderActionSchema.parse(req.params);

    const order = await prisma.order.findUnique({
      where: { id: validation.id },
      include: {
        session: true,
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: "Order not found",
        code: "ORDER_NOT_FOUND",
      });
      return;
    }

    // Can only cancel pending or confirmed orders
    if (!["pending", "confirmed"].includes(order.status)) {
      res.status(400).json({
        success: false,
        error: `Order cannot be cancelled (current status: ${order.status})`,
        code: "INVALID_ORDER_STATUS",
      });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: validation.id },
      data: {
        status: "cancelled",
      },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        session: true,
      },
    });

    // Emit to table
    try {
      const socketService = getSocketService();
      socketService.emitToTable(
        updatedOrder.session.tableId,
        "order-cancelled",
        {
          orderId: updatedOrder.id,
          reason: "Cancelled by staff",
          cancelledAt: updatedOrder.updatedAt,
        },
      );
    } catch (error) {
      console.error("[Socket] Failed to emit order-cancelled:", error);
    }

    res.json({
      success: true,
      data: {
        id: updatedOrder.id,
        sessionId: updatedOrder.sessionId,
        status: updatedOrder.status,
        cancelledAt: updatedOrder.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid order ID",
        code: "INVALID_ID",
      });
      return;
    }
    next(error);
  }
}
