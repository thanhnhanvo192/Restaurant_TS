#!/usr/bin/env node

const http = require("http");

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL("http://localhost:4000" + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { "Content-Type": "application/json" },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ error: data });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function findOpenSession() {
  console.log("🔍 Finding available table for session...\n");

  for (let tableId = 1; tableId <= 15; tableId++) {
    const resp = await makeRequest("POST", `/api/tables/${tableId}/session`);

    if (resp.success) {
      console.log(`✅ Table ${tableId}: Session opened`);
      console.log(`   Session ID: ${resp.data.id}`);
      console.log(`   Table: ${resp.data.table.tableNumber}`);
      return resp.data.id;
    } else {
      console.log(`❌ Table ${tableId}: ${resp.error} (${resp.code})`);
    }
  }

  return null;
}

async function testOrderAPI(sessionId) {
  if (!sessionId) {
    console.error("\n❌ No available session found!");
    return;
  }

  console.log(`\n📋 Testing Order API with Session ${sessionId}\n`);

  // Test: Create order
  console.log("Creating test order...");
  const orderRes = await makeRequest("POST", "/api/orders", {
    sessionId: sessionId,
    items: [
      { menuItemId: 14, quantity: 2, note: "very hot" },
      { menuItemId: 15, quantity: 1 },
    ],
    note: "Extra utensils",
  });

  if (orderRes.success) {
    console.log("✅ Order created successfully!");
    console.log(`   Order ID: ${orderRes.data.id}`);
    console.log(`   Status: ${orderRes.data.status}`);
    console.log(`   Items: ${orderRes.data.items.length}`);

    orderRes.data.items.forEach((item) => {
      console.log(
        `     • ${item.name} x${item.quantity} @ ${item.unitPrice} (${item.id})`,
      );
    });
  } else {
    console.error("❌ Order creation failed:");
    console.log(`   Error: ${orderRes.error}`);
    console.log(`   Code: ${orderRes.code}`);
  }
}

(async () => {
  const sessionId = await findOpenSession();
  await testOrderAPI(sessionId);
})();
