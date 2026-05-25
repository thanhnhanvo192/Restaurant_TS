# Testing Slice 3 — Customer Authentication

## Nhanh chóng

### 1️⃣ Start API server

```bash
cd apps/api
npm run dev
# Server sẽ chạy trên http://localhost:4000
```

### 2️⃣ Chạy test suite

```bash
# Từ root directory
node test-slice3.js
```

---

## Manual Testing (với curl/Postman)

### 📝 Test 1: Register với email + phone

```bash
curl -X POST http://localhost:4000/api/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nguyễn Văn A",
    "email": "customer@example.com",
    "phone": "0987654321",
    "password": "password123"
  }'
```

**Kỳ vọng:**

- Status: `201`
- Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "email": "customer@example.com",
    "phone": "0987654321",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 📝 Test 2: Register chỉ với phone (không email)

```bash
curl -X POST http://localhost:4000/api/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Trần Thị B",
    "phone": "0912345678",
    "password": "password456"
  }'
```

**Kỳ vọng:**

- Status: `201`
- Trả về token (không cần email)

---

### 📝 Test 3: Register không có email cũng không phone (FAIL)

```bash
curl -X POST http://localhost:4000/api/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nguyễn Văn C",
    "password": "password789"
  }'
```

**Kỳ vọng:**

- Status: `400`
- Error: `"Email or phone number is required"`

---

### 📝 Test 4: Login với email

```bash
curl -X POST http://localhost:4000/api/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "password123"
  }'
```

**Kỳ vọng:**

- Status: `200`
- Trả về user info + JWT token

---

### 📝 Test 5: Login với phone

```bash
curl -X POST http://localhost:4000/api/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0912345678",
    "password": "password456"
  }'
```

**Kỳ vọng:**

- Status: `200`
- Trả về user info + JWT token

---

### 📝 Test 6: Login sai password (FAIL)

```bash
curl -X POST http://localhost:4000/api/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "wrongpassword"
  }'
```

**Kỳ vọng:**

- Status: `401`
- Error: `"Invalid email/phone or password"`

---

### 📝 Test 7: Validation errors

**Mật khẩu quá ngắn:**

```bash
curl -X POST http://localhost:4000/api/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "test@example.com",
    "password": "123"
  }'
```

**Kỳ vọng:**

- Status: `400`
- Error: `"Password must be at least 6 characters"`

---

## Kiểm tra Token (JWT)

Token trả về có format: `header.payload.signature`

### Decode payload (optional):

```bash
# Lấy token từ response
TOKEN="eyJhbGc..."

# Decode (base64) - chỉ để xem, không verify
echo "$TOKEN" | cut -d. -f2 | base64 -d | jq
```

**Payload sẽ chứa:**

```json
{
  "id": 1,
  "email": "customer@example.com",
  "iat": 1779727230,
  "exp": 1782319230
}
```

---

## Test Results Summary

| Test                    | Result                     |
| ----------------------- | -------------------------- |
| Register email + phone  | ✅ PASS                    |
| Register phone only     | ✅ PASS                    |
| Register no email/phone | ✅ PASS (validation error) |
| Login with email        | ✅ PASS                    |
| Login with phone        | ✅ PASS                    |
| Login wrong password    | ✅ PASS (rejected)         |
| Duplicate email         | ✅ PASS (rejected)         |
| JWT token format        | ✅ PASS                    |

---

## Tiếp theo (Slice 3 phần 2)

Tạo trang register/login cho frontend (Next.js):

- `apps/web/app/auth/register/page.tsx`
- `apps/web/app/auth/login/page.tsx`
- Gọi API endpoints này từ frontend
