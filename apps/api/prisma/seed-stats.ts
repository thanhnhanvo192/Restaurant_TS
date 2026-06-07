import { PrismaClient, TableSessionStatus, OrderStatus, InvoiceStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting historical statistics data seeding...");

  // 1. Fetch staff to assign to sessions/invoices
  const staff = await prisma.staff.findFirst({
    where: { role: { in: ["manager", "receptionist"] }, isActive: true },
  });

  if (!staff) {
    console.error("❌ No active manager or receptionist staff found. Please seed staff first using 'npm run prisma:seed'.");
    process.exit(1);
  }
  console.log(`✅ Selected staff for invoice association: ${staff.name} (ID: ${staff.id})`);

  // 2. Fetch active tables
  const tables = await prisma.table.findMany({
    where: { isActive: true },
  });

  if (tables.length === 0) {
    console.error("❌ No active tables found. Please seed tables first using 'npm run prisma:seed'.");
    process.exit(1);
  }
  console.log(`✅ Found ${tables.length} active tables.`);

  // 3. Fetch menu items
  const menuItems = await prisma.menuItem.findMany({
    where: { status: "available" },
  });

  if (menuItems.length === 0) {
    console.error("❌ No available menu items found. Please seed menu items first using 'npm run prisma:seed'.");
    process.exit(1);
  }
  console.log(`✅ Found ${menuItems.length} available menu items.`);

  // Clear existing sessions & invoices from the period to allow clean re-seeding
  const clearConfirm = process.argv.includes("--clean");
  if (clearConfirm) {
    console.log("🧹 Cleaning up old tables sessions, orders, and invoices...");
    // Due to cascade or constraints we delete invoices, payments, order_items, orders, then sessions
    await prisma.payment.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.tableSession.deleteMany({});
    console.log("✅ Cleanup done.");
  }

  // 4. Generate historical data for past 30 days
  const today = new Date();
  let totalSessionsCreated = 0;
  let totalOrdersCreated = 0;
  let totalInvoicesCreated = 0;

  for (let i = 30; i >= 0; i--) {
    const currentDate = new Date();
    currentDate.setDate(today.getDate() - i);
    
    // Format YYYY-MM-DD
    const dateStr = currentDate.toISOString().split("T")[0];
    
    // Vary the volume of orders by day of week (weekends have more sales)
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const sessionCount = isWeekend 
      ? Math.floor(Math.random() * 8) + 8   // 8 to 15 sessions on weekends
      : Math.floor(Math.random() * 5) + 3;  // 3 to 7 sessions on weekdays

    console.log(`⏳ Generating ${sessionCount} sessions for ${dateStr}...`);

    for (let s = 0; s < sessionCount; s++) {
      // Pick a random table
      const table = tables[Math.floor(Math.random() * tables.length)];

      // Generate random times
      const openedAt = new Date(currentDate);
      // Restaurant opens from 9 AM to 10 PM (9:00 to 22:00)
      const randomHour = Math.floor(Math.random() * 13) + 9; 
      const randomMin = Math.floor(Math.random() * 60);
      openedAt.setHours(randomHour, randomMin, 0, 0);

      const closedAt = new Date(openedAt);
      const durationHours = Math.floor(Math.random() * 2) + 1; // 1 to 2 hours dining
      const durationMins = Math.floor(Math.random() * 60);
      closedAt.setHours(openedAt.getHours() + durationHours, openedAt.getMinutes() + durationMins);

      // 4.a Create Table Session
      const session = await prisma.tableSession.create({
        data: {
          tableId: table.id,
          openedById: staff.id,
          openedAt,
          closedAt,
          status: TableSessionStatus.closed,
        },
      });
      totalSessionsCreated++;

      // 4.b Create 1 to 2 orders for this session
      const orderCount = Math.floor(Math.random() * 2) + 1;
      let sessionSubtotal = 0;

      for (let o = 0; o < orderCount; o++) {
        // Order time is between openedAt and closedAt
        const orderTime = new Date(openedAt);
        orderTime.setMinutes(openedAt.getMinutes() + Math.floor(Math.random() * 30));

        const order = await prisma.order.create({
          data: {
            sessionId: session.id,
            status: OrderStatus.served,
            createdAt: orderTime,
            updatedAt: orderTime,
          },
        });
        totalOrdersCreated++;

        // Create 2 to 5 items for the order
        const itemQuantity = Math.floor(Math.random() * 4) + 2;
        const selectedMenuItems = [...menuItems].sort(() => 0.5 - Math.random()).slice(0, itemQuantity);

        for (const item of selectedMenuItems) {
          const quantity = Math.floor(Math.random() * 3) + 1; // 1 to 3 of this item
          const price = Number(item.price);
          const subtotal = price * quantity;
          sessionSubtotal += subtotal;

          await prisma.orderItem.create({
            data: {
              orderId: order.id,
              menuItemId: item.id,
              quantity,
              unitPrice: item.price,
            },
          });
        }
      }

      // 4.c Create Invoice
      // Apply discount sometimes
      const discountPct = Math.random() > 0.8 ? (Math.random() > 0.5 ? 10 : 5) : 0;
      const discountAmount = (sessionSubtotal * discountPct) / 100;
      const total = sessionSubtotal - discountAmount;

      await prisma.invoice.create({
        data: {
          sessionId: session.id,
          createdById: staff.id,
          subtotal: sessionSubtotal,
          discountPct,
          discountAmount,
          total,
          status: InvoiceStatus.paid,
          createdAt: closedAt,
          paidAt: closedAt,
        },
      });
      totalInvoicesCreated++;
    }
  }

  console.log("\n🎉 Seeding completed successfully!");
  console.log(`📊 Created Table Sessions: ${totalSessionsCreated}`);
  console.log(`📊 Created Orders:         ${totalOrdersCreated}`);
  console.log(`📊 Created Paid Invoices:  ${totalInvoicesCreated}`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
