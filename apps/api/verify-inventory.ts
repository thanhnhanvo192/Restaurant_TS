import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyData() {
  console.log("\n📊 VERIFYING INVENTORY DATA IN DATABASE\n");

  // Get all inventory items
  const items = await prisma.inventoryItem.findMany({
    include: {
      transactions: true,
    },
  });

  console.log("═══════════════════════════════════════════════════════════");
  console.log("INVENTORY ITEMS");
  console.log("═══════════════════════════════════════════════════════════\n");

  items.forEach((item) => {
    console.log(`📦 ${item.name} (ID: ${item.id})`);
    console.log(`   Type: ${item.itemType}`);
    console.log(`   Unit: ${item.unit}`);
    console.log(`   Current Qty: ${item.currentQty}`);
    console.log(`   Min Qty: ${item.minQty}`);
    console.log(`   Transactions: ${item.transactions.length} record(s)`);
    console.log();
  });

  // Get all transactions with details
  const transactions = await prisma.inventoryTransaction.findMany({
    include: {
      item: {
        select: { name: true },
      },
      createdBy: {
        select: { name: true, role: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("═══════════════════════════════════════════════════════════");
  console.log("INVENTORY TRANSACTIONS HISTORY");
  console.log("═══════════════════════════════════════════════════════════\n");

  transactions.forEach((tx) => {
    console.log(`📝 Transaction ID: ${tx.id}`);
    console.log(`   Item: ${tx.item.name}`);
    console.log(`   Type: ${tx.type}`);
    console.log(`   Qty: ${tx.qtyBefore} → ${tx.qtyAfter}`);
    console.log(`   Change: ${tx.quantity}`);
    if (tx.supplier) console.log(`   Supplier: ${tx.supplier}`);
    if (tx.unitCost) console.log(`   Unit Cost: ${tx.unitCost}`);
    if (tx.note) console.log(`   Note: ${tx.note}`);
    console.log(`   Created By: ${tx.createdBy.name} (${tx.createdBy.role})`);
    console.log(`   Date: ${new Date(tx.createdAt).toLocaleString()}`);
    console.log();
  });

  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ VERIFICATION COMPLETE");
  console.log("═══════════════════════════════════════════════════════════\n");

  await prisma.$disconnect();
}

verifyData().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
