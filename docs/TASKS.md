# Tasks — Restaurant Management System

## Cần làm — theo thứ tự

### Slice 1 — Database setup

- [x] Khởi tạo monorepo (apps/web + apps/api)
- [x] Setup Prisma + kết nối MySQL
- [x] Viết schema.prisma đầy đủ theo DB_SCHEMA.md
- [x] Chạy migration đầu tiên
- [x] Seed data mẫu (1 manager account, vài bàn, vài món)

### Slice 2 — Auth Staff

- [x] POST /api/auth/staff/login
- [x] JWT middleware bảo vệ route staff
- [x] Role-based access control middleware
- [x] Trang login staff (Next.js)

### Slice 3 — Auth Customer

- [x] POST /api/auth/customer/register
- [x] POST /api/auth/customer/login
- [ ] Trang register/login khách

### Slice 4 — Table Management

- [x] CRUD API cho tables
- [x] Generate QR code API
- [ ] Trang quản lý bàn (manager)
- [ ] Sơ đồ bàn realtime (receptionist)

### Slice 5 — Menu Management

- [x] CRUD API menu categories
- [x] CRUD API menu items (với upload ảnh)
- [ ] Trang quản lý thực đơn (manager)
- [ ] Trang xem thực đơn (customer)

### Slice 6 — Reservation

- [x] GET /api/reservations/available-tables
- [x] POST /api/reservations
- [x] GET /api/reservations (receptionist/manager)
- [x] GET /api/reservations/my (customer)
- [x] PATCH /api/reservations/:id/confirm
- [x] PATCH /api/reservations/:id/cancel
- [x] Socket.IO: emit khi có đặt bàn mới
- [ ] Trang đặt bàn (customer)
- [ ] Trang xử lý đặt bàn (receptionist)

### Slice 7 — QR Scan & Table Session

- [x] GET /api/tables/:tableId/session — thông tin bàn + session hiện tại
- [x] POST /api/tables/:tableId/session — mở session (PUBLIC, tạo session mới nếu bàn available, trả session hiện tại nếu occupied)
- [x] PATCH /api/sessions/:id/close — đóng session (receptionist only)
- [ ] Route /table/[tableId] (Next.js) — customer trang gọi món

### Slice 8 — Order + Realtime

- [x] POST /api/orders — tạo order (PUBLIC endpoint)
- [x] GET /api/orders/:sessionId — lấy danh sách order của session
- [x] PATCH /api/orders/:id/confirm — receptionist confirm order tới bếp
- [x] PATCH /api/orders/:id/complete — receptionist mark order completed
- [x] PATCH /api/orders/:id/cancel — receptionist cancel order
- [x] Socket.IO: new-order, order-confirmed, order-completed events
- [x] Socket.IO room assignment per PRD (receptionist joins both staff:receptionist + staff:kitchen)
- [x] Zod validation cho order items + error handling
- [ ] Trang gọi món (customer)
- [ ] Màn hình order management (receptionist)

### Slice 9 — Invoice + Cash Payment

- [x] POST /api/invoices — tạo invoice từ served orders (receptionist/manager)
- [x] GET /api/invoices/:id — lấy invoice (staff)
- [x] GET /api/invoices/sessions/:sessionId/invoice — lấy invoice theo session (staff)
- [x] POST /api/invoices/:id/pay/cash — thanh toán tiền mặt, atomic transaction (receptionist/manager)
- [x] Discount support (0-100%)
- [x] Transaction safety: Prisma $transaction cho invoice + payment + session + table updates
- [x] Socket.IO event: emit 'invoice-paid' to staff:receptionist
- [ ] Trang hoá đơn + thanh toán (receptionist)
- [ ] Integration tests (manual testing guide tại docs/SLICE9-MANUAL-TESTING.md)

### Slice 10 — Online Payment

- [ ] Tích hợp VNPay
- [ ] Tích hợp Momo
- [ ] Webhook handler cho payment callback

### Slice 11 — Inventory

- [x] CRUD API inventory items (getItems, createItem, updateItem)
- [x] Inventory transactions (addStock, adjustStock, getTransactions)
- [x] Low stock detection (getLowStockItems)
- [x] Prisma transaction safety (atomic operations)
- [x] Zod validation + error handling
- [x] Role-based access (warehouse/manager read + add, manager adjust)
- [x] Audit trail (staff ID, timestamps, qty tracking)
- [x] Complete test suite (6/6 tests passed)
- [ ] Frontend: Trang quản lý kho (warehouse)

### Slice 12 — Dashboard & Stats

- [x] POST /api/stats/revenue (getRevenueSummary — today/week/month)
- [x] GET /api/stats/revenue-chart (getRevenueChart — 30 days with gap fill)
- [x] GET /api/stats/top-items (getTopItems — top items by quantity + revenue, with optional date range)
- [x] Manager-only role protection on all stats endpoints
- [x] Zod validation + error handling
- [x] Prisma $queryRaw with template literals
- [x] Complete test suite (all 4 test categories passed)
- [ ] Dashboard page (manager)

### Slice 13 — Polish

- [ ] Responsive mobile cho tất cả trang customer
- [ ] Error handling & loading states
- [ ] Toast notifications
- [ ] Xóa console.log thừa

## Đã xong

### Slice 1 — Database setup ✓

### Slice 2 — Auth Staff ✓

### Slice 3 — Auth Customer ✓

### Slice 4 — Table Management (API) ✓

### Slice 5 — Menu Management (API) ✓

### Slice 6 — Reservation (API) ✓

### Slice 7 — QR Scan & Table Session (API) ✓

### Slice 8 — Order + Realtime (API + Socket.IO) ✓

### Slice 9 — Invoice + Cash Payment (API) ✓

### Slice 11 — Inventory (API) ✓

### Slice 12 — Statistics API ✓

## Known Issues / Tech Debt

(trống)
