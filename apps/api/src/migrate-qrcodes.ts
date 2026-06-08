import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import QRCode from "qrcode";
import { uploadToCloudinary, deleteFromCloudinary } from "./utils/cloudinary";

const prisma = new PrismaClient();

async function runMigration() {
  console.log("=== Starting Table QR Code Migration to Cloudinary ===");

  const frontendUrl = process.env.FRONTEND_URL_QRCODE || "http://localhost:3000";
  console.log(`Using Frontend QR Base URL: ${frontendUrl}`);

  // Fetch all active tables
  const tables = await prisma.table.findMany({
    where: { isActive: true },
  });

  console.log(`Found ${tables.length} active tables to migrate.`);

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    console.log(`\n[${i + 1}/${tables.length}] Processing Table #${table.id} (Number: ${table.tableNumber})...`);

    try {
      const qrContent = `${frontendUrl}/table/${table.id}`;
      console.log(`- QR URL content: ${qrContent}`);

      // Generate base64 data URI
      const qrCodeBase64 = await QRCode.toDataURL(qrContent, {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 300,
        margin: 2,
      });

      // If there is an existing Cloudinary QR code, delete it
      if (table.qrCodeUrl && table.qrCodeUrl.startsWith("http")) {
        console.log(`- Found existing Cloudinary QR code, deleting it: ${table.qrCodeUrl}`);
        try {
          await deleteFromCloudinary(table.qrCodeUrl);
          console.log(`  ✅ Successfully deleted old QR from Cloudinary`);
        } catch (delErr) {
          console.error(`  ⚠️ Warning: Failed to delete old QR from Cloudinary:`, delErr);
        }
      }

      // Upload base64 QR to Cloudinary
      console.log(`- Uploading new QR to Cloudinary folder 'restaurant/qrcodes'...`);
      const uploadRes = await uploadToCloudinary(qrCodeBase64, "restaurant/qrcodes");
      console.log(`  ✅ Uploaded. Secure URL: ${uploadRes.secure_url}`);

      // Update database
      await prisma.table.update({
        where: { id: table.id },
        data: { qrCodeUrl: uploadRes.secure_url },
      });
      console.log(`  ✅ Database updated successfully.`);

    } catch (err) {
      console.error(`❌ Error migrating Table #${table.id}:`, err);
    }
  }

  console.log("\n=== QR Code Migration Completed! ===");
}

runMigration()
  .catch((err) => {
    console.error("Migration failed with fatal error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
