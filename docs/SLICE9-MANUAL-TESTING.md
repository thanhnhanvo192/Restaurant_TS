# Slice 9: Manual Testing Guide

## Prerequisites

The API must be running:

```bash
cd apps/api
npm run dev
# Server runs on http://localhost:4000
```

Database is seeded with:

- Manager: `manager@restaurant.com` / `manager123`
- 8 Tables (T001-T008)
- 10 Menu Items (Appetizers, Main Dishes, Drinks)

## Quick Test Flow

### Step 1: Get Manager Token

```bash
curl -X POST http://localhost:4000/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@restaurant.com",
    "password": "manager123"
  }'
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Manager Account",
    "email": "manager@restaurant.com",
    "role": "manager",
    "token": "eyJhbGc..."
  }
}
```

**Save the token as:** `$TOKEN`

### Step 2: Create a Table Session

```bash
curl -X POST http://localhost:4000/api/tables/1/session \
  -H "Authorization: Bearer $TOKEN"
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "tableId": 1,
    "status": "open",
    "openedAt": "2026-05-28T07:00:00.000Z"
  }
}
```

**Save as:** `$SESSION_ID` = 1

### Step 3: Create an Order

```bash
curl -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": '$SESSION_ID',
    "items": [
      {"menuItemId": 1, "quantity": 2},
      {"menuItemId": 2, "quantity": 1}
    ]
  }'
```

Response includes:

```json
{
  "id": 1,
  "status": "pending",
  "orderItems": [
    { "id": 1, "menuItemId": 1, "quantity": 2, "unitPrice": 45000 },
    { "id": 2, "menuItemId": 2, "quantity": 1, "unitPrice": 55000 }
  ]
}
```

**Save as:** `$ORDER_ID` = 1
**Subtotal:** 2*45000 + 1*55000 = **145000**

### Step 4: Confirm Order

```bash
curl -X PATCH http://localhost:4000/api/orders/1/confirm \
  -H "Authorization: Bearer $TOKEN"
```

### Step 5: Complete Order (Mark as Served)

```bash
curl -X PATCH http://localhost:4000/api/orders/1/complete \
  -H "Authorization: Bearer $TOKEN"
```

Response should show:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "served"
  }
}
```

### Step 6: CREATE INVOICE - No Discount

```bash
curl -X POST http://localhost:4000/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 1
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "sessionId": 1,
    "subtotal": 145000,
    "discountPct": 0,
    "discountAmount": 0,
    "total": 145000,
    "status": "unpaid",
    "createdAt": "2026-05-28T07:00:00.000Z",
    "paidAt": null
  }
}
```

**Save as:** `$INVOICE_ID` = 1

### Step 7: Get Invoice

```bash
curl -X GET http://localhost:4000/api/invoices/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Full invoice with session, orders, payments

### Step 8: Get Invoice by Session

```bash
curl -X GET http://localhost:4000/api/invoices/sessions/1/invoice \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Same invoice data

### Step 9: PROCESS CASH PAYMENT

```bash
curl -X POST http://localhost:4000/api/invoices/1/pay/cash \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "sessionId": 1,
    "status": "paid",
    "total": 145000,
    "paidAt": "2026-05-28T07:00:01.000Z"
  }
}
```

### Step 10: Verify Transaction Atomicity

Open Prisma Studio:

```bash
cd apps/api
npx prisma studio
```

Check these tables for invoice `id=1`:

#### invoices table

```
id       | sessionId | status | total  | paidAt
1        | 1         | paid   | 145000 | 2026-05-28T07:00:01.000Z
```

#### payments table

```
id | invoiceId | method | amount | status
1  | 1         | cash   | 145000 | success
```

#### table_sessions table

```
id | tableId | status | closedAt
1  | 1       | closed | 2026-05-28T07:00:01.000Z
```

#### tables table

```
id | tableNumber | status
1  | T001        | cleaning
```

✅ **All 4 should show the updates → Transaction is ATOMIC**

### Step 11: Try to Pay Again (Idempotency Test)

```bash
curl -X POST http://localhost:4000/api/invoices/1/pay/cash \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Error:**

```json
{
  "success": false,
  "error": "Invoice cannot be paid: current status is 'paid'",
  "code": "INVALID_INVOICE_STATUS"
}
```

### Step 12: Test with Discount

Repeat steps 2-8 with a NEW session (e.g., tableId: 2):

Step 2b: Create session for table 2 → `$SESSION_ID2`
Step 3b: Create order → `$ORDER_ID2`
Step 4b-5b: Confirm & complete

Step 6b: CREATE INVOICE WITH 10% DISCOUNT

```bash
curl -X POST http://localhost:4000/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": '$SESSION_ID2',
    "discount_pct": 10
  }'
```

**Expected Calculation (example with subtotal 145000):**

- Subtotal: 145000
- Discount %: 10
- Discount Amount: 145000 \* 0.10 = **14500**
- Total: 145000 - 14500 = **130500**

### Step 13: Authorization Test - Customer

Register customer:

```bash
curl -X POST http://localhost:4000/api/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "email": "customer@test.com",
    "password": "customer123"
  }'
```

Try to create invoice as customer:

```bash
curl -X POST http://localhost:4000/api/invoices \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": 1}'
```

**Expected:**

```json
{
  "success": false,
  "error": "This action requires receptionist or manager role",
  "code": "FORBIDDEN_ROLE"
}
```

**Status: 403 Forbidden** ✅

## Troubleshooting

### Invoice returns "No served orders"

→ Make sure to PATCH `/orders/{id}/complete` to mark order as "served"

### Table shows "Table is being cleaned"

→ That table was already used for a paid session. Use a different table (id 2-8)

### "Invalid session ID"

→ Make sure you saved `$SESSION_ID` from the POST response

### Payment returns 500 error

→ Check if invoice ID is valid and invoice status is "unpaid"

## Socket.IO Events (Browser Console)

When running frontend, listen for:

```javascript
socket.on("invoice-paid", (data) => {
  console.log("Invoice paid:", data);
  // {
  //   invoiceId: 1,
  //   tableId: 1,
  //   tableNumber: "T001",
  //   amount: 145000,
  //   paidAt: "2026-05-28T07:00:01.000Z"
  // }
});
```

## Summary Checklist

- [ ] Test 1: Create invoice (no discount)
- [ ] Test 2: Create invoice (10% discount)
- [ ] Test 3: Get invoice by ID
- [ ] Test 4: Get invoice by sessionId
- [ ] Test 5: Process cash payment
- [ ] Test 6: Verify atomicity (Prisma Studio)
- [ ] Test 7: Duplicate payment rejected
- [ ] Test 8: Customer authorization denied
- [ ] Bonus: Monitor Socket.IO events

**All tests should PASS ✅**
