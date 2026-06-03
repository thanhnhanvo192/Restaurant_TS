/**
 * Test Suite: Slice 12 - Statistics API
 *
 * This script:
 * 1. Logs in as manager to get token
 * 2. Logs in as receptionist to get token
 * 3. Runs all tests
 */

const API_BASE = "http://localhost:4000/api";

let MANAGER_TOKEN = "";
let RECEPTIONIST_TOKEN = "";

// ============ Step 0: Login to get tokens ============

async function getTokens() {
  console.log("=== GETTING TOKENS ===\n");

  try {
    // Manager login
    console.log("[Step 1] Manager login...");
    const managerRes = await fetch(`${API_BASE}/auth/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "manager@restaurant.com",
        password: "manager123",
      }),
    });
    const managerData = await managerRes.json();

    if (managerData.success && managerData.data.token) {
      MANAGER_TOKEN = managerData.data.token;
      console.log(
        `✅ Manager token obtained (${MANAGER_TOKEN.substring(0, 20)}...)\n`,
      );
    } else {
      console.log("❌ Failed to get manager token");
      console.log("Response:", JSON.stringify(managerData, null, 2));
      return false;
    }

    // Receptionist login
    console.log("[Step 2] Receptionist login...");
    const receptionistRes = await fetch(`${API_BASE}/auth/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "receptionist@restaurant.com",
        password: "manager123",
      }),
    });
    const receptionistData = await receptionistRes.json();

    if (receptionistData.success && receptionistData.data.token) {
      RECEPTIONIST_TOKEN = receptionistData.data.token;
      console.log(
        `✅ Receptionist token obtained (${RECEPTIONIST_TOKEN.substring(0, 20)}...)\n`,
      );
    } else {
      console.log("❌ Failed to get receptionist token");
      console.log("Response:", JSON.stringify(receptionistData, null, 2));
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Error getting tokens:", error.message);
    return false;
  }
}

// ============ Test 1: Revenue Summary ============

async function testRevenueSummary() {
  console.log("\n=== TEST 1: Revenue Summary ===");

  try {
    // Test today
    console.log("\n[Test 1.1] GET /stats/revenue?period=today");
    const res1 = await fetch(`${API_BASE}/stats/revenue?period=today`, {
      headers: { Authorization: `Bearer ${MANAGER_TOKEN}` },
    });
    const data1 = await res1.json();
    console.log("Status:", res1.status);
    console.log("Response:", JSON.stringify(data1, null, 2));

    if (data1.success) {
      const { total_revenue, total_orders, total_tables_served } = data1.data;
      console.log(`✅ total_revenue: ${total_revenue}`);
      console.log(`✅ total_orders: ${total_orders}`);
      console.log(`✅ total_tables_served: ${total_tables_served}`);

      // Manual verification: Run this in DB
      console.log("\n📋 MANUAL VERIFICATION - Run in MySQL to verify:");
      console.log(
        "  SELECT SUM(total) FROM invoices WHERE status='paid' AND DATE(paid_at)=CURDATE();",
      );
      console.log(
        "  SELECT COUNT(*) FROM orders WHERE status='served' AND DATE(created_at)=CURDATE();",
      );
      console.log(
        "  SELECT COUNT(DISTINCT session_id) FROM invoices WHERE status='paid' AND DATE(paid_at)=CURDATE();",
      );
    }

    // Test week
    console.log("\n[Test 1.2] GET /stats/revenue?period=week");
    const res2 = await fetch(`${API_BASE}/stats/revenue?period=week`, {
      headers: { Authorization: `Bearer ${MANAGER_TOKEN}` },
    });
    const data2 = await res2.json();
    console.log("Status:", res2.status);
    console.log("Data:", JSON.stringify(data2.data, null, 2));

    // Test month
    console.log("\n[Test 1.3] GET /stats/revenue?period=month");
    const res3 = await fetch(`${API_BASE}/stats/revenue?period=month`, {
      headers: { Authorization: `Bearer ${MANAGER_TOKEN}` },
    });
    const data3 = await res3.json();
    console.log("Status:", res3.status);
    console.log("Data:", JSON.stringify(data3.data, null, 2));

    console.log("✅ Revenue summary tests completed");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// ============ Test 2: Revenue Chart ============

async function testRevenueChart() {
  console.log("\n=== TEST 2: Revenue Chart ===");

  try {
    console.log("\n[Test 2.1] GET /stats/revenue-chart?days=7");
    const res = await fetch(`${API_BASE}/stats/revenue-chart?days=7`, {
      headers: { Authorization: `Bearer ${MANAGER_TOKEN}` },
    });
    const data = await res.json();
    console.log("Status:", res.status);

    if (data.success && Array.isArray(data.data)) {
      console.log(`✅ Returned ${data.data.length} items`);

      // Verify all dates are present
      console.log("\n📋 Date coverage check:");
      const today = new Date();
      const expectedDates = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        expectedDates.push(d.toISOString().split("T")[0]);
      }

      const returnedDates = data.data.map((item) => item.date);
      console.log("Expected dates:", expectedDates);
      console.log("Returned dates:", returnedDates);

      const allPresent = expectedDates.every((d) => returnedDates.includes(d));
      if (allPresent) {
        console.log("✅ All dates present (no gaps)");
      } else {
        console.log("❌ Missing dates detected!");
        const missing = expectedDates.filter((d) => !returnedDates.includes(d));
        console.log("Missing:", missing);
      }

      // Show sample items
      console.log("\n📊 Sample data (first 3 days):");
      data.data.slice(0, 3).forEach((item) => {
        console.log(
          `  ${item.date}: revenue=${item.revenue}, orders=${item.order_count}`,
        );
      });

      // Check for zero revenue days
      const zeroDays = data.data.filter((item) => item.revenue === 0);
      console.log(
        `\n📌 Days with zero revenue: ${zeroDays.length}/${data.data.length}`,
      );
    } else {
      console.log("❌ Response format invalid");
      console.log("Response:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// ============ Test 3: Top Items ============

async function testTopItems() {
  console.log("\n=== TEST 3: Top Items ===");

  try {
    console.log("\n[Test 3.1] GET /stats/top-items?limit=5");
    const res = await fetch(`${API_BASE}/stats/top-items?limit=5`, {
      headers: { Authorization: `Bearer ${MANAGER_TOKEN}` },
    });
    const data = await res.json();
    console.log("Status:", res.status);

    if (data.success && Array.isArray(data.data)) {
      console.log(`✅ Returned ${data.data.length} items`);

      if (data.data.length > 0) {
        console.log("\n📊 Top 5 items:");
        data.data.forEach((item, idx) => {
          console.log(
            `  ${idx + 1}. [ID:${item.menu_item_id}] ${item.name} (${item.category})`,
          );
          console.log(
            `     Quantity: ${item.total_quantity}, Revenue: ${item.total_revenue}`,
          );
        });
      } else {
        console.log("⚠️  No items returned (no data in database?)");
      }
    } else {
      console.log("❌ Response format invalid");
      console.log("Response:", JSON.stringify(data, null, 2));
    }

    // Test with date range
    console.log(
      "\n[Test 3.2] GET /stats/top-items?limit=10&from=2026-05-01&to=2026-06-03",
    );
    const res2 = await fetch(
      `${API_BASE}/stats/top-items?limit=10&from=2026-05-01&to=2026-06-03`,
      { headers: { Authorization: `Bearer ${MANAGER_TOKEN}` } },
    );
    const data2 = await res2.json();
    console.log("Status:", res2.status);
    if (data2.success) {
      console.log(`✅ Returned ${data2.data.length} items (with date range)`);
    } else {
      console.log("❌ Error:", data2.error);
    }

    console.log("✅ Top items tests completed");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// ============ Test 4: Permission Check ============

async function testPermissions() {
  console.log("\n=== TEST 4: Permission Check ===");

  try {
    console.log("\n[Test 4.1] Manager access (should succeed with 200)");
    const res1 = await fetch(`${API_BASE}/stats/revenue?period=today`, {
      headers: { Authorization: `Bearer ${MANAGER_TOKEN}` },
    });
    console.log("Status:", res1.status);
    if (res1.status === 200) {
      console.log("✅ Manager access allowed");
    } else {
      console.log("❌ Manager access denied (unexpected)");
    }

    console.log("\n[Test 4.2] Receptionist access (should fail with 403)");
    const res2 = await fetch(`${API_BASE}/stats/revenue?period=today`, {
      headers: { Authorization: `Bearer ${RECEPTIONIST_TOKEN}` },
    });
    const data2 = await res2.json();
    console.log("Status:", res2.status);
    console.log("Error code:", data2.code);

    if (res2.status === 403 && data2.code === "FORBIDDEN_ROLE") {
      console.log("✅ Receptionist correctly denied (403 FORBIDDEN_ROLE)");
    } else {
      console.log("❌ Permission check failed (unexpected response)");
      console.log("Response:", JSON.stringify(data2, null, 2));
    }

    console.log("\n[Test 4.3] No token (should fail with 401)");
    const res3 = await fetch(`${API_BASE}/stats/revenue?period=today`);
    const data3 = await res3.json();
    console.log("Status:", res3.status);
    console.log("Error code:", data3.code);

    if (res3.status === 401) {
      console.log("✅ Unauthenticated request correctly denied (401)");
    }

    console.log("✅ Permission tests completed");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// ============ Main ============

async function runAllTests() {
  console.log("🚀 Starting Slice 12 - Statistics API Tests\n");
  console.log("Make sure API is running on http://localhost:5000\n");

  // Get tokens first
  const tokensOk = await getTokens();
  if (!tokensOk) {
    console.log("\n❌ Could not obtain tokens. Aborting.");
    process.exit(1);
  }

  // Run all tests
  await testRevenueSummary();
  await testRevenueChart();
  await testTopItems();
  await testPermissions();

  console.log("\n=== ALL TESTS COMPLETED ===\n");
  console.log("✅ Check results above for any failures\n");
}

runAllTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
