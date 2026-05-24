# Project Context

## Overview
Restaurant Management System — web app quản lý nhà hàng tích hợp.
Cho phép khách đặt bàn online hoặc qua QR tại bàn, gọi món, thanh toán.
Staff (manager/receptionist/warehouse) quản lý toàn bộ vận hành.

## Roles
- `manager` — full access
- `receptionist` — bàn, order, hoá đơn, thanh toán
- `warehouse` — inventory chỉ
- `customer` — đặt bàn, gọi món, xem lịch sử

## Tech Stack
- Frontend: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Node.js + Express.js + TypeScript
- Database: MySQL 8 + Prisma ORM
- Realtime: Socket.IO
- Auth: JWT + bcrypt

## Project Structure
- `apps/web/` — Next.js frontend
- `apps/api/` — Express.js backend
- `apps/api/prisma/schema.prisma` — database schema

# Coding Standards

## Naming
- React Components: PascalCase
- Hooks: camelCase với `use` prefix
- Files (components): PascalCase.tsx
- Files (utils/hooks): camelCase.ts
- API routes: kebab-case (/api/menu-items)
- DB tables: snake_case plural
- TypeScript types/interfaces: PascalCase

## Bắt buộc
- Dùng async/await, không .then().catch()
- Validate input bằng Zod trước khi xử lý
- API response luôn theo format: `{ success: true, data }` hoặc `{ success: false, error, code }`
- Dùng Prisma client, không raw SQL
- Transaction khi operation ảnh hưởng nhiều bảng
- Soft delete (`is_active = false`), không hard delete
- Không dùng `any` trong TypeScript
- Server Component mặc định, Client Component chỉ khi cần

## Không được dùng
- Không dùng `var` (chỉ const/let)
- Không inline style (dùng Tailwind)
- Không fetch trong useEffect nếu có thể dùng Server Component
- Không commit file .env

## Socket.IO Rooms
- `table:{tableId}` — updates cho khách tại bàn đó
- `staff:receptionist` — order mới, đặt bàn mới
- `staff:kitchen` — order đã confirm cần chế biến

# How to Work With Me

## Khi tạo API endpoint mới
1. Route trong `src/routes/`
2. Logic trong `src/controllers/`
3. Validate input bằng Zod schema
4. Wrap trong try/catch, dùng next(error) cho errors
5. Trả về format chuẩn `{ success, data/error }`

## Khi tạo React component
1. Đặt đúng thư mục (customer/ hoặc staff/ hoặc shared/)
2. TypeScript interface cho props ngay trên component
3. Named export, không default export
4. Server Component trừ khi cần state/event handlers

## Khi sửa code
- Chỉ sửa những gì được yêu cầu, không refactor code không liên quan
- Giải thích ngắn thay đổi quan trọng trước khi show code
- Nếu có nhiều approach, đề xuất và giải thích lý do chọn

## Format trả lời
- Giải thích ngắn (2-3 câu) → code
- Highlight thay đổi so với code cũ nếu là edit
- Nêu rõ nếu cần cài thêm package
