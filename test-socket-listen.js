const { io } = require("socket.io-client");

console.log("🔌 Socket.IO Event Listener (Running for 30 seconds)");
console.log("📝 Listening for real-time order events...\n");

let eventCount = 0;

const socket = io("http://localhost:4000", {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
});

socket.on("connect", () => {
  console.log(`✅ Connected to Socket.IO: ${socket.id}\n`);
});

socket.on("connect_error", (error) => {
  console.error(`❌ Connection error: ${error.message}`);
});

socket.on("disconnect", (reason) => {
  console.log(`\n⛔ Disconnected: ${reason}`);
});

// Listen for all order events
socket.on("new-order", (data) => {
  eventCount++;
  console.log(`\n🔔 EVENT ${eventCount}: NEW ORDER RECEIVED`);
  console.log("   Data:", JSON.stringify(data, null, 2));
});

socket.on("order-confirmed", (data) => {
  eventCount++;
  console.log(`\n✅ EVENT ${eventCount}: ORDER CONFIRMED`);
  console.log("   Data:", JSON.stringify(data, null, 2));
});

socket.on("order-completed", (data) => {
  eventCount++;
  console.log(`\n🎉 EVENT ${eventCount}: ORDER COMPLETED`);
  console.log("   Data:", JSON.stringify(data, null, 2));
});

socket.on("order-cancelled", (data) => {
  eventCount++;
  console.log(`\n❌ EVENT ${eventCount}: ORDER CANCELLED`);
  console.log("   Data:", JSON.stringify(data, null, 2));
});

// Keep listening for 30 seconds
setTimeout(() => {
  console.log(`\n📊 Listener finished. Total events received: ${eventCount}`);
  socket.disconnect();
  process.exit(0);
}, 30000);
