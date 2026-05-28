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

- [ ] POST /api/orders — tạo order
- [ ] PATCH /api/orders/:id/confirm (receptionist)
- [ ] PATCH /api/orders/:id/complete (kitchen)
- [ ] Socket.IO: new-order, order-confirmed, order-completed events
- [ ] Trang gọi món (customer)
- [ ] Màn hình order management (receptionist)

### Slice 9 — Invoice + Cash Payment

- [ ] POST /api/invoices
- [ ] POST /api/payments/cash
- [ ] Trang hoá đơn + thanh toán (receptionist)

### Slice 10 — Online Payment

- [ ] Tích hợp VNPay
- [ ] Tích hợp Momo
- [ ] Webhook handler cho payment callback

### Slice 11 — Inventory

- [ ] CRUD API inventory items
- [ ] POST /api/inventory/transactions
- [ ] Cảnh báo tồn kho thấp
- [ ] Trang quản lý kho (warehouse)

### Slice 12 — Dashboard & Stats

- [ ] GET /api/stats/revenue
- [ ] GET /api/stats/top-items
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

## Known Issues / Tech Debt

(trống)
