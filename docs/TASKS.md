# Tasks — Restaurant Management System

## Đang làm
(trống — chưa bắt đầu)

## Cần làm — theo thứ tự

### Slice 1 — Database setup
- [ ] Khởi tạo monorepo (apps/web + apps/api)
- [ ] Setup Prisma + kết nối MySQL
- [ ] Viết schema.prisma đầy đủ theo DB_SCHEMA.md
- [ ] Chạy migration đầu tiên
- [ ] Seed data mẫu (1 manager account, vài bàn, vài món)

### Slice 2 — Auth Staff
- [ ] POST /api/auth/staff/login
- [ ] JWT middleware bảo vệ route staff
- [ ] Role-based access control middleware
- [ ] Trang login staff (Next.js)

### Slice 3 — Auth Customer
- [ ] POST /api/auth/customer/register
- [ ] POST /api/auth/customer/login
- [ ] Trang register/login khách

### Slice 4 — Table Management
- [ ] CRUD API cho tables
- [ ] Generate QR code API
- [ ] Trang quản lý bàn (manager)
- [ ] Sơ đồ bàn realtime (receptionist)

### Slice 5 — Menu Management
- [ ] CRUD API menu categories
- [ ] CRUD API menu items (với upload ảnh)
- [ ] Trang quản lý thực đơn (manager)
- [ ] Trang xem thực đơn (customer)

### Slice 6 — Reservation
- [ ] POST /api/reservations — đặt bàn
- [ ] GET /api/reservations — danh sách (receptionist)
- [ ] PATCH /api/reservations/:id/confirm
- [ ] Socket.IO: emit khi có đặt bàn mới
- [ ] Trang đặt bàn (customer)
- [ ] Trang xử lý đặt bàn (receptionist)

### Slice 7 — QR Scan & Table Session
- [ ] GET /api/tables/:tableId — thông tin bàn
- [ ] POST /api/table-sessions — mở session
- [ ] Route /table/[tableId] (Next.js)

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
(trống — chưa bắt đầu)

## Known Issues / Tech Debt
(trống)
