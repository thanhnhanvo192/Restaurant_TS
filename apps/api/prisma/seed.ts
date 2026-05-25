import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Hash password cho manager
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

  // Create sample tables
  const tables = await Promise.all([
    prisma.table.upsert({
      where: { tableNumber: "T001" },
      update: {},
      create: {
        tableNumber: "T001",
        capacity: 4,
        location: "Window",
        status: "available",
      },
    }),
    prisma.table.upsert({
      where: { tableNumber: "T002" },
      update: {},
      create: {
        tableNumber: "T002",
        capacity: 6,
        location: "Corner",
        status: "available",
      },
    }),
    prisma.table.upsert({
      where: { tableNumber: "T003" },
      update: {},
      create: {
        tableNumber: "T003",
        capacity: 2,
        location: "Bar",
        status: "available",
      },
    }),
  ]);

  console.log("✅ Tables created:", tables.length);

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
