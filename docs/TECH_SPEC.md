# Tech Spec — Hệ thống quản lý nhà hàng

> Cập nhật: 2026-05-24

---

## Architecture Overview

```
[Browser]
      |
      | HTTPS
      ↓
[Next.js 15 — Vercel]          ← Frontend + SSR
      |
      | REST API / HTTP
      ↓
[Express.js — Railway]         ← Backend API Server
      |           |
      |     Socket.IO           ← Realtime (WebSocket)
      |
      ↓
[MySQL 8 — Railway]            ← Database
(Prisma ORM)
```

**Hai app riêng biệt:**

- `apps/web` — Next.js frontend
- `apps/api` — Express.js backend

---

## Cấu trúc thư mục

```
restaurant-management/
├── apps/
│   ├── web/                        # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/             # Login, register pages
│   │   │   ├── (customer)/         # Trang khách hàng: đặt bàn, menu
│   │   │   ├── (staff)/            # Dashboard staff
│   │   │   │   ├── manager/        # Quản lý: CRUD tất cả
│   │   │   │   ├── receptionist/   # Tiếp tân: bàn, order, hoá đơn
│   │   │   │   └── warehouse/      # Kho: inventory
│   │   │   └── table/[tableId]/    # QR landing page
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui base components
│   │   │   ├── shared/             # Dùng chung nhiều nơi
│   │   │   ├── customer/           # Components cho khách
│   │   │   └── staff/              # Components cho staff
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── lib/                    # Utilities, API client, socket
│   │   └── types/                  # TypeScript types
│   │
│   └── api/                        # Express.js backend
│       ├── src/
│       │   ├── routes/             # Route handlers
│       │   ├── controllers/        # Business logic
│       │   ├── middlewares/        # Auth, validation, error handling
│       │   ├── services/           # External services (payment, QR)
│       │   ├── socket/             # Socket.IO event handlers
│       │   └── utils/              # Helpers
│       └── prisma/
│           └── schema.prisma       # Database schema
│
├── docs/                           # Tài liệu dự án
│   ├── PRD.md
│   ├── TECH_SPEC.md
│   ├── DB_SCHEMA.md
│   ├── DECISIONS.md
│   └── TASKS.md
│
└── .github/
    ├── copilot-instructions.md
    └── prompts/
```

---

## Naming Conventions

| Loại                | Convention               | Ví dụ                                    |
| ------------------- | ------------------------ | ---------------------------------------- |
| React Component     | PascalCase               | `OrderCard`, `TableGrid`                 |
| Hooks               | camelCase + `use` prefix | `useOrders`, `useSocket`                 |
| Utilities           | camelCase                | `formatCurrency`, `generateQR`           |
| API routes          | kebab-case               | `/api/menu-items`, `/api/table-sessions` |
| DB tables           | snake_case plural        | `order_items`, `menu_categories`         |
| DB columns          | snake_case               | `created_at`, `unit_price`               |
| TypeScript types    | PascalCase               | `Order`, `TableSession`                  |
| Env variables       | UPPER_SNAKE_CASE         | `DATABASE_URL`, `JWT_SECRET`             |
| Files (components)  | PascalCase               | `OrderCard.tsx`                          |
| Files (utils/hooks) | camelCase                | `useOrders.ts`, `formatCurrency.ts`      |

---

## Patterns bắt buộc

**API:**

- Tất cả API response theo format chuẩn:
  ```json
  { "success": true, "data": {...} }
  { "success": false, "error": "message", "code": "ERROR_CODE" }
  ```
- Dùng async/await + try/catch, không dùng .then().catch()
- Validate input với Zod trước khi xử lý business logic
- Auth middleware bảo vệ tất cả route `/api/staff/*`

**Frontend:**

- Server Components mặc định, chỉ dùng Client Component khi cần state/effect
- Data fetching trong Server Component, không fetch trong useEffect nếu có thể
- Error boundary cho mỗi major section
- Loading state cho mọi async operation

**Database:**

- Không viết raw SQL — dùng Prisma client hoàn toàn
- Transaction cho các operation ảnh hưởng nhiều bảng
  (ví dụ: tạo invoice + update table status phải trong cùng transaction)
- Không xóa data thật — dùng soft delete (`is_active = false`)

**Realtime:**

- Socket.IO rooms theo pattern: `table:{tableId}`, `staff:receptionist`, `staff:kitchen`
- Khi order mới: emit vào room `staff:receptionist`
- Khi order confirmed: emit vào room `staff:kitchen` + `table:{tableId}`

---

## Patterns KHÔNG được dùng

- Không dùng `any` trong TypeScript
- Không fetch data trong `useEffect` nếu có thể dùng Server Component
- Không commit `.env` file
- Không dùng `var` — chỉ `const` và `let`
- Không inline style — dùng Tailwind classes
- Không xóa hard record trong database — luôn soft delete

---

## Environment Variables

```env
# apps/api/.env
DATABASE_URL="mysql://user:pass@host:3306/restaurant"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:3000"

VNPAY_TMN_CODE=""
VNPAY_HASH_SECRET=""
VNPAY_URL=""

MOMO_PARTNER_CODE=""
MOMO_ACCESS_KEY=""
MOMO_SECRET_KEY=""

# apps/web/.env.local
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
```

---

## Vertical Slices — thứ tự build

```
Slice 1:  Database setup + Prisma schema
Slice 2:  Auth — login/register staff + JWT middleware
Slice 3:  Auth — login/register khách hàng
Slice 4:  Table CRUD + QR generation
Slice 5:  Menu categories + Menu items CRUD
Slice 6:  Reservation flow (đặt bàn online)
Slice 7:  QR scan → table session
Slice 8:  Order flow + Socket.IO realtime
Slice 9:  Invoice + Payment (tiền mặt trước)
Slice 10: Payment online (VNPay/Momo)
Slice 11: Inventory management
Slice 12: Dashboard & Statistics
Slice 13: Polish: responsive, error handling, loading states
```
