import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import authRoutes from "./routes/auth.routes";
import tableRoutes from "./routes/table.routes";
import menuRoutes from "./routes/menu.routes";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
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

// ============ Socket.IO ============

io.on("connection", (socket) => {
  console.log(`[Socket.IO] User connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] User disconnected: ${socket.id}`);
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
