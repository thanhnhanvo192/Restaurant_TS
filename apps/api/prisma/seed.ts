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

  // Create 8 sample tables
  const tableConfigs = [
    { number: "T001", capacity: 4, location: "Window", notes: "Next to window" },
    { number: "T002", capacity: 6, location: "Corner", notes: "Corner area" },
    { number: "T003", capacity: 2, location: "Bar", notes: "At bar counter" },
    { number: "T004", capacity: 4, location: "Center", notes: "Central seating" },
    { number: "T005", capacity: 8, location: "Large Hall", notes: "Large group table" },
    { number: "T006", capacity: 2, location: "Entrance", notes: "Near entrance" },
    { number: "T007", capacity: 6, location: "Patio", notes: "Outdoor seating" },
    { number: "T008", capacity: 4, location: "Private Room", notes: "Semi-private area" },
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
