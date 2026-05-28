/**
 * Invoice Testing - Comprehensive Test Suite
 * Tests all 9 scenarios for invoice creation and cash payment flow
 *
 * Run: node test-invoice-flow.js
 */

const BASE_URL = "http://localhost:4000/api";

// Test data holders
let managerToken = null;
let receptionistToken = null;
let receptionistId = null;
let customerToken = null;
let customerId = null;
let tableId = null;
let sessionId1 = null;
let invoiceId1 = null;
let sessionId2 = null;
let invoiceId2 = null;
let orderId1 = null;

// Color output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(msg, color = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logTest(num, title) {
  log(`\n${"=".repeat(70)}`, "cyan");
  log(`TEST ${num}: ${title}`, "cyan");
  log(`${"=".repeat(70)}`, "cyan");
}

function logResult(passed, message) {
  if (passed) {
    log(`✓ ${message}`, "green");
  } else {
    log(`✗ ${message}`, "red");
  }
}

async function request(method, endpoint, body = null, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    const data = await res.json();
    return { status: res.status, data };
  } catch (error) {
    log(`Request error: ${error.message}`, "red");
    return { status: 0, data: null, error: error.message };
  }
}

async function setup() {
  log("\n📋 SETUP PHASE", "yellow");
  log("Getting test tokens and creating test data...", "yellow");

  // Login as manager (should already exist from seed)
  let authRes = await request("POST", "/auth/staff/login", {
    email: "manager@restaurant.com",
    password: "manager123",
  });

  if (authRes.status === 200 && authRes.data.success) {
    managerToken = authRes.data.data.token;
    log(`✓ Manager token obtained`, "green");
  } else {
    log(`✗ Failed to get manager token`, "red");
    log(`Response: ${JSON.stringify(authRes.data)}`, "red");
    process.exit(1);
  }

  // Create a receptionist account
  log("\n Creating receptionist account...", "yellow");
  // First try to create one
  const hash = require("crypto").randomBytes(4).toString("hex");
  const receptionistEmail = `receptionist-${hash}@test.com`;

  // We need to create receptionist through direct database or use manager API
  // For now, we'll use manager as receptionist for testing
  receptionistToken = managerToken;
  log(`✓ Using manager account as receptionist`, "green");

  // Register a customer
  log("\n Creating customer account...", "yellow");
  const customerHash = require("crypto").randomBytes(4).toString("hex");
  const customerRegRes = await request("POST", "/auth/customer/register", {
    name: "Test Customer",
    email: `customer-${customerHash}@test.com`,
    password: "customer123",
  });

  if (customerRegRes.status === 201 && customerRegRes.data.success) {
    customerToken = customerRegRes.data.data.token;
    customerId = customerRegRes.data.data.id;
    log(`✓ Customer created and logged in`, "green");
  } else {
    log(`✗ Failed to create customer`, "red");
  }

  // Get a table
  const tableRes = await request("GET", "/tables", null, receptionistToken);
  if (
    tableRes.status === 200 &&
    tableRes.data.success &&
    tableRes.data.data.length > 0
  ) {
    tableId = tableRes.data.data[0].id;
    log(`✓ Using table ID: ${tableId}`, "green");
  } else {
    log(`✗ Failed to get tables`, "red");
    process.exit(1);
  }

  // Create first session with orders
  log("\n📝 Creating session 1 with orders...", "yellow");
  const sessionRes = await request(
    "POST",
    `/tables/${tableId}/session`,
    {},
    receptionistToken,
  );

  if (
    (sessionRes.status === 201 || sessionRes.status === 200) &&
    sessionRes.data.success
  ) {
    sessionId1 = sessionRes.data.data.id;
    log(`✓ Session 1 created: ${sessionId1}`, "green");

    // Create orders for this session
    const orderRes = await request("POST", "/orders", {
      sessionId: sessionId1,
      items: [
        { menuItemId: 1, quantity: 2 },
        { menuItemId: 2, quantity: 1 },
      ],
    });

    if (orderRes.status === 201 && orderRes.data.success) {
      orderId1 = orderRes.data.data.id;
      log(`✓ Order 1 created: ${orderId1}`, "green");

      // Confirm and complete the order
      const confirmRes = await request(
        "PATCH",
        `/orders/${orderId1}/confirm`,
        {},
        receptionistToken,
      );

      if (confirmRes.status === 200) {
        log(`✓ Order confirmed`, "green");

        const completeRes = await request(
          "PATCH",
          `/orders/${orderId1}/complete`,
          {},
          receptionistToken,
        );

        if (completeRes.status === 200) {
          log(`✓ Order completed (served)`, "green");
        }
      }
    }
  } else {
    log(`✗ Failed to create session 1`, "red");
    log(JSON.stringify(sessionRes.data), "red");
  }
}

async function test1() {
  logTest(1, "Tạo hoá đơn không có discount");

  const res = await request(
    "POST",
    "/invoices",
    { sessionId: sessionId1 },
    receptionistToken,
  );

  logResult(res.status === 201, `Status: ${res.status} (expected 201)`);

  if (res.data.success) {
    const invoice = res.data.data;
    invoiceId1 = invoice.id;

    logResult(invoice.session_id === sessionId1, `Invoice sessionId matches`);
    logResult(
      invoice.discountPct === 0,
      `discountPct = 0 (actual: ${invoice.discountPct})`,
    );
    logResult(
      invoice.discount_amount === 0,
      `discount_amount = 0 (actual: ${invoice.discount_amount})`,
    );
    logResult(
      invoice.status === "unpaid",
      `status = "unpaid" (actual: ${invoice.status})`,
    );
    logResult(
      invoice.subtotal > 0,
      `subtotal > 0 (actual: ${invoice.subtotal})`,
    );
    logResult(
      Number(invoice.total) === Number(invoice.subtotal),
      `total = subtotal`,
    );

    log(`\n📊 Invoice 1 Details:`, "blue");
    log(`  ID: ${invoice.id}`, "blue");
    log(`  Subtotal: ${invoice.subtotal}`, "blue");
    log(`  Discount %: ${invoice.discountPct}`, "blue");
    log(`  Discount Amount: ${invoice.discount_amount}`, "blue");
    log(`  Total: ${invoice.total}`, "blue");
  } else {
    log(`Error: ${res.data.error}`, "red");
  }
}

async function test2() {
  logTest(2, "Tạo hoá đơn có discount 10%");

  // Create session 2
  const sessionRes = await request(
    "POST",
    `/tables/${tableId}/session`,
    {},
    receptionistToken,
  );

  if (
    (sessionRes.status === 201 || sessionRes.status === 200) &&
    sessionRes.data.success
  ) {
    sessionId2 = sessionRes.data.data.id;
    log(`✓ Session 2 created: ${sessionId2}`, "green");

    // Create orders for session 2
    const orderRes = await request("POST", "/orders", {
      sessionId: sessionId2,
      items: [
        { menuItemId: 1, quantity: 3 },
        { menuItemId: 3, quantity: 2 },
      ],
    });

    if (orderRes.status === 201 && orderRes.data.success) {
      const orderId = orderRes.data.data.id;
      log(`✓ Order created: ${orderId}`, "green");

      // Complete the order
      await request(
        "PATCH",
        `/orders/${orderId}/confirm`,
        {},
        receptionistToken,
      );
      await request(
        "PATCH",
        `/orders/${orderId}/complete`,
        {},
        receptionistToken,
      );
      log(`✓ Order completed (served)`, "green");

      // Now create invoice with 10% discount
      const invoiceRes = await request(
        "POST",
        "/invoices",
        { sessionId: sessionId2, discount_pct: 10 },
        receptionistToken,
      );

      logResult(invoiceRes.status === 201, `Status: ${invoiceRes.status}`);

      if (invoiceRes.data.success) {
        const invoice = invoiceRes.data.data;
        invoiceId2 = invoice.id;

        const expectedDiscountAmount = (invoice.subtotal * 10) / 100;
        const expectedTotal = invoice.subtotal - expectedDiscountAmount;

        logResult(invoice.discountPct === 10, `discountPct = 10`);
        logResult(
          Math.abs(Number(invoice.discount_amount) - expectedDiscountAmount) <
            0.01,
          `discount_amount = ${expectedDiscountAmount} (actual: ${invoice.discount_amount})`,
        );
        logResult(
          Math.abs(Number(invoice.total) - expectedTotal) < 0.01,
          `total = ${expectedTotal} (actual: ${invoice.total})`,
        );

        log(`\n📊 Invoice 2 Details:`, "blue");
        log(`  ID: ${invoice.id}`, "blue");
        log(`  Subtotal: ${invoice.subtotal}`, "blue");
        log(`  Discount %: ${invoice.discountPct}`, "blue");
        log(`  Discount Amount: ${invoice.discount_amount}`, "blue");
        log(`  Expected Total: ${expectedTotal}`, "blue");
        log(`  Actual Total: ${invoice.total}`, "blue");
      }
    }
  }
}

async function test3() {
  logTest(3, "Lấy hoá đơn theo id");

  const res = await request(
    "GET",
    `/invoices/${invoiceId1}`,
    null,
    receptionistToken,
  );

  logResult(res.status === 200, `Status: ${res.status}`);

  if (res.data.success) {
    const invoice = res.data.data;
    logResult(invoice.id === invoiceId1, `Invoice ID matches`);
    logResult(invoice.session !== undefined, `Session data included`);
    logResult(invoice.session.orders !== undefined, `Orders included`);
    logResult(invoice.payments !== undefined, `Payments array included`);

    log(`\n📊 Invoice with Related Data:`, "blue");
    log(`  Invoice ID: ${invoice.id}`, "blue");
    log(`  Status: ${invoice.status}`, "blue");
    log(`  Orders count: ${invoice.session.orders.length}`, "blue");
  } else {
    log(`Error: ${res.data.error}`, "red");
  }
}

async function test4() {
  logTest(4, "Lấy hoá đơn theo session");

  const res = await request(
    "GET",
    `/invoices/sessions/${sessionId1}/invoice`,
    null,
    receptionistToken,
  );

  logResult(res.status === 200, `Status: ${res.status}`);

  if (res.data.success) {
    const invoice = res.data.data;
    logResult(invoice.session_id === sessionId1, `Invoice sessionId matches`);
    logResult(invoice.id === invoiceId1, `Same invoice from Test 1`);
    log(`✓ Retrieved same invoice via session lookup`, "green");
  } else {
    log(`Error: ${res.data.error}`, "red");
  }
}

async function test5() {
  logTest(5, "Thanh toán tiền mặt (CRITICAL)");

  const res = await request(
    "POST",
    `/invoices/${invoiceId1}/pay/cash`,
    {},
    receptionistToken,
  );

  logResult(res.status === 200, `Status: ${res.status}`);

  if (res.data.success) {
    const invoice = res.data.data;
    logResult(invoice.status === "paid", `Invoice status = "paid"`);
    logResult(invoice.paid_at !== null, `paid_at timestamp set`);

    log(`\n💰 Payment Processed:`, "blue");
    log(`  Status: ${invoice.status}`, "blue");
    log(`  Paid At: ${invoice.paid_at}`, "blue");
    log(`  Amount: ${invoice.total}`, "blue");
    log(
      `\n⚠️  NEXT STEP: Check Prisma Studio for transaction consistency`,
      "yellow",
    );
  } else {
    log(`Error: ${res.data.error}`, "red");
  }
}

async function test6() {
  logTest(6, "Verify transaction atomic");

  log(`⚠️  MANUAL TEST: Open Prisma Studio and verify:`, "yellow");
  log(`    npx prisma studio`, "yellow");
  log(`\n  Check these tables with the data from Test 5:`, "yellow");
  log(`  1. invoices → id=${invoiceId1}`, "yellow");
  log(`     - status should be "paid"`, "yellow");
  log(`     - paid_at should have timestamp`, "yellow");
  log(`\n  2. payments → invoice_id=${invoiceId1}`, "yellow");
  log(`     - method should be "cash"`, "yellow");
  log(`     - status should be "success"`, "yellow");
  log(`\n  3. table_sessions → id=${sessionId1}`, "yellow");
  log(`     - status should be "closed"`, "yellow");
  log(`     - closed_at should have timestamp`, "yellow");
  log(`\n  4. tables → id=${tableId}`, "yellow");
  log(`     - status should be "cleaning"`, "yellow");
  log(`\n📋 If all 4 are correct → Transaction is ATOMIC ✓`, "green");
  log(`   If any is wrong → Transaction failed ✗`, "red");
}

async function test7() {
  logTest(7, "Thanh toán invoice đã paid (idempotency)");

  const res = await request(
    "POST",
    `/invoices/${invoiceId1}/pay/cash`,
    {},
    receptionistToken,
  );

  logResult(res.status === 400, `Status: ${res.status} (expected 400)`);

  if (!res.data.success) {
    logResult(
      res.data.error.includes("already") || res.data.error.includes("paid"),
      `Error mentions already paid: "${res.data.error}"`,
    );
    log(`✓ Correctly rejected duplicate payment attempt`, "green");
  } else {
    log(`✗ Should have rejected payment (invoice already paid)`, "red");
  }
}

async function test8() {
  logTest(8, "Tạo invoice khi session chưa có order nào served");

  // Create empty session
  const sessionRes = await request(
    "POST",
    `/tables/${tableId}/session`,
    {},
    receptionistToken,
  );

  if (
    (sessionRes.status === 201 || sessionRes.status === 200) &&
    sessionRes.data.success
  ) {
    const emptySessionId = sessionRes.data.data.id;

    // Try to create invoice without any orders
    const invoiceRes = await request(
      "POST",
      "/invoices",
      { sessionId: emptySessionId },
      receptionistToken,
    );

    logResult(
      invoiceRes.status === 400,
      `Status: ${invoiceRes.status} (expected 400)`,
    );

    if (!invoiceRes.data.success) {
      logResult(
        invoiceRes.data.error.includes("No served orders") ||
          invoiceRes.data.error.includes("không"),
        `Error message appropriate: "${invoiceRes.data.error}"`,
      );
      log(`✓ Correctly rejected empty invoice`, "green");
    }
  }
}

async function test9() {
  logTest(9, "Phân quyền: customer không tạo được invoice");

  if (!customerToken) {
    log(`⚠️  Skipped: No customer token available`, "yellow");
    return;
  }

  const res = await request(
    "POST",
    "/invoices",
    { sessionId: sessionId1 },
    customerToken,
  );

  logResult(res.status === 403, `Status: ${res.status} (expected 403)`);

  if (!res.data.success) {
    logResult(
      res.data.error.includes("receptionist") ||
        res.data.error.includes("forbidden"),
      `Error message mentions role: "${res.data.error}"`,
    );
    log(`✓ Correctly rejected customer request`, "green");
  } else {
    log(`✗ Should have rejected customer (403)`, "red");
  }
}

async function runAllTests() {
  log(`\n🚀 INVOICE TESTING SUITE`, "cyan");
  log(`API Base URL: ${BASE_URL}`, "cyan");

  try {
    await setup();

    await test1();
    await test2();
    await test3();
    await test4();
    await test5();
    await test6();
    await test7();
    await test8();
    await test9();

    log(`\n${"=".repeat(70)}`, "cyan");
    log(`✅ ALL TESTS COMPLETED`, "green");
    log(`${"=".repeat(70)}`, "cyan");
    log(`\n📊 Summary:`, "blue");
    log(`  Invoice 1: ${invoiceId1} (no discount) → PAID`, "blue");
    log(`  Invoice 2: ${invoiceId2} (10% discount) → UNPAID`, "blue");
    log(`\n💾 Check Prisma Studio for Test 6 atomic validation`, "yellow");
  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, "red");
    console.error(error);
  }
}

runAllTests();
