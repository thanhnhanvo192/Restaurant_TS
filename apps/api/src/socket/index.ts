import { Server, Socket } from "socket.io";
import { verifyToken, verifyUserToken, StaffTokenPayload, UserTokenPayload } from "../utils/jwt";

/**
 * Socket.IO Service
 * Manages real-time communication with rooms for different user types
 *
 * Room Assignments (per PRD):
 * - 'staff:receptionist' → Receptionist + Manager
 *   - Receives: new orders, table reservations, payment events
 * - 'staff:kitchen' → Receptionist + Manager
 *   - Receives: confirmed orders (receptionist confirms), cooking updates
 *   - Per PRD: Receptionist manages orders/payment, so they confirm orders to kitchen
 * - 'table:{tableId}' → Customers at specific table
 *   - Receives: order updates, completion notifications
 * - warehouse role → No staff rooms (inventory management only)
 */

interface AuthenticatedSocket extends Socket {
  user?: StaffTokenPayload;
  customer?: UserTokenPayload;
  sessionId?: number;
  tableId?: number;
}

class SocketService {
  private io: Server;
  private connectedUsers: Map<string, StaffTokenPayload | UserTokenPayload> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupMiddleware();
    this.setupConnectionHandler();
  }

  /**
   * Middleware để authenticate socket connection
   * Extract token từ query parameter hoặc auth headers
   * Verify JWT và attach user info vào socket
   *
   * Development mode: Allow anonymous connections with NODE_ENV=development
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.query.token ||
          socket.handshake.headers.authorization?.split(" ")[1];

        if (!token) {
          // Allow unauthenticated connections in development for testing
          if (process.env.NODE_ENV === "development") {
            console.log(
              "[Socket] ℹ️ Unauthenticated connection allowed (dev mode)",
            );
            socket.user = undefined;
            socket.customer = undefined;
            return next();
          }
          return next(new Error("Missing authentication token"));
        }

        // Verify token (attempt staff verification first, then customer verification)
        try {
          const payload = await verifyToken(token as string);
          socket.user = payload;
          this.connectedUsers.set(socket.id, payload);
        } catch (staffError: any) {
          if (
            staffError.message.includes("role is customer") ||
            staffError.message.includes("Invalid staff token")
          ) {
            const customerPayload = await verifyUserToken(token as string);
            socket.customer = customerPayload;
            this.connectedUsers.set(socket.id, customerPayload);
          } else {
            throw staffError;
          }
        }

        next();
      } catch (error) {
        next(new Error(`Authentication failed: ${(error as Error).message}`));
      }
    });
  }

  /**
   * Setup connection handler
   * - Join staff to appropriate rooms based on role
   * - Log connections
   * - Handle disconnections
   */
  private setupConnectionHandler(): void {
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      const user = socket.user;
      const customer = socket.customer;

      // In development mode, allow unauthenticated connections for testing
      if (!user && !customer && process.env.NODE_ENV !== "development") {
        socket.disconnect();
        return;
      }

      console.log(
        `[Socket] Client connected:`,
        socket.id,
        user ? `(Staff ${user.id}, ${user.role})` : (customer ? `(Customer ${customer.id})` : "(Anonymous - dev mode)"),
      );

      // In development mode, allow anonymous sockets to join receptionist room for testing
      if (!user && !customer) {
        console.log(
          `[Socket] Anonymous connection joining 'staff:receptionist' for testing`,
        );
        socket.join("staff:receptionist");
        socket.on("disconnect", () => {
          console.log(`[Socket] Anonymous client disconnected:`, socket.id);
        });
        return;
      }

      // Auto-join authenticated staff to role-based rooms
      if (user) {
        if (user.role === "receptionist") {
          // Receptionist: receives new orders + sends confirmations to kitchen
          // Per PRD: receptionist manages tables, orders, payments
          socket.join("staff:receptionist");
          socket.join("staff:kitchen");
          console.log(
            `[Socket] Receptionist ${user.id} joined 'staff:receptionist' and 'staff:kitchen'`,
          );
        } else if (user.role === "warehouse") {
          // Warehouse: only manages inventory - no real-time order/kitchen rooms
          // Per PRD: warehouse chỉ quản lý kho, không liên quan đến bếp hay orders
          console.log(
            `[Socket] Warehouse staff ${user.id} connected - no order/kitchen rooms (inventory only)`,
          );
        } else if (user.role === "manager") {
          // Manager: full access to all staff rooms
          socket.join("staff:receptionist");
          socket.join("staff:kitchen");
          console.log(
            `[Socket] Manager ${user.id} joined 'staff:receptionist' and 'staff:kitchen'`,
          );
        }
      }

      // Join customer to their specific user room for real-time status updates
      if (customer) {
        socket.join(`user:${customer.id}`);
        console.log(
          `[Socket] Customer ${customer.id} joined room 'user:${customer.id}'`,
        );
      }

      // Handle manual room join for customers (table sessions)
      socket.on("join-table", (tableId: number) => {
        socket.join(`table:${tableId}`);
        socket.tableId = tableId;
        const userId = user ? user.id : (customer ? customer.id : "anonymous");
        console.log(`[Socket] User ${userId} joined room 'table:${tableId}'`);
      });

      // Handle manual room leave for customers
      socket.on("leave-table", (tableId: number) => {
        socket.leave(`table:${tableId}`);
        const userId = user ? user.id : (customer ? customer.id : "anonymous");
        console.log(`[Socket] User ${userId} left room 'table:${tableId}'`);
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        this.connectedUsers.delete(socket.id);
        const userId = user ? user.id : (customer ? customer.id : "anonymous");
        console.log(`[Socket] User ${userId} disconnected:`, socket.id);
      });
    });
  }

  /**
   * Get Socket.IO instance
   * Used to access raw io methods if needed
   */
  getIO(): Server {
    return this.io;
  }

  /**
   * Emit event to receptionist staff
   * Used when new order or reservation created
   */
  emitToReceptionists(event: string, data: any): void {
    this.io.to("staff:receptionist").emit(event, data);
    console.log(`[Socket] Emit '${event}' to 'staff:receptionist':`, data);
  }

  /**
   * Emit event to kitchen staff
   * Used when order confirmed for cooking
   */
  emitToKitchen(event: string, data: any): void {
    this.io.to("staff:kitchen").emit(event, data);
    console.log(`[Socket] Emit '${event}' to 'staff:kitchen':`, data);
  }

  /**
   * Emit event to specific table
   * Used when order completed or status updated
   */
  emitToTable(tableId: number, event: string, data: any): void {
    this.io.to(`table:${tableId}`).emit(event, data);
    console.log(`[Socket] Emit '${event}' to 'table:${tableId}':`, data);
  }

  /**
   * Emit event to specific customer/user room
   * Used when reservation status updated
   */
  emitToUser(userId: number, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
    console.log(`[Socket] Emit '${event}' to 'user:${userId}':`, data);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
    console.log(`[Socket] Broadcast '${event}':`, data);
  }

  /**
   * Get all connected users
   */
  getConnectedUsers(): Map<string, StaffTokenPayload | UserTokenPayload> {
    return this.connectedUsers;
  }

  /**
   * Get number of connected clients in a room
   */
  getRoomSize(room: string): number {
    return this.io.sockets.adapter.rooms.get(room)?.size ?? 0;
  }
}

let socketService: SocketService | null = null;

/**
 * Initialize Socket.IO service
 * Call this once when setting up the Express server
 *
 * @param io Socket.IO server instance
 * @returns SocketService instance
 */
export function initializeSocket(io: Server): SocketService {
  if (!socketService) {
    socketService = new SocketService(io);
  }
  return socketService;
}

/**
 * Get Socket.IO service instance
 * Can be used in controllers to emit events
 */
export function getSocketService(): SocketService {
  if (!socketService) {
    throw new Error(
      "Socket service not initialized. Call initializeSocket first.",
    );
  }
  return socketService;
}

export type { AuthenticatedSocket, SocketService };
