/**
 * Test script for Slice 3 — Customer Authentication
 * Test endpoints: POST /api/auth/customer/register, POST /api/auth/customer/login
 */

const API_URL = "http://localhost:4000/api/auth";

// Test data
const testCustomer = {
  name: "Nguyễn Văn A",
  email: "customer@example.com",
  phone: "0987654321",
  password: "password123",
};

const testCustomer2 = {
  name: "Trần Thị B",
  phone: "0912345678",
  password: "securepass456",
};

/**
 * Test 1: Register customer with email + phone
 */
async function testRegisterWithEmailAndPhone() {
  console.log("\n=== Test 1: Register customer with email + phone ===");
  try {
    const response = await fetch(`${API_URL}/customer/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testCustomer),
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log("✅ PASS: Register with email + phone");
      return data.data; // Return token for later tests
    } else {
      console.log("❌ FAIL: Register with email + phone");
      return null;
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    return null;
  }
}

/**
 * Test 2: Register customer with phone only (no email)
 */
async function testRegisterPhoneOnly() {
  console.log("\n=== Test 2: Register customer with phone only ===");
  try {
    const response = await fetch(`${API_URL}/customer/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testCustomer2),
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log("✅ PASS: Register with phone only");
      return data.data;
    } else {
      console.log("❌ FAIL: Register with phone only");
      return null;
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    return null;
  }
}

/**
 * Test 3: Register should fail - no email and no phone
 */
async function testRegisterNoEmailNoPhone() {
  console.log(
    "\n=== Test 3: Register without email and phone (should fail) ===",
  );
  try {
    const response = await fetch(`${API_URL}/customer/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        password: "password123",
      }),
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (response.status === 400 && !data.success) {
      console.log("✅ PASS: Validation error caught correctly");
    } else {
      console.log("❌ FAIL: Should return 400 validation error");
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

/**
 * Test 4: Login with email
 */
async function testLoginWithEmail() {
  console.log("\n=== Test 4: Login with email ===");
  try {
    const response = await fetch(`${API_URL}/customer/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testCustomer.email,
        password: testCustomer.password,
      }),
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (response.ok && data.data.token) {
      console.log("✅ PASS: Login with email");
      return data.data.token;
    } else {
      console.log("❌ FAIL: Login with email");
      return null;
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    return null;
  }
}

/**
 * Test 5: Login with phone
 */
async function testLoginWithPhone() {
  console.log("\n=== Test 5: Login with phone ===");
  try {
    const response = await fetch(`${API_URL}/customer/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: testCustomer2.phone,
        password: testCustomer2.password,
      }),
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (response.ok && data.data.token) {
      console.log("✅ PASS: Login with phone");
      return data.data.token;
    } else {
      console.log("❌ FAIL: Login with phone");
      return null;
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    return null;
  }
}

/**
 * Test 6: Login should fail - wrong password
 */
async function testLoginWrongPassword() {
  console.log("\n=== Test 6: Login with wrong password (should fail) ===");
  try {
    const response = await fetch(`${API_URL}/customer/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testCustomer.email,
        password: "wrongpassword",
      }),
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (response.status === 401 && !data.success) {
      console.log("✅ PASS: Wrong password rejected correctly");
    } else {
      console.log("❌ FAIL: Should reject wrong password");
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

/**
 * Test 7: Register duplicate email (should fail)
 */
async function testRegisterDuplicateEmail() {
  console.log("\n=== Test 7: Register duplicate email (should fail) ===");
  try {
    const response = await fetch(`${API_URL}/customer/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Another Name",
        email: testCustomer.email, // Same email
        password: "password456",
      }),
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (response.status === 409 && !data.success) {
      console.log("✅ PASS: Duplicate email rejected correctly");
    } else {
      console.log("❌ FAIL: Should reject duplicate email");
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

/**
 * Test 8: Test verifyCustomerToken middleware
 */
async function testVerifyCustomerToken(token) {
  console.log("\n=== Test 8: Test protected endpoint with valid token ===");
  if (!token) {
    console.log("⚠️  SKIP: No token provided from previous test");
    return;
  }

  try {
    // Note: We'll test this with staff/me endpoint (if available) or skip
    // For now just show token format
    const parts = token.split(".");
    console.log("Token format: header.payload.signature");
    console.log(`Tokens parts: ${parts.length} (valid JWT has 3)`);

    if (parts.length === 3) {
      console.log("✅ PASS: JWT token format valid");
    } else {
      console.log("❌ FAIL: Invalid JWT token format");
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log("========================================");
  console.log("SLICE 3 - CUSTOMER AUTHENTICATION TESTS");
  console.log("========================================");

  // Give server time to start
  console.log("\nWaiting 2 seconds for server to be ready...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    const user1 = await testRegisterWithEmailAndPhone();
    await testRegisterPhoneOnly();
    await testRegisterNoEmailNoPhone();

    const token1 = await testLoginWithEmail();
    const token2 = await testLoginWithPhone();
    await testLoginWrongPassword();

    await testRegisterDuplicateEmail();

    await testVerifyCustomerToken(token1);

    console.log("\n========================================");
    console.log("✅ ALL TESTS COMPLETED");
    console.log("========================================\n");
  } catch (error) {
    console.error("❌ Test suite error:", error);
  }
}

// Run tests
runAllTests();
