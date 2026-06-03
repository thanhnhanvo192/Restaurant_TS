# 🍽️ Hệ Thống Quản Lý Nhà Hàng (Restaurant Management System)

Dự án này là một hệ thống quản lý nhà hàng tích hợp đầy đủ các chức năng từ đặt bàn trực tuyến, gọi món qua mã QR tại bàn (realtime), quản lý hóa đơn & thanh toán, quản lý kho nguyên liệu cho đến dashboard thống kê doanh thu dành cho người quản lý.

Dự án được xây dựng dưới dạng **Monorepo** sử dụng `npm workspaces` chia làm hai phần chính:
*   **Frontend (`apps/web`)**: Next.js 15 (App Router), Tailwind CSS, shadcn/ui.
*   **Backend (`apps/api`)**: Node.js, Express.js, Prisma ORM (kết nối cơ sở dữ liệu MySQL), Socket.IO (giao tiếp realtime).

---

## 🛠️ Yêu Cầu Hệ Thống & Cài Đặt Ban Đầu

### 1. Cài đặt Node.js & MySQL
Đảm bảo máy tính của bạn đã cài đặt:
*   **Node.js** (Khuyến nghị phiên bản LTS mới nhất - v18 hoặc v20+).
*   **MySQL Server** (Hoặc Docker chứa MySQL).

### 2. Cài đặt các thư viện (Dependencies)
Tại thư mục gốc của dự án, chạy lệnh sau để tự động cài đặt dependencies cho cả Web và API:
```bash
npm install
```

### 3. Cấu hình biến môi trường (Environment Variables)

*   **Backend (`apps/api/.env`)**: Tạo file `.env` (hoặc sửa file có sẵn) với nội dung:
    ```env
    DATABASE_URL="mysql://<user>:<password>@localhost:3306/restaurant"
    JWT_SECRET="your-secret-key-here"
    PORT=4000
    FRONTEND_URL="http://localhost:3000"
    NODE_ENV=development
    ```
    *(Thay thế `<user>` và `<password>` bằng thông tin kết nối MySQL của bạn).*

*   **Frontend (`apps/web/.env.local`)**: Tạo file `.env.local` với nội dung:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:4000
    NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
    ```

### 4. Đồng bộ Database & Dữ liệu mẫu (Database Setup & Seed)
Di chuyển vào thư mục backend và thực hiện các lệnh sau để khởi tạo cấu trúc bảng và nạp dữ liệu mẫu (bàn ăn, món ăn, tài khoản demo):
```bash
cd apps/api
npx prisma migrate dev --name init
npm run prisma:seed
```

---

## 🚀 Hướng Dẫn Chạy Dự Án

Tại thư mục gốc của dự án, bạn có thể chạy đồng thời cả Frontend và Backend bằng một lệnh duy nhất:
```bash
npm run dev
```
*   **Frontend** sẽ chạy tại: [http://localhost:3000](http://localhost:3000)
*   **Backend API** sẽ chạy tại: [http://localhost:4000](http://localhost:4000)

---

## 🔑 Tài Khoản Thử Nghiệm Mặc Định (Demo Accounts)

Sau khi chạy lệnh `seed` dữ liệu thành công, bạn có thể đăng nhập bằng các tài khoản nhân viên mặc định dưới đây (mật khẩu chung là **`manager123`**):

| Vai trò (Role) | Email | Mật khẩu | Chức năng chính | Giao diện quản lý |
| :--- | :--- | :--- | :--- | :--- |
| **Quản lý (Manager)** | `manager@restaurant.com` | `manager123` | Toàn quyền, quản lý thực đơn, sơ đồ bàn, QR, nhân viên, xem thống kê | `/staff/manager` |
| **Tiếp tân (Receptionist)** | `receptionist@restaurant.com` | `manager123` | Xác nhận đặt bàn online, tiếp nhận order, đổi trạng thái bàn, tạo hóa đơn | `/staff/receptionist` |
| **Nhân viên kho (Warehouse)** | `warehouse@restaurant.com` | `manager123` | Quản lý nhập/xuất kho nguyên liệu và hàng hóa, kiểm tra tồn kho | `/staff/warehouse` |

---

## 📖 Hướng Dẫn Sử Dụng Các Luồng Nghiệp Vụ

### 1. Luồng Khách Hàng (Customer Flow)
Khách hàng có thể trải nghiệm dịch vụ theo 2 hình thức:

*   **Đặt bàn Online từ xa**:
    1. Truy cập [http://localhost:3000](http://localhost:3000).
    2. Đăng ký/đăng nhập tài khoản Khách hàng (sử dụng Email hoặc SĐT).
    3. Chọn thời gian (ngày, giờ), số lượng người và chọn bàn trống mong muốn.
    4. Gửi yêu cầu đặt bàn. Yêu cầu này sẽ hiển thị thời gian thực trên màn hình của **Tiếp tân**.
*   **Gọi món qua mã QR tại bàn (tại quán)**:
    1. Quét mã QR tại bàn (hoặc truy cập trực tiếp link mẫu: `http://localhost:3000/table/1` - tương ứng bàn số 1).
    2. Khách hàng xem thực đơn trực quan, chọn các món ăn/đồ uống vào giỏ hàng ảo và nhấn **Gửi Order**.
    3. Đơn hàng ngay lập tức được gửi tới màn hình tiếp tân qua Socket.IO.

---

### 2. Luồng Tiếp Tân (Receptionist Flow)
Tiếp tân làm việc trên giao diện Desktop/Tablet tại địa chỉ `/staff/receptionist`:
*   **Quản lý sơ đồ bàn**: Theo dõi trực quan trạng thái các bàn (Trống / Đã đặt / Đang dùng / Cần dọn dẹp) để sắp xếp chỗ ngồi cho khách.
*   **Xác nhận Đặt bàn**: Xem danh sách đặt bàn online và duyệt/hủy realtime.
*   **Xác nhận Order**: Nhận thông báo âm thanh và pop-up realtime khi khách tại bàn quét QR gửi order. Tiếp tân duyệt order để bếp chế biến.
*   **Thanh toán & Xuất hóa đơn**:
    1. Khi khách yêu cầu thanh toán, tiếp tân chọn bàn và tạo hóa đơn tổng hợp toàn bộ các order của bàn đó.
    2. Áp dụng mã giảm giá (nếu có).
    3. Xác nhận thanh toán (tiền mặt/chuyển khoản). Hệ thống sẽ tự động đổi trạng thái bàn sang "Cần dọn dẹp" và in hóa đơn (hỗ trợ xuất file PDF).

---

### 3. Luồng Nhân Viên Kho (Warehouse Flow)
Nhân viên kho đăng nhập và truy cập giao diện `/staff/warehouse`:
*   **Quản lý Danh mục**: Xem danh sách nguyên liệu, gia vị, hàng hóa trong kho (đơn vị tính: kg, lít, hộp,...).
*   **Nhập/Xuất kho**: Thực hiện nhập thêm nguyên liệu thủ công (ghi nhận số lượng nhập, đơn giá, nhà cung cấp) hoặc xuất kho.
*   **Lịch sử giao dịch**: Xem lịch sử chi tiết các lần nhập/xuất kho để đối chiếu.
*   **Cảnh báo tồn kho thấp**: Hệ thống tự động bôi đỏ/cảnh báo các nguyên liệu có lượng tồn thực tế thấp hơn định mức tối thiểu thiết lập.

---

### 4. Luồng Quản Lý (Manager Flow)
Quản lý đăng nhập và truy cập giao diện `/staff/manager`:
*   **Dashboard & Thống kê**: Xem báo cáo trực quan về doanh thu ngày/tuần/tháng, biểu đồ tăng trưởng doanh thu 30 ngày qua và bảng xếp hạng Top 10 món ăn bán chạy nhất.
*   **Quản lý thực đơn (Menu)**: Thêm/Sửa/Xóa các danh mục món ăn (Khai vị, Món chính, Đồ uống) và các món ăn (cập nhật tên, mô tả, giá bán, trạng thái còn/hết món).
*   **Quản lý sơ đồ bàn & Mã QR**: CRUD danh sách bàn ăn (vị trí, sức chứa) và tải về hình ảnh mã QR được tự động sinh ra cho từng bàn.
*   **Quản lý nhân sự**: Tạo tài khoản mới và phân quyền cho nhân viên (Tiếp tân, Kho, Quản lý).

---

## 📈 Quy Trình Phát Triển (Vertical Slices)
Dự án được triển khai theo các giai đoạn tăng dần (Slices):
1. Thiết lập DB & Prisma Schema
2. Đăng nhập/Đăng ký Nhân viên & Middleware xác thực
3. Đăng nhập/Đăng ký Khách hàng
4. CRUD Bàn ăn & Tự động sinh mã QR
5. CRUD Thực đơn & Món ăn
6. Luồng Đặt bàn trực tuyến (Reservation)
7. Quét QR bàn ăn → Khởi tạo phiên (Table Session)
8. Gọi món và đồng bộ Realtime (Socket.IO)
9. Quản lý hóa đơn & Thanh toán tiền mặt
10. Tích hợp thanh toán trực tuyến (VNPay/Momo)
11. Quản lý kho nguyên liệu (Inventory)
12. Dashboard Thống kê & Báo cáo doanh thu
13. Tối ưu giao diện Responsive, xử lý lỗi và Loading states
