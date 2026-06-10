// ============ Users & Auth ============

export interface User {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  password?: string;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StaffRole = 'manager' | 'receptionist' | 'warehouse';

export interface Staff {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  password?: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ Tables & Reservations ============

export type TableStatus = 'available' | 'reserved' | 'occupied' | 'cleaning';

export interface Table {
  id: number;
  tableNumber: string;
  capacity: number;
  location?: string | null;
  status: TableStatus;
  qrCodeUrl?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Reservation {
  id: number;
  userId: number;
  tableId: number;
  reservedDate: string; // YYYY-MM-DD
  reservedTime: string; // HH:mm:ss or Full Date-Time
  guestCount: number;
  status: ReservationStatus;
  confirmedById?: number | null;
  customerNote?: string | null;
  staffNote?: string | null;
  durationMinutes?: number;
  noShowAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  table?: Table;
  confirmedBy?: Staff | null;
  tableSession?: TableSession | null;
}

export type TableSessionStatus = 'open' | 'closed';

export interface TableSession {
  id: number;
  tableId: number;
  reservationId?: number | null;
  openedById?: number | null;
  openedAt: string;
  closedAt?: string | null;
  status: TableSessionStatus;
  table?: Table;
  openedBy?: Staff | null;
  orders?: Order[];
  invoice?: Invoice | null;
}

// ============ Menu ============

export interface MenuCategory {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  menuItems?: MenuItem[];
}

export type MenuItemStatus = 'available' | 'unavailable';

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  status: MenuItemStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  category?: MenuCategory;
}

// ============ Orders ============

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'served' | 'cancelled';

export interface Order {
  id: number;
  sessionId: number;
  userId?: number | null;
  status: OrderStatus;
  confirmedById?: number | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  session?: TableSession;
  user?: User | null;
  confirmedBy?: Staff | null;
  orderItems?: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  menuItemId: number;
  quantity: number;
  unitPrice: number | string;
  note?: string | null;
  order?: Order;
  menuItem?: MenuItem;
}

// ============ Invoices & Payments ============

export type InvoiceStatus = 'unpaid' | 'paid' | 'cancelled';

export interface Invoice {
  id: number;
  sessionId: number;
  createdById: number;
  subtotal: number | string;
  discountPct: number | string;
  discountAmount: number | string;
  total: number | string;
  status: InvoiceStatus;
  notes?: string | null;
  createdAt: string;
  paidAt?: string | null;
  session?: TableSession;
  createdBy?: Staff;
  payments?: Payment[];
}

export type PaymentMethod = 'cash' | 'vnpay' | 'momo';
export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface Payment {
  id: number;
  invoiceId: number;
  method: PaymentMethod;
  amount: number | string;
  status: PaymentStatus;
  transactionId?: string | null;
  gatewayResponse?: any;
  createdAt: string;
  updatedAt: string;
  invoice?: Invoice;
}

// ============ Inventory ============

export type InventoryItemType = 'ingredient' | 'product';

export interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  itemType: InventoryItemType;
  currentQty: number | string;
  minQty: number | string;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
