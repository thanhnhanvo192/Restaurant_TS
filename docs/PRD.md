# PRD — Hệ thống quản lý nhà hàng

> Version: 1.0 | Phase: MVP
> Cập nhật lần cuối: 2026-05-24

---

## 1. Mô tả sản phẩm

Hệ thống web quản lý nhà hàng tích hợp, giúp tự động hóa quy trình
đặt bàn, gọi món qua QR, quản lý kho, nhân viên và thống kê doanh thu
— thay thế hoàn toàn cách vận hành thủ công truyền thống.

---

## 2. Target Users & Personas

| Role            | Mô tả                                      | Thiết bị chính |
| --------------- | ------------------------------------------ | -------------- |
| **Quản lý**     | Chủ/quản lý nhà hàng, có toàn quyền        | Desktop        |
| **Tiếp tân**    | Xử lý đặt bàn, xác nhận order, lên hoá đơn | Tablet/Desktop |
| **Quản lý kho** | Nhập/xuất kho, kiểm tra tồn kho            | Desktop        |
| **Khách hàng**  | Đặt bàn online hoặc quét QR tại bàn        | Mobile/Desktop |

---

## 3. Core Features — MVP

### 3.1 Phân quyền & Authentication

- Staff (Quản lý, Tiếp tân, Quản lý kho) đăng nhập bằng email + password
- Khách hàng đăng ký/đăng nhập bằng email hoặc số điện thoại
- Mỗi role chỉ truy cập được phạm vi quyền của mình
- Acceptance criteria: truy cập trái quyền → redirect 403

### 3.2 Đặt bàn

**Online (khách đăng nhập):**

- Khách chọn ngày, giờ, số người → hệ thống show bàn còn trống
- Khách chọn bàn → gửi yêu cầu → Tiếp tân xác nhận/từ chối realtime

**Tại quán qua QR:**

- QR trên bàn encode URL `/table/{tableId}`
- Quét QR → trang web mở với bàn đã chọn sẵn
- Nếu bàn trống: tạo session ngồi bàn
- Nếu bàn có khách: hiển thị "Bàn đang được sử dụng"

### 3.3 Quản lý bàn

- Sơ đồ bàn theo trạng thái: Trống / Đã đặt / Đang dùng / Cần dọn
- Tiếp tân đổi trạng thái thủ công
- Quản lý CRUD bàn (số bàn, sức chứa, vị trí)
- Tạo và download QR code cho từng bàn

### 3.4 Thực đơn & Gọi món

- Quản lý CRUD món ăn: tên, mô tả, giá, hình ảnh, danh mục, trạng thái
- Khách xem thực đơn qua QR → chọn món → gửi order
- Tiếp tân xác nhận order (realtime ≤3s) → bếp nhận
- Bếp xác nhận hoàn thành → trạng thái "Đã phục vụ"

### 3.5 Hoá đơn & Thanh toán

- Tiếp tân tạo hoá đơn từ tất cả order của một bàn
- Áp dụng giảm giá (%)
- Tiền mặt: tiếp tân xác nhận → đóng bàn
- Online (VNPay/Momo): tạo link thanh toán → tự động xác nhận khi thành công
- In/download hoá đơn PDF

### 3.6 Quản lý nhân viên

- Quản lý CRUD nhân viên, assign role
- Không tự đăng ký — chỉ Quản lý tạo tài khoản Staff

### 3.7 Quản lý kho

- Danh mục nguyên liệu với mức tồn kho tối thiểu
- Nhập kho thủ công (số lượng, nhà cung cấp, ngày, ghi chú)
- Lịch sử nhập/xuất kho
- Cảnh báo khi nguyên liệu < mức tối thiểu

### 3.8 Thống kê

- Doanh thu hôm nay / tuần / tháng
- Biểu đồ doanh thu 30 ngày gần nhất
- Top 10 món bán chạy nhất

---

## 4. Non-Goals (Phase 1)

- Tích điểm, loyalty program
- Thông báo email/SMS
- App mobile native
- Tự động trừ kho theo công thức món ăn
- Quản lý ca làm, chấm công
- Đa chi nhánh

---

## 5. Tech Stack

| Layer      | Technology                           |
| ---------- | ------------------------------------ |
| Frontend   | Next.js 15 (App Router) + TypeScript |
| Styling    | Tailwind CSS + shadcn/ui             |
| Backend    | Node.js + Express.js                 |
| Database   | MySQL 8 + Prisma ORM                 |
| Realtime   | Socket.IO                            |
| Auth       | JWT + bcrypt                         |
| QR Code    | qrcode (npm)                         |
| Thanh toán | VNPay + Momo API                     |
| Deploy     | Vercel (FE) + Railway (BE + MySQL)   |

---

## 6. Acceptance Criteria

- [ ] 4 roles phân quyền đúng, không cross-access
- [ ] Đặt bàn online và QR đều hoạt động
- [ ] Order realtime ≤ 3 giây
- [ ] Thanh toán 2 kênh hoạt động
- [ ] Dashboard thống kê đúng số liệu
- [ ] Cảnh báo kho thấp hiển thị đúng
- [ ] QR quét được trên iOS/Android
- [ ] Responsive mobile (khách) + desktop (staff)
