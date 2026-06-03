# 📦 Inventory Management API — Quick Reference

## Base URL

```
http://localhost:4000/api/inventory
```

## Authentication

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer {token}
```

---

## Endpoints Overview

| Method | Path             | Role               | Purpose                                         |
| ------ | ---------------- | ------------------ | ----------------------------------------------- |
| GET    | `/`              | warehouse, manager | Get all items (optional filter by type)         |
| GET    | `/low-stock`     | warehouse, manager | Get items below minimum stock                   |
| POST   | `/`              | warehouse, manager | Create new inventory item                       |
| PATCH  | `/:id`           | warehouse, manager | Update item details                             |
| POST   | `/:id/add-stock` | warehouse, manager | Add stock (creates 'in' transaction)            |
| POST   | `/:id/adjust`    | **manager only**   | Adjust stock (creates 'adjustment' transaction) |
| GET    | `/transactions`  | warehouse, manager | Get transaction history                         |

---

## 1. GET All Items

```http
GET /api/inventory?type=ingredient
Authorization: Bearer {warehouse_token}
```

### Query Parameters

- `type` (optional): `ingredient` or `product`

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Tỏi (Garlic)",
      "unit": "kg",
      "itemType": "ingredient",
      "currentQty": "5.5",
      "minQty": "2",
      "notes": "Fresh garlic",
      "isActive": true,
      "createdAt": "2026-06-03T01:47:31.336Z",
      "updatedAt": "2026-06-03T01:47:31.336Z"
    }
  ]
}
```

---

## 2. GET Low Stock Items

```http
GET /api/inventory/low-stock
Authorization: Bearer {warehouse_token}
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 7,
      "name": "Cà chua (Tomato)",
      "unit": "kg",
      "itemType": "ingredient",
      "currentQty": "0",
      "minQty": "20"
    }
  ]
}
```

---

## 3. CREATE New Item

```http
POST /api/inventory
Authorization: Bearer {warehouse_token}
Content-Type: application/json

{
  "name": "Thịt bò",
  "unit": "kg",
  "item_type": "ingredient",
  "min_qty": 5,
  "notes": "Optional notes"
}
```

### Fields

- `name` (required): string, max 150 chars
- `unit` (required): string, max 30 chars (e.g., "kg", "liter", "piece")
- `item_type` (required): `"ingredient"` or `"product"`
- `min_qty` (required): number >= 0
- `notes` (optional): string

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": 6,
    "name": "Thịt bò",
    "unit": "kg",
    "itemType": "ingredient",
    "currentQty": "0",
    "minQty": "5",
    "notes": null,
    "isActive": true,
    "createdAt": "2026-06-03T01:47:50.682Z",
    "updatedAt": "2026-06-03T01:47:50.682Z"
  }
}
```

---

## 4. UPDATE Item Details

```http
PATCH /api/inventory/6
Authorization: Bearer {warehouse_token}
Content-Type: application/json

{
  "name": "Thịt bò nhập khẩu",
  "unit": "kg",
  "min_qty": 10,
  "notes": "Updated notes"
}
```

### Fields (all optional)

- `name`: string, max 150
- `unit`: string, max 30
- `item_type`: `"ingredient"` | `"product"`
- `min_qty`: number >= 0
- `notes`: string

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": 6,
    "name": "Thịt bò nhập khẩu",
    "currentQty": "10",
    "minQty": "10"
  }
}
```

---

## 5. ADD STOCK (Increase Inventory)

```http
POST /api/inventory/6/add-stock
Authorization: Bearer {warehouse_token}
Content-Type: application/json

{
  "quantity": 25,
  "supplier": "ABC Corp",
  "unit_cost": 250000,
  "note": "Batch delivery"
}
```

### Fields

- `quantity` (required): number > 0
- `supplier` (optional): string, max 150
- `unit_cost` (optional): number >= 0
- `note` (optional): string

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "item": {
      "id": 6,
      "currentQty": "35",
      "updatedAt": "2026-06-03T01:47:50.682Z"
    },
    "transaction": {
      "id": 16,
      "itemId": 6,
      "type": "in",
      "quantity": "25",
      "qtyBefore": "10",
      "qtyAfter": "35",
      "supplier": "ABC Corp",
      "unitCost": "250000",
      "note": "Batch delivery",
      "createdById": 2,
      "createdAt": "2026-06-03T01:47:50.687Z"
    }
  }
}
```

### What Happens

1. Creates `InventoryTransaction` record with `type: 'in'`
2. Updates `InventoryItem.currentQty`
3. Both operations in atomic Prisma transaction
4. Logs supplier, unit cost, and notes for audit

---

## 6. ADJUST STOCK (Manager Only)

```http
POST /api/inventory/6/adjust
Authorization: Bearer {manager_token}
Content-Type: application/json

{
  "new_qty": 30,
  "note": "Physical count verification"
}
```

### Fields

- `new_qty` (required): number >= 0
- `note` (optional): string

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "item": {
      "id": 6,
      "currentQty": "30",
      "updatedAt": "2026-06-03T01:47:50.706Z"
    },
    "transaction": {
      "id": 17,
      "itemId": 6,
      "type": "adjustment",
      "quantity": "-5",
      "qtyBefore": "35",
      "qtyAfter": "30",
      "note": "Physical count verification",
      "createdById": 1,
      "createdAt": "2026-06-03T01:47:50.707Z"
    }
  }
}
```

### What Happens

1. Creates `InventoryTransaction` record with `type: 'adjustment'`
2. Sets `currentQty` to exact value
3. Calculates difference and stores in `quantity` field
4. Requires manager role (warehouse will get 403)

### Warehouse User Attempt (403 Forbidden)

```json
{
  "success": false,
  "error": "Forbidden. Required role: manager",
  "code": "INSUFFICIENT_ROLE"
}
```

---

## 7. GET Transaction History

```http
GET /api/inventory/transactions?item_id=6&from=2026-06-01T00:00:00Z&to=2026-06-04T23:59:59Z
Authorization: Bearer {warehouse_token}
```

### Query Parameters

- `item_id` (optional): Filter by item ID
- `from` (optional): ISO datetime start
- `to` (optional): ISO datetime end

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 16,
      "itemId": 6,
      "type": "in",
      "quantity": "10",
      "qtyBefore": "0",
      "qtyAfter": "10",
      "supplier": "Cty ABC",
      "unitCost": "250000",
      "note": null,
      "createdById": 2,
      "createdAt": "2026-06-03T01:47:50.687Z",
      "item": {
        "name": "Thịt bò"
      },
      "createdBy": {
        "name": "Warehouse Staff",
        "role": "warehouse"
      }
    },
    {
      "id": 17,
      "itemId": 6,
      "type": "adjustment",
      "quantity": "5",
      "qtyBefore": "10",
      "qtyAfter": "15",
      "supplier": null,
      "unitCost": null,
      "note": "Kiểm kê thực tế",
      "createdById": 1,
      "createdAt": "2026-06-03T01:47:50.707Z",
      "item": {
        "name": "Thịt bò"
      },
      "createdBy": {
        "name": "Manager Account",
        "role": "manager"
      }
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request — Validation Error

```json
{
  "success": false,
  "error": "item_type must be 'ingredient' or 'product'",
  "code": "VALIDATION_ERROR"
}
```

### 401 Unauthorized — Missing Token

```json
{
  "success": false,
  "error": "Missing authorization header",
  "code": "MISSING_AUTH_HEADER"
}
```

### 403 Forbidden — Insufficient Role

```json
{
  "success": false,
  "error": "Forbidden. Required role: manager",
  "code": "INSUFFICIENT_ROLE"
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Inventory item not found",
  "code": "NOT_FOUND"
}
```

---

## Transaction Types

| Type         | Purpose                | Triggered By        | Quantity                     |
| ------------ | ---------------------- | ------------------- | ---------------------------- |
| `in`         | Stock received         | `addStock()`        | Always positive              |
| `out`        | Stock removed (future) | Reserved for future | Positive (qty decreased)     |
| `adjustment` | Manual correction      | `adjustStock()`     | Can be +/- (relative change) |

---

## Common Workflows

### Workflow 1: Receive Goods from Supplier

```bash
# 1. Create item if not exists
POST /api/inventory
{
  "name": "Thịt bò",
  "unit": "kg",
  "item_type": "ingredient",
  "min_qty": 5
}

# 2. Add received quantity
POST /api/inventory/6/add-stock
{
  "quantity": 50,
  "supplier": "ABC Meat Corp",
  "unit_cost": 250000
}

# Result: currentQty = 50
```

### Workflow 2: Physical Count & Correction

```bash
# 1. Get current qty
GET /api/inventory/6

# 2. Compare with physical count
# Physical count shows 45kg, system shows 50kg

# 3. Adjust to correct qty (manager only)
POST /api/inventory/6/adjust
{
  "new_qty": 45,
  "note": "Physical count 6/3/26 — 5kg difference found and recorded"
}

# Result: currentQty = 45, transaction type = adjustment
```

### Workflow 3: Monitor Low Stock

```bash
# Check items below minimum
GET /api/inventory/low-stock

# Response shows items where currentQty <= minQty
# Plan reorder accordingly
```

### Workflow 4: Audit Trail

```bash
# View all changes for item #6
GET /api/inventory/transactions?item_id=6

# See complete history: who changed what, when, why
# Timestamps enable accountability
```

---

## Test Commands

### Login as Warehouse

```bash
curl -X POST http://localhost:4000/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"email":"warehouse@restaurant.com","password":"manager123"}'
```

### Get All Items

```bash
curl -X GET http://localhost:4000/api/inventory \
  -H "Authorization: Bearer {token}"
```

### Create Item

```bash
curl -X POST http://localhost:4000/api/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name":"Thịt bò",
    "unit":"kg",
    "item_type":"ingredient",
    "min_qty":5
  }'
```

### Add Stock

```bash
curl -X POST http://localhost:4000/api/inventory/6/add-stock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {warehouse_token}" \
  -d '{
    "quantity":25,
    "supplier":"ABC",
    "unit_cost":250000
  }'
```

### Adjust Stock (Manager)

```bash
curl -X POST http://localhost:4000/api/inventory/6/adjust \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {manager_token}" \
  -d '{
    "new_qty":20,
    "note":"Physical count"
  }'
```

---

## Status Codes Summary

| Code | Meaning      | When                                       |
| ---- | ------------ | ------------------------------------------ |
| 200  | OK           | Successful GET, PATCH, POST (non-creation) |
| 201  | Created      | Successful POST (item creation)            |
| 400  | Bad Request  | Validation error in input                  |
| 401  | Unauthorized | Missing or invalid token                   |
| 403  | Forbidden    | Insufficient role for action               |
| 404  | Not Found    | Item/resource doesn't exist                |
| 500  | Server Error | Unexpected error                           |

---

## Best Practices

✅ **DO:**

- Log supplier information for traceability
- Use adjustment for physical count corrections
- Check low stock regularly for reordering
- Include notes for audit purposes
- Verify role permissions before requesting endpoints

❌ **DON'T:**

- Use addStock for negative quantities (use adjustment instead)
- Skip supplier info for reorder tracking
- Adjust stock without physical verification
- Forget to include timestamps in date filters
- Mix concerns (use dedicated endpoints)
