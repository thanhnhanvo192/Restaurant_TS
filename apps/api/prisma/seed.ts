import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import QRCode from "qrcode";

const prisma = new PrismaClient();

async function generateQRCode(tableId: number): Promise<string> {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const qrContent = `${frontendUrl}/table/${tableId}`;

  return QRCode.toDataURL(qrContent, {
    errorCorrectionLevel: "H",
    type: "image/png",
    width: 300,
    margin: 2,
  });
}

async function main() {
  console.log("🌱 Seeding database...");

  // Hash password cho staff
  const hashedPassword = await bcrypt.hash("manager123", 10);

  // Create manager staff
  const manager = await prisma.staff.upsert({
    where: { email: "manager@restaurant.com" },
    update: {},
    create: {
      name: "Manager Account",
      email: "manager@restaurant.com",
      phone: "0901234567",
      password: hashedPassword,
      role: "manager",
      isActive: true,
    },
  });

  console.log("✅ Manager created:", manager);

  // Create warehouse staff
  const warehouse = await prisma.staff.upsert({
    where: { email: "warehouse@restaurant.com" },
    update: {},
    create: {
      name: "Warehouse Staff",
      email: "warehouse@restaurant.com",
      phone: "0902345678",
      password: hashedPassword,
      role: "warehouse",
      isActive: true,
    },
  });

  console.log("✅ Warehouse staff created:", warehouse);

  // Create receptionist staff
  const receptionist = await prisma.staff.upsert({
    where: { email: "receptionist@restaurant.com" },
    update: {},
    create: {
      name: "Receptionist Staff",
      email: "receptionist@restaurant.com",
      phone: "0903456789",
      password: hashedPassword,
      role: "receptionist",
      isActive: true,
    },
  });

  console.log("✅ Receptionist staff created:", receptionist);

  // Create 8 sample tables
  const tableConfigs = [
    {
      number: "T001",
      capacity: 4,
      location: "Window",
      notes: "Next to window",
    },
    { number: "T002", capacity: 6, location: "Corner", notes: "Corner area" },
    { number: "T003", capacity: 2, location: "Bar", notes: "At bar counter" },
    {
      number: "T004",
      capacity: 4,
      location: "Center",
      notes: "Central seating",
    },
    {
      number: "T005",
      capacity: 8,
      location: "Large Hall",
      notes: "Large group table",
    },
    {
      number: "T006",
      capacity: 2,
      location: "Entrance",
      notes: "Near entrance",
    },
    {
      number: "T007",
      capacity: 6,
      location: "Patio",
      notes: "Outdoor seating",
    },
    {
      number: "T008",
      capacity: 4,
      location: "Private Room",
      notes: "Semi-private area",
    },
  ];

  const tables = await Promise.all(
    tableConfigs.map((config) =>
      prisma.table.upsert({
        where: { tableNumber: config.number },
        update: {},
        create: {
          tableNumber: config.number,
          capacity: config.capacity,
          location: config.location,
          notes: config.notes,
          status: "available",
        },
      }),
    ),
  );

  console.log("✅ Tables created:", tables.length);

  // Generate QR codes for all tables
  console.log("📱 Generating QR codes...");
  const tablesWithQR = await Promise.all(
    tables.map(async (table) => {
      const qrCodeUrl = await generateQRCode(table.id);
      return prisma.table.update({
        where: { id: table.id },
        data: { qrCodeUrl },
      });
    }),
  );

  console.log("✅ QR codes generated for", tablesWithQR.length, "tables");

  // ============ Menu Seeding ============

  console.log("🍽️  Creating menu categories...");

  const categories = await Promise.all([
    prisma.menuCategory.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: "Khai vị",
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.menuCategory.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        name: "Món chính",
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.menuCategory.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        name: "Đồ uống",
        sortOrder: 3,
        isActive: true,
      },
    }),
  ]);

  console.log("✅ Menu categories created:", categories.length);

  // Create 10 sample menu items
  console.log("🍽️  Creating menu items...");

  const menuItems = await Promise.all([
    // Khai vị (3 items)
    prisma.menuItem.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        categoryId: 1,
        name: "Gỏi cuốn tôm",
        description: "Gỏi cuốn tôm tươi với rau sống",
        price: "45000",
        status: "available",
        sortOrder: 1,
      },
    }),
    prisma.menuItem.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        categoryId: 1,
        name: "Chả cua",
        description: "Chả cua nước giòn ngoài mềm trong",
        price: "55000",
        status: "available",
        sortOrder: 2,
      },
    }),
    prisma.menuItem.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        categoryId: 1,
        name: "Canh cua cà chua",
        description: "Canh cua tươi nấu cà chua chua thanh",
        price: "65000",
        status: "available",
        sortOrder: 3,
      },
    }),

    // Món chính (5 items)
    prisma.menuItem.upsert({
      where: { id: 4 },
      update: {},
      create: {
        id: 4,
        categoryId: 2,
        name: "Cơm tấm sườn nướng",
        description: "Cơm tấm được caramel, sườn nướng thơm lạ",
        price: "85000",
        status: "available",
        sortOrder: 1,
      },
    }),
    prisma.menuItem.upsert({
      where: { id: 5 },
      update: {},
      create: {
        id: 5,
        categoryId: 2,
        name: "Mì Hoàng Kim",
        description: "Mì trứng chiên khoai lang nóng",
        price: "75000",
        status: "available",
        sortOrder: 2,
      },
    }),
    prisma.menuItem.upsert({
      where: { id: 6 },
      update: {},
      create: {
        id: 6,
        categoryId: 2,
        name: "Bún chả Hà Nội",
        description: "Bún tươi, chả nướng, thịt nướng",
        price: "80000",
        status: "available",
        sortOrder: 3,
      },
    }),
    prisma.menuItem.upsert({
      where: { id: 7 },
      update: {},
      create: {
        id: 7,
        categoryId: 2,
        name: "Phở bò",
        description: "Phở bò nấu 12 tiếng, hương vị đậm đà",
        price: "70000",
        status: "available",
        sortOrder: 4,
      },
    }),
    prisma.menuItem.upsert({
      where: { id: 8 },
      update: {},
      create: {
        id: 8,
        categoryId: 2,
        name: "Cá kho tộ",
        description: "Cá kho tộ nấu với cà rốt, dứa",
        price: "95000",
        status: "available",
        sortOrder: 5,
      },
    }),

    // Đồ uống (2 items)
    prisma.menuItem.upsert({
      where: { id: 9 },
      update: {},
      create: {
        id: 9,
        categoryId: 3,
        name: "Nước chanh tươi",
        description: "Nước chanh tươi ép ngay, đá",
        price: "20000",
        status: "available",
        sortOrder: 1,
      },
    }),
    prisma.menuItem.upsert({
      where: { id: 10 },
      update: {},
      create: {
        id: 10,
        categoryId: 3,
        name: "Cà phê đen",
        description: "Cà phê đen pha phin, nóng",
        price: "18000",
        status: "available",
        sortOrder: 2,
      },
    }),
  ]);

  console.log("✅ Menu items created:", menuItems.length);

  // ============ Inventory Seeding ============

  console.log("📦 Creating inventory items...");

  // Lấy manager staff để sử dụng khi tạo transaction
  const staffId = manager.id;

  const inventoryItems = await Promise.all([
    // Ingredients (3 items)
    prisma.inventoryItem.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: "Tỏi (Garlic)",
        unit: "kg",
        itemType: "ingredient",
        currentQty: "5.5",
        minQty: "2.0",
        notes: "Fresh garlic from local supplier",
        isActive: true,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        name: "Hành tây (Onion)",
        unit: "kg",
        itemType: "ingredient",
        currentQty: "3.0",
        minQty: "1.5",
        notes: "White onion",
        isActive: true,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        name: "Muối (Salt)",
        unit: "kg",
        itemType: "ingredient",
        currentQty: "8.0",
        minQty: "3.0",
        notes: "Sea salt for cooking",
        isActive: true,
      },
    }),

    // Products (2 items)
    prisma.inventoryItem.upsert({
      where: { id: 4 },
      update: {},
      create: {
        id: 4,
        name: "Dầu ăn (Cooking Oil)",
        unit: "liter",
        itemType: "product",
        currentQty: "12.0",
        minQty: "5.0",
        notes: "Vegetable oil for cooking",
        isActive: true,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { id: 5 },
      update: {},
      create: {
        id: 5,
        name: "Đường (Sugar)",
        unit: "kg",
        itemType: "product",
        currentQty: "2.5",
        minQty: "1.0",
        notes: "White sugar",
        isActive: true,
      },
    }),
  ]);

  console.log("✅ Inventory items created:", inventoryItems.length);

  // Create sample inventory transactions for tracking
  console.log("📝 Creating sample inventory transactions...");

  const sampleTransactions = await Promise.all([
    // Transaction for garlic (incoming)
    prisma.inventoryTransaction.create({
      data: {
        itemId: inventoryItems[0].id,
        type: "in",
        quantity: "5.5",
        qtyBefore: "0",
        qtyAfter: "5.5",
        supplier: "Local Market",
        unitCost: "15000",
        note: "Initial stock - Garlic",
        createdById: staffId,
      },
    }),
    // Transaction for onion (incoming)
    prisma.inventoryTransaction.create({
      data: {
        itemId: inventoryItems[1].id,
        type: "in",
        quantity: "3.0",
        qtyBefore: "0",
        qtyAfter: "3.0",
        supplier: "Wholesale Vendor",
        unitCost: "8000",
        note: "Initial stock - Onion",
        createdById: staffId,
      },
    }),
    // Transaction for salt (incoming)
    prisma.inventoryTransaction.create({
      data: {
        itemId: inventoryItems[2].id,
        type: "in",
        quantity: "8.0",
        qtyBefore: "0",
        qtyAfter: "8.0",
        supplier: "Salt Supplier",
        unitCost: "5000",
        note: "Initial stock - Salt",
        createdById: staffId,
      },
    }),
    // Transaction for cooking oil (incoming)
    prisma.inventoryTransaction.create({
      data: {
        itemId: inventoryItems[3].id,
        type: "in",
        quantity: "12.0",
        qtyBefore: "0",
        qtyAfter: "12.0",
        supplier: "Oil Distributor",
        unitCost: "25000",
        note: "Initial stock - Cooking Oil",
        createdById: staffId,
      },
    }),
    // Transaction for sugar (incoming)
    prisma.inventoryTransaction.create({
      data: {
        itemId: inventoryItems[4].id,
        type: "in",
        quantity: "2.5",
        qtyBefore: "0",
        qtyAfter: "2.5",
        supplier: "Sugar Distributor",
        unitCost: "12000",
        note: "Initial stock - Sugar",
        createdById: staffId,
      },
    }),
  ]);

  console.log("✅ Inventory transactions created:", sampleTransactions.length);

  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
