const { io } = require("socket.io-client");

console.log("🔌 Testing Socket.IO Connection...");
console.log("📝 Development Mode: Connecting without token");
console.log("");

// Terminal 1: Receptionist listen
const receptionist = io("http://localhost:4000", {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  // No token in development mode - server allows anonymous connections
});

receptionist.on("connect", () => {
  console.log("✅ Receptionist connected:", receptionist.id);
});

receptionist.on("connect_error", (error) => {
  console.error("❌ Connection error:", error.message);
});

receptionist.on("disconnect", (reason) => {
  console.log("⛔ Disconnected:", reason);
});

receptionist.on("new-order", (data) => {
  console.log("🔔 NEW ORDER:", JSON.stringify(data, null, 2));
});

receptionist.on("order-confirmed", (data) => {
  console.log("✅ ORDER CONFIRMED:", data);
});

// Keep process alive for testing
setTimeout(() => {
  receptionist.disconnect();
  process.exit(0);
}, 10000);
