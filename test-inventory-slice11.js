#!/usr/bin/env node

const http = require("http");

// Configuration
const API_URL = "http://localhost:4000";
let WAREHOUSE_TOKEN = null;
let MANAGER_TOKEN = null;
let CREATED_ITEM_ID = null;
let CREATED_ITEM_ID_FOR_LOW_STOCK = null;

// ============ Helper Functions ============

function makeRequest(method, path, body = null, token = null) {
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

    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }

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

async function loginStaff(email, password) {
  console.log(`  🔐 Logging in as ${email}...`);
  const res = await makeRequest("POST", "/api/auth/staff/login", {
    email,
    password,
  });

  if (res.status === 200 && res.body.success) {
    console.log(`  ✅ Login successful! Token obtained.`);
    return res.body.data.token;
  } else {
    throw new Error(
      `Login failed: ${res.body.error || "Unknown error"} (${res.status})`,
    );
  }
}

// ============ Test Functions ============

async function setupAuth() {
  console.log("\n📚 SETUP: Getting authentication tokens\n");

  try {
    // Seed creates these credentials with password "manager123"
    WAREHOUSE_TOKEN = await loginStaff(
      "warehouse@restaurant.com",
      "manager123",
    );
    MANAGER_TOKEN = await loginStaff("manager@restaurant.com", "manager123");

    console.log("✅ Both tokens ready for testing\n");
  } catch (error) {
    console.error("❌ Auth setup failed:", error.message);
    process.exit(1);
  }
}

/**
 * TEST 1: Get all inventory items
 */
async function test1GetItems() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("TEST 1️⃣  — Lấy danh sách kho");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("GET /api/inventory");
  console.log("Header: Authorization: Bearer {warehouse_token}\n");

  try {
    const res = await makeRequest(
      "GET",
      "/api/inventory",
      null,
      WAREHOUSE_TOKEN,
    );

    if (res.status === 200 && res.body.success) {
      console.log(`✅ Status: ${res.status}`);
      console.log(`✅ Found ${res.body.data.length} items:\n`);
      res.body.data.forEach((item, idx) => {
        console.log(`   [${idx + 1}] ${item.name}`);
        console.log(
          `       - ID: ${item.id}, Type: ${item.itemType}, Unit: ${item.unit}`,
        );
        console.log(
          `       - Current: ${item.currentQty}${item.unit}, Min: ${item.minQty}${item.unit}`,
        );
      });
      console.log(
        "\n✅ TEST 1 PASSED: Retrieved inventory items successfully\n",
      );
      return true;
    } else {
      console.error(
        `❌ Failed: Status ${res.status}, Error: ${res.body.error}`,
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

/**
 * TEST 2: Create new inventory item
 */
async function test2CreateItem() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("TEST 2️⃣  — Tạo nguyên liệu mới");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("POST /api/inventory");
  console.log(
    "Body: { name: 'Thịt bò', unit: 'kg', item_type: 'ingredient', min_qty: 5 }\n",
  );

  try {
    const payload = {
      name: "Thịt bò",
      unit: "kg",
      item_type: "ingredient",
      min_qty: 5,
    };

    const res = await makeRequest(
      "POST",
      "/api/inventory",
      payload,
      WAREHOUSE_TOKEN,
    );

    if (res.status === 201 && res.body.success) {
      console.log(`✅ Status: ${res.status}`);
      const item = res.body.data;
      console.log(`✅ Item created successfully!`);
      console.log(`   - ID: ${item.id}`);
      console.log(`   - Name: ${item.name}`);
      console.log(`   - Type: ${item.itemType}`);
      console.log(`   - Current Qty: ${item.currentQty} (should be 0)`);
      console.log(`   - Min Qty: ${item.minQty}`);

      CREATED_ITEM_ID = item.id;

      if (parseFloat(item.currentQty) === 0) {
        console.log("\n✅ TEST 2 PASSED: Item created with current_qty = 0\n");
        return true;
      } else {
        console.log(
          `\n⚠️  WARNING: current_qty is ${item.currentQty}, expected 0\n`,
        );
        return false;
      }
    } else {
      console.error(
        `❌ Failed: Status ${res.status}, Error: ${res.body.error}`,
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

/**
 * TEST 3: Add stock (CRITICAL - verify transaction)
 */
async function test3AddStock() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("TEST 3️⃣  — Nhập kho (CRITICAL - verify transaction)");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`POST /api/inventory/${CREATED_ITEM_ID}/add-stock`);
  console.log(
    "Body: { quantity: 10, supplier: 'Cty ABC', unit_cost: 250000 }\n",
  );

  if (!CREATED_ITEM_ID) {
    console.error("❌ No item created. Run TEST 2 first.");
    return false;
  }

  try {
    const payload = {
      quantity: 10,
      supplier: "Cty ABC",
      unit_cost: 250000,
    };

    const res = await makeRequest(
      "POST",
      `/api/inventory/${CREATED_ITEM_ID}/add-stock`,
      payload,
      WAREHOUSE_TOKEN,
    );

    if (res.status === 201 && res.body.success) {
      console.log(`✅ Status: ${res.status}`);
      const { item, transaction } = res.body.data;

      console.log(`✅ Stock added successfully!`);
      console.log(`   Updated Item:`);
      console.log(`   - Current Qty: ${item.currentQty} (expected: 10)`);
      console.log(`   - Last Updated: ${item.updatedAt}`);

      console.log(`\n   Transaction Record:`);
      console.log(`   - ID: ${transaction.id}`);
      console.log(`   - Type: ${transaction.type} (expected: 'in')`);
      console.log(`   - Qty Before: ${transaction.qtyBefore} (expected: 0)`);
      console.log(`   - Qty After: ${transaction.qtyAfter} (expected: 10)`);
      console.log(`   - Quantity: ${transaction.quantity} (expected: 10)`);
      console.log(`   - Supplier: ${transaction.supplier}`);
      console.log(`   - Unit Cost: ${transaction.unitCost}`);
      console.log(`   - Created At: ${transaction.createdAt}`);

      const qtyMatch =
        parseFloat(item.currentQty) === 10 &&
        parseFloat(transaction.qtyBefore) === 0 &&
        parseFloat(transaction.qtyAfter) === 10;

      if (qtyMatch && transaction.type === "in") {
        console.log(
          "\n✅ TEST 3 PASSED: Transaction created correctly with proper qty tracking\n",
        );
        console.log(
          "📝 NOTE: Check Prisma Studio to verify inventory_transactions record:\n",
        );
        console.log("   Prisma Studio: npx prisma studio\n");
        return true;
      } else {
        console.log(
          "\n❌ TEST 3 FAILED: Qty mismatch or wrong transaction type\n",
        );
        return false;
      }
    } else {
      console.error(
        `❌ Failed: Status ${res.status}, Error: ${res.body.error}`,
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

/**
 * TEST 4: Check low stock warning
 */
async function test4LowStockWarning() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("TEST 4️⃣  — Kiểm tra cảnh báo tồn kho thấp");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("POST /api/inventory (create item with high min_qty)\n");
  console.log("GET /api/inventory/low-stock\n");

  try {
    // Step 1: Create item with min_qty > current_qty
    console.log(
      "Step 1: Creating item with min_qty=20 (higher than current)...\n",
    );
    const createPayload = {
      name: "Cà chua (Tomato)",
      unit: "kg",
      item_type: "ingredient",
      min_qty: 20,
    };

    const createRes = await makeRequest(
      "POST",
      "/api/inventory",
      createPayload,
      WAREHOUSE_TOKEN,
    );

    if (!createRes.body.success) {
      console.error("❌ Failed to create item:", createRes.body.error);
      return false;
    }

    CREATED_ITEM_ID_FOR_LOW_STOCK = createRes.body.data.id;
    console.log(
      `✅ Item created: ${createRes.body.data.name} (ID: ${CREATED_ITEM_ID_FOR_LOW_STOCK})`,
    );
    console.log(`   Current Qty: ${createRes.body.data.currentQty}`);
    console.log(`   Min Qty: ${createRes.body.data.minQty}`);

    // Step 2: Get low stock items
    console.log("\nStep 2: Fetching low stock items...\n");
    const lowStockRes = await makeRequest(
      "GET",
      "/api/inventory/low-stock",
      null,
      WAREHOUSE_TOKEN,
    );

    if (lowStockRes.status === 200 && lowStockRes.body.success) {
      const lowStockItems = lowStockRes.body.data;
      console.log(`✅ Found ${lowStockItems.length} items with low stock:\n`);

      const foundCreatedItem = lowStockItems.find(
        (item) => item.id === CREATED_ITEM_ID_FOR_LOW_STOCK,
      );

      if (foundCreatedItem) {
        console.log(`✅ Newly created item found in low stock list!`);
        console.log(`   - Name: ${foundCreatedItem.name}`);
        console.log(
          `   - Current: ${foundCreatedItem.currentQty}, Min: ${foundCreatedItem.minQty}`,
        );
        console.log(
          `   - Status: ⚠️  Low Stock (${foundCreatedItem.currentQty} <= ${foundCreatedItem.minQty})`,
        );
        console.log(
          "\n✅ TEST 4 PASSED: Low stock detection working correctly\n",
        );
        return true;
      } else {
        console.log(
          `❌ Created item NOT found in low stock list. Available items:`,
        );
        lowStockItems.forEach((item) => {
          console.log(
            `   - ${item.name} (ID: ${item.id}): ${item.currentQty}/${item.minQty}`,
          );
        });
        console.log("\n❌ TEST 4 FAILED\n");
        return false;
      }
    } else {
      console.error(
        `❌ Failed: Status ${lowStockRes.status}, Error: ${lowStockRes.body.error}`,
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

/**
 * TEST 5: Adjust stock (manager only)
 */
async function test5AdjustStock() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("TEST 5️⃣  — Điều chỉnh kho (manager only)");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`POST /api/inventory/${CREATED_ITEM_ID}/adjust`);
  console.log("Body: { new_qty: 15, note: 'Kiểm kê thực tế' }\n");

  if (!CREATED_ITEM_ID) {
    console.error("❌ No item created. Run TEST 2 first.");
    return false;
  }

  try {
    const payload = {
      new_qty: 15,
      note: "Kiểm kê thực tế",
    };

    const res = await makeRequest(
      "POST",
      `/api/inventory/${CREATED_ITEM_ID}/adjust`,
      payload,
      MANAGER_TOKEN,
    );

    if (res.status === 200 && res.body.success) {
      console.log(`✅ Status: ${res.status}`);
      const { item, transaction } = res.body.data;

      console.log(`✅ Stock adjusted successfully!`);
      console.log(`   Updated Item:`);
      console.log(`   - Current Qty: ${item.currentQty} (expected: 15)`);
      console.log(`   - Last Updated: ${item.updatedAt}`);

      console.log(`\n   Adjustment Transaction:`);
      console.log(`   - ID: ${transaction.id}`);
      console.log(`   - Type: ${transaction.type} (expected: 'adjustment')`);
      console.log(`   - Qty Before: ${transaction.qtyBefore} (expected: 10)`);
      console.log(`   - Qty After: ${transaction.qtyAfter} (expected: 15)`);
      console.log(
        `   - Quantity Change: ${transaction.quantity} (expected: 5)`,
      );
      console.log(`   - Note: ${transaction.note}`);
      console.log(`   - Created At: ${transaction.createdAt}`);

      const qtyMatch =
        parseFloat(item.currentQty) === 15 &&
        parseFloat(transaction.qtyBefore) === 10 &&
        parseFloat(transaction.qtyAfter) === 15 &&
        parseFloat(transaction.quantity) === 5;

      if (qtyMatch && transaction.type === "adjustment") {
        console.log(
          "\n✅ TEST 5 PASSED: Stock adjustment recorded correctly with adjustment transaction type\n",
        );
        console.log(
          "📝 NOTE: Verify in Prisma Studio that inventory_transactions shows:\n",
        );
        console.log("   - Two transactions for this item:");
        console.log("     1. 'in' type: 0 → 10");
        console.log("     2. 'adjustment' type: 10 → 15\n");
        return true;
      } else {
        console.log(
          "\n❌ TEST 5 FAILED: Qty mismatch or wrong transaction type\n",
        );
        return false;
      }
    } else {
      console.error(
        `❌ Failed: Status ${res.status}, Error: ${res.body.error}`,
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

/**
 * Test authorization - warehouse user trying to adjust (should fail)
 */
async function testAuthorizationCheck() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log(
    "🔐 AUTHORIZATION CHECK — Warehouse trying to adjust (should fail)",
  );
  console.log("═══════════════════════════════════════════════════════════");
  console.log(
    `POST /api/inventory/${CREATED_ITEM_ID}/adjust (with warehouse token)\n`,
  );

  if (!CREATED_ITEM_ID) {
    console.log("ℹ️  Skipping - no item created yet\n");
    return true;
  }

  try {
    const payload = {
      new_qty: 20,
      note: "Unauthorized attempt",
    };

    const res = await makeRequest(
      "POST",
      `/api/inventory/${CREATED_ITEM_ID}/adjust`,
      payload,
      WAREHOUSE_TOKEN,
    );

    if (res.status === 403) {
      console.log(`✅ Correctly rejected with 403: ${res.body.error}`);
      console.log("✅ Authorization check working correctly\n");
      return true;
    } else {
      console.error(`❌ Should have been rejected with 403, got ${res.status}`);
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

// ============ Main Test Runner ============

async function runAllTests() {
  console.log("\n");
  console.log(
    "╔═════════════════════════════════════════════════════════════╗",
  );
  console.log("║  🏪 SLICE 11 - INVENTORY MANAGEMENT TEST SUITE             ║");
  console.log("║  Testing: getItems, createItem, addStock, lowStock, adjust ║");
  console.log(
    "╚═════════════════════════════════════════════════════════════╝",
  );

  const results = {};

  try {
    // Auth setup
    await setupAuth();

    // Run tests
    results.test1 = await test1GetItems();
    results.test2 = await test2CreateItem();
    results.test3 = await test3AddStock();
    results.test4 = await test4LowStockWarning();
    results.test5 = await test5AdjustStock();
    results.authCheck = await testAuthorizationCheck();

    // Summary
    console.log("═══════════════════════════════════════════════════════════");
    console.log("📊 TEST SUMMARY");
    console.log(
      "═══════════════════════════════════════════════════════════\n",
    );

    const passed = Object.values(results).filter((v) => v).length;
    const total = Object.keys(results).length;

    Object.entries(results).forEach(([name, passed]) => {
      const status = passed ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} — ${name}`);
    });

    console.log(`\n📈 Result: ${passed}/${total} tests passed`);

    if (passed === total) {
      console.log("\n🎉 ALL TESTS PASSED!\n");
      process.exit(0);
    } else {
      console.log("\n⚠️  SOME TESTS FAILED\n");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ FATAL ERROR:", error.message);
    process.exit(1);
  }
}

runAllTests();
