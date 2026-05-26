# Decisions Log — Restaurant Management System

## 2026-05-24 — Chọn Next.js 15 App Router cho frontend

**Quyết định:** Dùng Next.js 15 với App Router
**Lý do:** Server Components giảm bundle size, tốt cho SEO trang khách hàng, routing theo folder trực quan, deploy dễ lên Vercel
**Không chọn:** Vite + React SPA (không có SSR, SEO kém hơn)

## 2026-05-24 — Tách frontend và backend thành 2 app riêng

**Quyết định:** Monorepo với apps/web và apps/api tách biệt
**Lý do:** Socket.IO cần persistent connection — khó dùng với Next.js serverless. Backend riêng dễ scale và debug hơn.
**Không chọn:** Next.js API Routes cho toàn bộ backend (không hỗ trợ WebSocket tốt)

## 2026-05-24 — Dùng Prisma ORM thay vì raw SQL

**Quyết định:** Prisma ORM cho tất cả database operations
**Lý do:** Type-safe queries, auto-generated types khớp với TypeScript, migration dễ quản lý, IDE autocomplete tốt
**Không chọn:** Sequelize (verbose hơn), raw SQL (không type-safe)

## 2026-05-24 — Soft delete thay vì hard delete

**Quyết định:** Dùng is_active = false cho tất cả delete operations
**Lý do:** Tránh mất dữ liệu lịch sử, hoá đơn cũ vẫn reference được món/nhân viên đã "xóa", dễ restore nếu xóa nhầm
**Hệ quả:** Mọi query list phải thêm WHERE is_active = true

## 2026-05-24 — Lưu unit_price trong order_items

**Quyết định:** Lưu giá tại thời điểm order vào cột unit_price của order_items
**Lý do:** Tránh trường hợp giá menu thay đổi sau này làm sai lệch hoá đơn cũ
**Hệ quả:** Khi tính tổng hoá đơn, dùng order_items.unit_price \* quantity, không join lại menu_items.price

## 2026-05-24 — Phase 1 chưa tự động trừ kho

**Quyết định:** Tạo bảng menu_ingredients sẵn nhưng Phase 1 chưa implement auto-deduction
**Lý do:** Nhà hàng cần thời gian nhập đủ công thức cho tất cả món. Tránh trừ kho sai trong giai đoạn đầu.
**Hệ quả:** Phase 1 chỉ nhập/xuất kho thủ công. Phase 2 mới tự động.

## 2026-05-26 — Đổi qr_code_url sang LongText

**Quyết định:** Dùng LongText thay vì VARCHAR(500)
**Lý do:** Base64 data URI của QR image dài ~5-10KB,
vượt quá giới hạn VARCHAR(500)
**Hệ quả:** Cột này không index được — OK vì không cần search theo QR
