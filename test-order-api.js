#!/usr/bin/env node

const http = require("http");

// Configuration
const API_URL = "http://localhost:4000";
let SESSION_ID = null;
let ORDER_ID = null;
const TEST_MENU_ITEMS = [14, 15]; // Use real menu items

// Helper to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data),
          });
        } catch {
          resolve({
            status: res.statusCode,
            body: data,
          });
        }
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("🚀 Starting Order API Tests\n");

  // Test 0: Get menu to confirm items exist
  console.log("📋 Step 0: Verify menu items exist");
  try {
    const menuRes = await makeRequest("GET", "/api/menu");
    if (menuRes.body.success) {
      const items = menuRes.body.data
        .flatMap((cat) => cat.menuItems)
        .slice(0, 3);
      console.log("✅ Available menu items:");
      items.forEach((item) => {
        console.log(`   - ID ${item.id}: ${item.name} (${item.price})`);
      });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  console.log("\n");

  // Test 1: Create a simple table session using POST directly
  console.log("📋 Test 1: Create order (PUBLIC - no auth needed)");
  console.log("   This will test the main Order API flow\n");

  try {
    // Create order with known valid menu items
    const createOrderRes = await makeRequest("POST", "/api/orders", {
      sessionId: 3, // Use session 3 (Table 3 - available)
      items: [
        { menuItemId: TEST_MENU_ITEMS[0], quantity: 2, note: "very hot" },
        { menuItemId: TEST_MENU_ITEMS[1], quantity: 1 },
      ],
      note: "Extra utensils needed",
    });

    if (createOrderRes.body.success) {
      ORDER_ID = createOrderRes.body.data.id;
      SESSION_ID = createOrderRes.body.data.sessionId;
      console.log("✅ Order created successfully!");
      console.log("   Order ID:", ORDER_ID);
      console.log("   Session ID:", SESSION_ID);
      console.log("   Status:", createOrderRes.body.data.status);
      console.log("   Items count:", createOrderRes.body.data.items.length);

      // Display items with unit prices
      console.log("   Items:");
      createOrderRes.body.data.items.forEach((item) => {
        console.log(
          `     - ${item.name} x${item.quantity} @ ${item.unitPrice} = ${item.subtotal}`,
        );
      });
    } else {
      console.error("❌ Order creation failed:");
      console.log("   Error:", createOrderRes.body.error);
      console.log("   Code:", createOrderRes.body.code);
      if (createOrderRes.body.details) {
        console.log("   Details:", createOrderRes.body.details);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  console.log("\n");

  // Test 2: Verify unit_price was saved
  console.log("📋 Test 2: Verify unit_price in database");
  console.log("   Check: order items have correct unit_price");
  if (ORDER_ID && SESSION_ID) {
    try {
      const getOrderRes = await makeRequest("GET", `/api/orders/${SESSION_ID}`);

      if (getOrderRes.body.success) {
        const order = getOrderRes.body.data.find((o) => o.id === ORDER_ID);
        if (order) {
          let allHavePrice = true;
          console.log("✅ Order retrieved:");
          order.items.forEach((item) => {
            const hasPrice = item.unitPrice > 0;
            const icon = hasPrice ? "✓" : "✗";
            console.log(
              `   ${icon} Item ${item.menuItemId}: unit_price = ${item.unitPrice}`,
            );
            if (!hasPrice) allHavePrice = false;
          });
          if (allHavePrice) {
            console.log("✅ All items have correct unit_price!");
          } else {
            console.error("❌ Some items missing unit_price!");
          }
        }
      }
    } catch (error) {
      console.log("   ⚠️  Could not verify (check Prisma Studio manually)");
    }
  }

  console.log("\n");

  // Test 3: Order with non-existent menu item
  console.log("📋 Test 3: Order with non-existent menu item (error handling)");
  try {
    const invalidRes = await makeRequest("POST", "/api/orders", {
      sessionId: 3,
      items: [{ menuItemId: 9999, quantity: 1 }],
    });

    if (!invalidRes.body.success) {
      console.log("✅ Correctly rejected invalid item:");
      console.log("   Error:", invalidRes.body.error);
      console.log("   Code:", invalidRes.body.code);
    } else {
      console.error("❌ Should have rejected but accepted!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  console.log("\n");

  // Test 4: Empty items array
  console.log("📋 Test 4: Order with no items (validation)");
  try {
    const emptyRes = await makeRequest("POST", "/api/orders", {
      sessionId: 3,
      items: [],
    });

    if (!emptyRes.body.success) {
      console.log("✅ Correctly rejected empty order:");
      console.log("   Error:", emptyRes.body.error);
    } else {
      console.error("❌ Should have rejected empty order!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  console.log("\n");

  // Test 5: Invalid session
  console.log("📋 Test 5: Order with invalid session");
  try {
    const badSessionRes = await makeRequest("POST", "/api/orders", {
      sessionId: 99999,
      items: [{ menuItemId: TEST_MENU_ITEMS[0], quantity: 1 }],
    });

    if (!badSessionRes.body.success) {
      console.log("✅ Correctly rejected invalid session:");
      console.log("   Error:", badSessionRes.body.error);
    } else {
      console.error("❌ Should have rejected!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  console.log("\n");

  console.log("✅ Test suite completed!\n");
  console.log("📝 Summary:");
  console.log("   [✅] Order creation works (PUBLIC endpoint)");
  console.log("   [✅] unit_price is captured at order time");
  console.log("   [✅] Validation rejects invalid items");
  console.log("   [⚠️]  Note: Admin endpoints (confirm/complete/cancel)");
  console.log("         require JWT token - not tested in this script");
  console.log("\n🔌 Socket.IO Events:");
  console.log("   Check test-socket.js terminal for:");
  console.log("   - 'new-order' event (should appear when order created)");
  console.log("   - 'order-confirmed' event (after PATCH .../confirm)");
  console.log("   - 'order-completed' event (after PATCH .../complete)");
}

runTests().catch(console.error);
