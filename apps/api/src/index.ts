import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import authRoutes from "./routes/auth.routes";
import tableRoutes from "./routes/table.routes";
import menuRoutes from "./routes/menu.routes";
import reservationRoutes from "./routes/reservation.routes";
import tableSessionRoutes from "./routes/tableSession.routes";
import { verifyToken } from "./utils/jwt";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// ============ Socket.IO Setup ============

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

// ============ Middleware ============

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files as static content
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ============ Routes ============

app.use("/api/auth", authRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api", tableSessionRoutes);

// ============ Basic Routes ============

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: "API is running",
      timestamp: new Date().toISOString(),
    },
  });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: "API is running",
      timestamp: new Date().toISOString(),
    },
  });
});

// ============ Socket.IO Handlers ============

io.on("connection", (socket) => {
  console.log(`[Socket.IO] ✅ User connected: ${socket.id}`);

  // Staff joining their role-specific rooms
  socket.on("join-room", async (data: { room: string; token?: string }) => {
    try {
      if (!data.room) {
        console.log(`[Socket.IO] ❌ ${socket.id} - Room name is required`);
        socket.emit("error", { message: "Room name is required" });
        return;
      }

      // Validate token for staff rooms
      if (data.room.startsWith("staff:")) {
        if (!data.token) {
          console.log(`[Socket.IO] ❌ ${socket.id} - No token for staff room`);
          socket.emit("error", {
            message: "Authentication required for staff rooms",
          });
          return;
        }

        try {
          const payload = await verifyToken(data.token);
          console.log(
            `[Socket.IO] ✅ Staff ${payload.id} (${payload.role}) joining: ${data.room}`,
          );
        } catch (error) {
          console.log(`[Socket.IO] ❌ ${socket.id} - Invalid token`);
          socket.emit("error", { message: "Invalid token" });
          return;
        }
      }

      socket.join(data.room);
      console.log(
        `[Socket.IO] ✅ ${socket.id} successfully joined room: ${data.room}`,
      );
      socket.emit("room-joined", { room: data.room, success: true });
    } catch (error) {
      console.error(
        `[Socket.IO] ❌ Error in join-room for ${socket.id}:`,
        error,
      );
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] ⛔ User disconnected: ${socket.id}`);
  });
});

// ============ Error Handling ============

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    code: "NOT_FOUND",
  });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
    code: err.code || "INTERNAL_ERROR",
  });
});

// ============ Server Start ============

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready`);
});

export { app, io };
