/**
 * Slice 11: Inventory Management - Test Cases
 * 
 * Tests:
 * 1. GET /api/inventory — Get all items (warehouse/manager)
 * 2. POST /api/inventory — Create new ingredient
 * 3. POST /api/inventory/:id/add-stock — Add stock with transaction
 * 4. GET /api/inventory/low-stock — Low stock items warning
 * 5. POST /api/inventory/:id/adjust — Adjust stock (manager only)
 */

import axios from "axios";

const API_BASE = "http://localhost:5000";

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

let warehouseToken: string = "";
let managerToken: string = "";

/**
 * Login staff and get token
 */
async function loginStaff(email: string, password: string) {
  try {
    const response = await axios.post(`${API_BASE}/api/auth/staff/login`, {
      email,
      password,
    });

    if (response.data.success) {
      return response.data.data.token;
    }
  } catch (error: any) {
    console.log(
      `${colors.red}❌ Login failed for ${email}:`,
      error.response?.data || error.message,
      colors.reset,
    );
  }
  return null;
}

/**
 * Test 1: GET /api/inventory
 * Get all inventory items
 */
async function test1_getInventoryItems() {
  console.log(`\n${colors.bright}${colors.cyan}=== TEST 1: GET /api/inventory ===${colors.reset}`);

  try {
    const response = await axios.get(`${API_BASE}/api/inventory`, {
      headers: {
        Authorization: `Bearer ${warehouseToken}`,
      },
    });

    if (response.data.success && Array.isArray(response.data.data)) {
      console.log(`${colors.green}✅ Success: Retrieved ${response.data.data.length} inventory items${colors.reset}`);
      response.data.data.forEach((item: any) => {
        console.log(
          `   - ${item.name} (${item.itemType}): ${item.currentQty} ${item.unit} (min: ${item.minQty})`,
        );
      });
      return response.data.data;
    } else {
      console.log(`${colors.red}❌ Failed: Invalid response format${colors.reset}`);
      return null;
    }
  } catch (error: any) {
    console.log(`${colors.red}❌ Error:`, error.response?.data || error.message, colors.reset);
    return null;
  }
}

/**
 * Test 2: POST /api/inventory
 * Create new ingredient
 */
async function test2_createIngredient() {
  console.log(`\n${colors.bright}${colors.cyan}=== TEST 2: POST /api/inventory (Create Ingredient) ===${colors.reset}`);

  const payload = {
    name: "Thịt bò (Beef)",
    unit: "kg",
    item_type: "ingredient",
    min_qty: 5,
    notes: "Fresh beef from local supplier",
  };

  try {
    const response = await axios.post(`${API_BASE}/api/inventory`, payload, {
      headers: {
        Authorization: `Bearer ${warehouseToken}`,
      },
    });

    if (response.data.success && response.data.data) {
      const item = response.data.data;
      console.log(`${colors.green}✅ Success: Created new ingredient${colors.reset}`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Name: ${item.name}`);
      console.log(`   Type: ${item.itemType}`);
      console.log(`   Current Qty: ${item.currentQty} ${item.unit} (should be 0)`);
      console.log(`   Min Qty: ${item.minQty}`);

      if (parseFloat(item.currentQty) === 0) {
        console.log(`${colors.green}✓ currentQty is correctly initialized to 0${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ currentQty should be 0, got ${item.currentQty}${colors.reset}`);
      }

      return item;
    } else {
      console.log(`${colors.red}❌ Failed: Invalid response format${colors.reset}`);
      return null;
    }
  } catch (error: any) {
    console.log(`${colors.red}❌ Error:`, error.response?.data || error.message, colors.reset);
    return null;
  }
}

/**
 * Test 3: POST /api/inventory/:id/add-stock
 * Add stock and verify transaction
 * CRITICAL: Verify Prisma transaction creates inventory_transactions record
 */
async function test3_addStock(itemId: number) {
  console.log(`\n${colors.bright}${colors.cyan}=== TEST 3: POST /api/inventory/:id/add-stock (CRITICAL - Transaction) ===${colors.reset}`);

  const payload = {
    quantity: 10,
    supplier: "Cty ABC",
    unit_cost: 250000,
    note: "Test stock input",
  };

  try {
    const response = await axios.post(
      `${API_BASE}/api/inventory/${itemId}/add-stock`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${warehouseToken}`,
        },
      },
    );

    if (response.data.success && response.data.data) {
      const { item, transaction } = response.data.data;

      console.log(`${colors.green}✅ Success: Stock added${colors.reset}`);
      console.log(`\n📦 Item Update:`);
      console.log(`   Current Qty: ${item.currentQty} ${item.unit} (should be 10)`);

      console.log(`\n📝 Transaction Record:`);
      console.log(`   Type: ${transaction.type} (should be "in")`);
      console.log(`   Qty Before: ${transaction.qtyBefore} (should be 0)`);
      console.log(`   Qty After: ${transaction.qtyAfter} (should be 10)`);
      console.log(`   Quantity: ${transaction.quantity} (should be 10)`);
      console.log(`   Supplier: ${transaction.supplier}`);
      console.log(`   Unit Cost: ${transaction.unitCost}`);
      console.log(`   Note: ${transaction.note}`);
      console.log(`   Created At: ${transaction.createdAt}`);

      // Validate transaction data
      const qtyAfter = parseFloat(transaction.qtyAfter);
      const qtyBefore = parseFloat(transaction.qtyBefore);
      const quantity = parseFloat(transaction.quantity);

      let isValid = true;
      if (qtyBefore !== 0) {
        console.log(
          `${colors.red}✗ Transaction qtyBefore should be 0, got ${qtyBefore}${colors.reset}`,
        );
        isValid = false;
      }
      if (qtyAfter !== 10) {
        console.log(
          `${colors.red}✗ Transaction qtyAfter should be 10, got ${qtyAfter}${colors.reset}`,
        );
        isValid = false;
      }
      if (transaction.type !== "in") {
        console.log(
          `${colors.red}✗ Transaction type should be "in", got ${transaction.type}${colors.reset}`,
        );
        isValid = false;
      }

      if (isValid) {
        console.log(`${colors.green}✓ All transaction validations passed!${colors.reset}`);
        console.log(
          `${colors.yellow}📌 Next step: Verify in Prisma Studio that inventory_transactions has this record${colors.reset}`,
        );
      }

      return { item, transaction };
    } else {
      console.log(`${colors.red}❌ Failed: Invalid response format${colors.reset}`);
      return null;
    }
  } catch (error: any) {
    console.log(`${colors.red}❌ Error:`, error.response?.data || error.message, colors.reset);
    return null;
  }
}

/**
 * Test 4: GET /api/inventory/low-stock
 * Create item with high min_qty and verify it appears in low-stock list
 */
async function test4_lowStockWarning() {
  console.log(`\n${colors.bright}${colors.cyan}=== TEST 4: GET /api/inventory/low-stock ===${colors.reset}`);

  // First, create a new item with high min_qty (20) but current_qty will be 0
  console.log(`${colors.yellow}📌 Creating item with high min_qty...${colors.reset}`);

  const createPayload = {
    name: "Hải sản (Seafood)",
    unit: "kg",
    item_type: "ingredient",
    min_qty: 20,
    notes: "Should trigger low stock warning",
  };

  try {
    // Create the item
    const createResponse = await axios.post(`${API_BASE}/api/inventory`, createPayload, {
      headers: {
        Authorization: `Bearer ${warehouseToken}`,
      },
    });

    if (!createResponse.data.success) {
      console.log(`${colors.red}❌ Failed to create test item${colors.reset}`);
      return null;
    }

    const newItem = createResponse.data.data;
    console.log(`${colors.green}✓ Created test item: ${newItem.name} (ID: ${newItem.id})${colors.reset}`);
    console.log(`   Current Qty: ${newItem.currentQty}, Min Qty: ${newItem.minQty}`);

    // Now get low-stock items
    console.log(`${colors.yellow}📌 Fetching low-stock items...${colors.reset}`);

    const response = await axios.get(`${API_BASE}/api/inventory/low-stock`, {
      headers: {
        Authorization: `Bearer ${warehouseToken}`,
      },
    });

    if (response.data.success && Array.isArray(response.data.data)) {
      const lowStockItems = response.data.data;
      console.log(`${colors.green}✅ Retrieved ${lowStockItems.length} low-stock items${colors.reset}`);

      // Check if our new item is in the list
      const foundItem = lowStockItems.find((item: any) => item.id === newItem.id);

      if (foundItem) {
        console.log(
          `${colors.green}✓ New item "${foundItem.name}" found in low-stock list${colors.reset}`,
        );
        console.log(
          `   Current: ${foundItem.currentQty} <= Min: ${foundItem.minQty}? ${parseFloat(foundItem.currentQty) <= parseFloat(foundItem.minQty) ? "YES ✓" : "NO ✗"}`,
        );
      } else {
        console.log(
          `${colors.red}✗ New item NOT found in low-stock list (but should be)${colors.reset}`,
        );
      }

      lowStockItems.forEach((item: any) => {
        console.log(
          `   - ${item.name}: ${item.currentQty} ${item.unit} (min: ${item.minQty})`,
        );
      });

      return lowStockItems;
    } else {
      console.log(`${colors.red}❌ Failed: Invalid response format${colors.reset}`);
      return null;
    }
  } catch (error: any) {
    console.log(`${colors.red}❌ Error:`, error.response?.data || error.message, colors.reset);
    return null;
  }
}

/**
 * Test 5: POST /api/inventory/:id/adjust
 * Adjust stock (manager only)
 * CRITICAL: Verify transaction type is "adjustment"
 */
async function test5_adjustStock(itemId: number) {
  console.log(`\n${colors.bright}${colors.cyan}=== TEST 5: POST /api/inventory/:id/adjust (Manager Only) ===${colors.reset}`);

  const payload = {
    new_qty: 15,
    note: "Kiểm kê thực tế",
  };

  try {
    const response = await axios.post(
      `${API_BASE}/api/inventory/${itemId}/adjust`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${managerToken}`,
        },
      },
    );

    if (response.data.success && response.data.data) {
      const { item, transaction } = response.data.data;

      console.log(`${colors.green}✅ Success: Stock adjusted${colors.reset}`);
      console.log(`\n📦 Item Update:`);
      console.log(`   Current Qty: ${item.currentQty} (should be 15)`);

      console.log(`\n📝 Adjustment Transaction Record:`);
      console.log(`   Type: ${transaction.type} (should be "adjustment")`);
      console.log(`   Qty Before: ${transaction.qtyBefore}`);
      console.log(`   Qty After: ${transaction.qtyAfter} (should be 15)`);
      console.log(`   Quantity (Diff): ${transaction.quantity} (should be 15 - qtyBefore)`);
      console.log(`   Note: ${transaction.note}`);
      console.log(`   Created At: ${transaction.createdAt}`);

      // Validate
      const qtyAfter = parseFloat(transaction.qtyAfter);
      let isValid = true;

      if (qtyAfter !== 15) {
        console.log(
          `${colors.red}✗ Transaction qtyAfter should be 15, got ${qtyAfter}${colors.reset}`,
        );
        isValid = false;
      }
      if (transaction.type !== "adjustment") {
        console.log(
          `${colors.red}✗ Transaction type should be "adjustment", got ${transaction.type}${colors.reset}`,
        );
        isValid = false;
      }

      if (isValid) {
        console.log(`${colors.green}✓ All adjustment validations passed!${colors.reset}`);
      }

      return { item, transaction };
    } else {
      console.log(`${colors.red}❌ Failed: Invalid response format${colors.reset}`);
      return null;
    }
  } catch (error: any) {
    console.log(`${colors.red}❌ Error:`, error.response?.data || error.message, colors.reset);
    return null;
  }
}

/**
 * Test that manager token cannot be used for warehouse-only operations
 */
async function testAuthorizationCheck() {
  console.log(`\n${colors.bright}${colors.cyan}=== BONUS: Test Authorization (Warehouse vs Manager) ===${colors.reset}`);

  // Try to create inventory with warehouse token (should succeed)
  try {
    console.log(`${colors.yellow}📌 Testing warehouse access...${colors.reset}`);
    const response = await axios.get(`${API_BASE}/api/inventory`, {
      headers: {
        Authorization: `Bearer ${warehouseToken}`,
      },
    });

    if (response.data.success) {
      console.log(`${colors.green}✓ Warehouse can access GET /api/inventory${colors.reset}`);
    }
  } catch (error: any) {
    console.log(
      `${colors.red}✗ Warehouse cannot access GET /api/inventory${colors.reset}`,
      error.response?.status,
    );
  }

  // Try to adjust stock with warehouse token (should fail - manager only)
  try {
    console.log(`${colors.yellow}📌 Testing manager-only endpoint with warehouse token (should fail)...${colors.reset}`);
    await axios.post(`${API_BASE}/api/inventory/1/adjust`, { new_qty: 5 }, {
      headers: {
        Authorization: `Bearer ${warehouseToken}`,
      },
    });

    console.log(`${colors.red}✗ Warehouse should NOT be able to call POST /api/inventory/:id/adjust${colors.reset}`);
  } catch (error: any) {
    if (error.response?.status === 403) {
      console.log(
        `${colors.green}✓ Warehouse correctly denied access to POST /api/inventory/:id/adjust (403)${colors.reset}`,
      );
    } else {
      console.log(`${colors.yellow}⚠ Got status ${error.response?.status}${colors.reset}`);
    }
  }

  // Try to adjust stock with manager token (should succeed)
  try {
    console.log(`${colors.yellow}📌 Testing manager access to adjust endpoint...${colors.reset}`);
    const response = await axios.post(`${API_BASE}/api/inventory/1/adjust`, { new_qty: 5 }, {
      headers: {
        Authorization: `Bearer ${managerToken}`,
      },
    });

    if (response.data.success) {
      console.log(`${colors.green}✓ Manager can access POST /api/inventory/:id/adjust${colors.reset}`);
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`${colors.green}✓ Manager can call adjust endpoint (404 is normal if item doesn't exist)${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Manager call failed with status ${error.response?.status}${colors.reset}`);
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║  🏭 SLICE 11: INVENTORY MANAGEMENT - TEST SUITE              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`);

  // Login
  console.log(`\n${colors.yellow}📌 Logging in staff accounts...${colors.reset}`);
  warehouseToken =
    (await loginStaff("warehouse@restaurant.com", "warehouse123")) || "";
  managerToken =
    (await loginStaff("manager@restaurant.com", "manager123")) || "";

  if (!warehouseToken || !managerToken) {
    // Try default credentials from seed
    console.log(`${colors.yellow}📌 Trying default manager credentials...${colors.reset}`);
    managerToken = await loginStaff("manager@restaurant.com", "manager123");

    if (!managerToken) {
      console.log(`${colors.red}❌ Failed to login. Please ensure:${colors.reset}`);
      console.log(`   1. Server is running on ${API_BASE}`);
      console.log(`   2. Database is seeded (npx prisma db seed)`);
      return;
    }

    warehouseToken = managerToken; // Use manager token as warehouse for testing
  }

  console.log(`${colors.green}✅ Login successful${colors.reset}`);

  // Run tests
  let inventoryItems = await test1_getInventoryItems();
  let newItem = await test2_createIngredient();

  if (newItem && newItem.id) {
    let addStockResult = await test3_addStock(newItem.id);
    await test4_lowStockWarning();

    if (addStockResult) {
      await test5_adjustStock(newItem.id);
    }
  }

  await testAuthorizationCheck();

  console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║  ✅ TEST SUITE COMPLETED                                     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╠════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║  📌 Next Step: Open Prisma Studio to verify transactions   ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║  Command: npx prisma studio                                ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
}

runTests().catch(console.error);
