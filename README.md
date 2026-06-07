# Restaurant Management System

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18-green?logo=express)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8-blue?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.8-2D3748?logo=prisma)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socket.io)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A comprehensive full-stack restaurant management system with online reservations, order management, and real-time updates.**

[Live Demo](#) · [Documentation](./docs) · [Report Bug](https://github.com/thanhnhanvo192/Restaurant_TS/issues) · [Request Feature](https://github.com/thanhnhanvo192/Restaurant_TS/issues)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [User Roles & Permissions](#user-roles--permissions)
- [Real-time Features](#real-time-features)
- [Project Roadmap](#project-roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## 📖 Overview

**Restaurant Management System** is a full-stack web application designed to streamline restaurant operations. It enables customers to make online reservations or table bookings via QR code, browse menus, place orders, and process payments. Staff members can efficiently manage reservations, orders, inventory, and payments across multiple roles.

This system combines modern technologies to deliver:
- **Real-time synchronization** of orders and table statuses
- **Role-based access control** for different staff levels
- **Responsive UI** for both customers and staff
- **Comprehensive order & inventory management**

---

## ✨ Key Features

### For Customers
- 📱 **Online Reservation System** – Book tables in advance
- 🔗 **QR-based Ordering** – Scan table QR code to view menu and place orders
- 📝 **Order History** – Track previous orders and bookings
- 💳 **Multiple Payment Methods** – Secure payment processing
- 🔔 **Real-time Order Status** – Live updates on order preparation
- 🌐 **Responsive Design** – Mobile-first user experience

### For Staff
- 👨‍💼 **Manager Dashboard** – Full system control and reporting
- 👨‍💻 **Receptionist Tools** – Table management, reservations, orders, and payments
- 📦 **Warehouse Management** – Inventory tracking and management
- 📊 **Real-time Notifications** – Instant alerts for new orders
- 🔐 **Role-based Access** – Granular permission control

### System Features
- 🔄 **Real-time Updates** – Socket.IO integration for live data synchronization
- 🛡️ **Secure Authentication** – JWT-based authentication with password hashing
- 🗂️ **Soft Deletes** – Data preservation through logical deletion
- 📱 **Responsive Design** – Works on desktop, tablet, and mobile devices
- 🔌 **RESTful API** – Well-structured, documented API endpoints

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 15 | React framework with App Router |
| **TypeScript** | 5.3+ | Type-safe development |
| **Tailwind CSS** | Latest | Utility-first CSS framework |
| **shadcn/ui** | Latest | Pre-built accessible components |
| **Socket.IO Client** | 4.7+ | Real-time communication |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18+ | JavaScript runtime |
| **Express.js** | 4.18+ | Web framework |
| **TypeScript** | 5.3+ | Type-safe backend code |
| **Socket.IO** | 4.7+ | Real-time bidirectional communication |

### Database & ORM
| Technology | Version | Purpose |
|-----------|---------|---------|
| **MySQL** | 8+ | Relational database |
| **Prisma** | 5.8+ | Next-generation ORM |

### Authentication & Security
| Package | Version | Purpose |
|---------|---------|---------|
| **JWT (jsonwebtoken)** | 9.0+ | Token-based authentication |
| **bcrypt** | 5.1+ | Password hashing |
| **CORS** | 2.8+ | Cross-origin resource sharing |

### Validation
| Package | Version | Purpose |
|---------|---------|---------|
| **Zod** | 3.22+ | TypeScript-first schema validation |

---

## 📁 Project Structure

```
Restaurant_TS/
├── apps/
│   ├── api/                          # Backend (Express.js + Node.js)
│   │   ├── src/
│   │   │   ├── index.ts              # Server entry point
│   │   │   ├── middleware/           # Express middleware (auth, error handling)
│   │   │   ├── routes/               # API route definitions
│   │   │   ├── controllers/          # Request handlers & business logic
│   │   │   ├── services/             # Business logic & utilities
│   │   │   ├── types/                # TypeScript interfaces & types
│   │   │   └── utils/                # Helper functions
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema definition
│   │   │   ├── migrations/           # Database migration files
│   │   │   └── seed.ts               # Database seeding script
│   │   ├── dist/                     # Compiled JavaScript output
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          # Frontend (Next.js + React)
│       ├── src/
│       │   ├── app/                  # Next.js App Router
│       │   │   ├── (customer)/       # Customer-facing pages
│       │   │   ├── (staff)/          # Staff dashboard pages
│       │   │   └── api/              # API routes (if needed)
│       │   ├── components/
│       │   │   ├── customer/         # Customer-specific components
│       │   │   ├── staff/            # Staff-specific components
│       │   │   └── shared/           # Shared components
│       │   ├── hooks/                # Custom React hooks
│       │   ├── types/                # TypeScript interfaces & types
│       │   ├── utils/                # Utility functions
│       │   ├── styles/               # Global styles & Tailwind config
│       │   └── services/             # API service clients
│       ├── public/                   # Static assets
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                             # Project documentation
├── .github/                          # GitHub configuration (workflows, templates)
├── .gitignore
├── package.json                      # Root workspace configuration
├── package-lock.json
└── README.md                         # This file
```

### Monorepo Structure

This project uses **npm workspaces** to manage multiple applications:
- **`apps/api`** – Backend API server
- **`apps/web`** – Frontend Next.js application

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **npm** >= 9.0.0 (comes with Node.js)
- **MySQL** >= 8.0 ([Download](https://www.mysql.com/downloads/))
- **Git** ([Download](https://git-scm.com/))

### Verify Installation
```bash
node --version    # Should show v18.0.0 or higher
npm --version     # Should show 9.0.0 or higher
mysql --version   # Should show MySQL 8.0 or higher
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/thanhnhanvo192/Restaurant_TS.git
cd Restaurant_TS
```

### 2. Install Dependencies

```bash
# Install root and workspace dependencies
npm install
```

### 3. Environment Configuration

#### Backend API (apps/api)

Create `.env.local` file in `apps/api/`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DATABASE_URL="mysql://root:password@localhost:3306/restaurant_db"

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_very_secure
JWT_EXPIRY=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Socket.IO Configuration
SOCKET_IO_CORS_ORIGIN=http://localhost:3000
```

#### Frontend Web (apps/web)

Create `.env.local` file in `apps/web/`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 4. Database Setup

```bash
# Navigate to api directory
cd apps/api

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed the database with sample data
npm run prisma:seed

# Verify schema with Prisma Studio
npm run prisma:studio
```

### 5. Start Development Server

```bash
# From root directory
npm run dev

# Alternatively, run each service separately:

# Terminal 1: Start API server
cd apps/api
npm run dev

# Terminal 2: Start Next.js frontend
cd apps/web
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Prisma Studio**: http://localhost:5555

---

## 💻 Development

### Build for Production

```bash
# Build all workspaces
npm run build

# Or build specific workspace
npm run build --workspace=apps/api
npm run build --workspace=apps/web
```

### Running Tests

```bash
# Run all tests
npm run test

# Or test specific workspace
npm run test --workspace=apps/api
```

### Code Quality

```bash
# Lint all workspaces
npm run lint

# Or lint specific workspace
npm run lint --workspace=apps/api
```

### Database Commands

```bash
# Run Prisma migrations
npm run prisma:migrate --workspace=apps/api

# Deploy migrations to production
npm run prisma:migrate:deploy --workspace=apps/api

# Open Prisma Studio UI
npm run prisma:studio --workspace=apps/api

# Regenerate Prisma client
npm run prisma:generate --workspace=apps/api

# Seed database with test data
npm run prisma:seed --workspace=apps/api
```

---

## 🔌 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

### Response Format
All API responses follow a standardized format:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Main Endpoints

#### Authentication
- `POST /auth/register` – Register new user
- `POST /auth/login` – Login and get JWT token
- `POST /auth/refresh` – Refresh JWT token

#### Tables
- `GET /tables` – List all tables
- `POST /tables` – Create new table (Manager only)
- `PATCH /tables/:id` – Update table details
- `DELETE /tables/:id` – Soft delete table

#### Reservations
- `GET /reservations` – Get reservations
- `POST /reservations` – Create new reservation
- `PATCH /reservations/:id` – Update reservation status
- `GET /reservations/:id` – Get reservation details

#### Orders
- `GET /orders` – List orders
- `POST /orders` – Create new order
- `PATCH /orders/:id/status` – Update order status
- `POST /orders/:id/items` – Add items to order

#### Menu
- `GET /menu` – Get all menu items
- `POST /menu` – Create menu item (Manager only)
- `PATCH /menu/:id` – Update menu item
- `DELETE /menu/:id` – Soft delete menu item

#### Payments
- `POST /payments` – Process payment
- `GET /payments/:id` – Get payment details
- `GET /payments` – List all payments

#### Inventory
- `GET /inventory` – Get inventory items
- `PATCH /inventory/:id` – Update inventory
- `GET /inventory/low-stock` – Get low stock items

### Input Validation
All endpoints validate input using **Zod** schemas. Invalid requests return:
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": { /* field errors */ }
}
```

---

## 🗄️ Database Schema

### Key Tables

#### Users
```sql
- id: UUID (Primary Key)
- email: String (Unique)
- password: String (hashed)
- full_name: String
- role: Enum (manager | receptionist | warehouse | customer)
- phone: String
- is_active: Boolean (Soft delete)
- created_at: DateTime
- updated_at: DateTime
```

#### Tables
```sql
- id: UUID (Primary Key)
- table_number: Int
- capacity: Int
- status: Enum (available | occupied | reserved)
- qr_code: String (Unique)
- location: String
- is_active: Boolean
- created_at: DateTime
- updated_at: DateTime
```

#### Orders
```sql
- id: UUID (Primary Key)
- table_id: UUID (Foreign Key)
- customer_id: UUID (Foreign Key)
- status: Enum (pending | confirmed | cooking | ready | completed | cancelled)
- total_amount: Decimal
- notes: String
- is_active: Boolean
- created_at: DateTime
- updated_at: DateTime
```

#### Order Items
```sql
- id: UUID (Primary Key)
- order_id: UUID (Foreign Key)
- menu_item_id: UUID (Foreign Key)
- quantity: Int
- unit_price: Decimal
- special_requests: String
- created_at: DateTime
```

#### Reservations
```sql
- id: UUID (Primary Key)
- table_id: UUID (Foreign Key)
- customer_id: UUID (Foreign Key)
- guest_count: Int
- reservation_time: DateTime
- status: Enum (pending | confirmed | completed | cancelled)
- notes: String
- is_active: Boolean
- created_at: DateTime
- updated_at: DateTime
```

For complete schema details, see [apps/api/prisma/schema.prisma](./apps/api/prisma/schema.prisma)

---

## 👥 User Roles & Permissions

### Role Hierarchy

| Role | Description | Permissions |
|------|-------------|------------|
| **Manager** | Full system access | All operations, reporting, staff management |
| **Receptionist** | Manage reservations & orders | Tables, orders, reservations, payments, invoices |
| **Warehouse** | Manage inventory | Inventory operations only |
| **Customer** | End user | View menu, book tables, place orders, payment |

### Permission Matrix

| Feature | Manager | Receptionist | Warehouse | Customer |
|---------|---------|-------------|-----------|----------|
| View Tables | ✅ | ✅ | ❌ | ❌ |
| Manage Tables | ✅ | ❌ | ❌ | ❌ |
| Create Orders | ✅ | ✅ | ❌ | ✅ |
| Manage Orders | ✅ | ✅ | ❌ | 🔒 Own only |
| Create Reservations | ✅ | ✅ | ❌ | ✅ |
| Manage Reservations | ✅ | ✅ | ❌ | 🔒 Own only |
| View Inventory | ✅ | ❌ | ✅ | ❌ |
| Manage Inventory | ✅ | ❌ | ✅ | ❌ |
| Process Payments | ✅ | ✅ | ❌ | ✅ |
| View Reports | ✅ | 🔒 Limited | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |

---

## 🔌 Real-time Features

### Socket.IO Integration

The system uses Socket.IO for real-time updates across all connected clients.

#### Rooms

- **`table:{tableId}`** – Updates for specific table (orders, status changes)
- **`staff:receptionist`** – New reservations, new orders, table updates
- **`staff:kitchen`** – Confirmed orders ready for preparation
- **`staff:delivery`** – Orders ready for serving (if applicable)

#### Events

**Client → Server:**
```javascript
// Order updates
socket.emit('order:create', { tableId, items })
socket.emit('order:update-status', { orderId, status })

// Table updates
socket.emit('table:occupy', { tableId })
socket.emit('table:release', { tableId })

// Reservation updates
socket.emit('reservation:create', { data })
```

**Server → Client:**
```javascript
// Order notifications
socket.on('order:created', (order) => {})
socket.on('order:updated', (order) => {})

// Table updates
socket.on('table:status-changed', (table) => {})

// Reservation notifications
socket.on('reservation:created', (reservation) => {})
```

---

## 🎯 Project Roadmap

### Phase 1 - MVP (Current)
- [x] User authentication & role management
- [x] Table management
- [x] Order management
- [x] Reservation system
- [x] Basic payment integration

### Phase 2 - Enhancement
- [ ] Advanced reporting & analytics
- [ ] Inventory forecasting
- [ ] Customer loyalty program
- [ ] Multi-language support
- [ ] Mobile app (React Native)

### Phase 3 - Scale
- [ ] Multi-branch support
- [ ] Advanced analytics dashboard
- [ ] AI-powered recommendations
- [ ] Integration with external delivery services
- [ ] POS system integration

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork** the repository
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following the coding standards
4. **Commit with clear messages**:
   ```bash
   git commit -m "feat: Add new feature description"
   ```
5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request** with detailed description

### Coding Standards

#### Naming Conventions
- React Components: `PascalCase` (e.g., `MenuCard.tsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `useOrderStatus.ts`)
- API routes: `kebab-case` (e.g., `/api/menu-items`)
- Database tables: `snake_case` plural (e.g., `menu_items`)
- TypeScript types: `PascalCase` (e.g., `MenuItem`)

#### Code Guidelines
- ✅ Use `async/await` (not `.then().catch()`)
- ✅ Validate input with Zod before processing
- ✅ Use Prisma client (not raw SQL)
- ✅ Implement transactions for multi-table operations
- ✅ Use soft delete (`is_active = false`)
- ✅ Avoid `any` type in TypeScript
- ✅ Server Components by default in Next.js

#### API Response Format
```typescript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: "message", code: "ERROR_CODE" }
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
<type>(<scope>): <subject>

<body>
<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Example:**
```
feat(orders): Add order status filter for kitchen dashboard

- Implement status filter component
- Add filtering logic to order service
- Update kitchen dashboard display

Closes #123
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) – see the LICENSE file for details.

---

## 📞 Support

### Getting Help
- 📖 Check the [Documentation](./docs)
- 🐛 [Report a bug](https://github.com/thanhnhanvo192/Restaurant_TS/issues)
- 💡 [Request a feature](https://github.com/thanhnhanvo192/Restaurant_TS/issues)
- 💬 Reach out via GitHub Issues

### Useful Links
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Socket.IO Documentation](https://socket.io/docs/)

---

<div align="center">

**[⬆ back to top](#restaurant-management-system)**

Made with ❤️ by [thanhnhanvo192](https://github.com/thanhnhanvo192)

</div>
