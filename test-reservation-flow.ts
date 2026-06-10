import { PrismaClient } from "@prisma/client";
import { runScheduler } from "./apps/api/src/utils/scheduler.js";
import { isTableAvailable } from "./apps/api/src/controllers/reservation.controller.js";
import { openSession } from "./apps/api/src/controllers/tableSession.controller.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Reservation Flow Verification...\n");

  // 1. Clean up old test data
  await prisma.reservation.deleteMany({
    where: {
      table: {
        tableNumber: "TEST99"
      }
    }
  });
  await prisma.tableSession.deleteMany({
    where: {
      table: {
        tableNumber: "TEST99"
      }
    }
  });
  await prisma.table.deleteMany({
    where: {
      tableNumber: "TEST99"
    }
  });

  // 2. Find or create a test user
  let user = await prisma.user.findFirst({
    where: { email: "test_customer@example.com" }
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Test Customer",
        email: "test_customer@example.com",
        phone: "0999999999",
        password: "password123",
        isActive: true
      }
    });
  }

  // 3. Create the test table (capacity 4)
  const table = await prisma.table.create({
    data: {
      tableNumber: "TEST99",
      capacity: 4,
      location: "Main Hall",
      status: "available",
      isActive: true
    }
  });
  console.log(`✅ Test Table created: ${table.tableNumber} (Capacity: ${table.capacity})`);

  // We will perform the scenario matching the user prompt:
  // Today's Date: YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];
  console.log(`📅 Testing for date: ${todayStr}`);

  // Scenario step 1: Khách A muốn đặt bàn lúc 19:00
  // Verify it is available before booking
  let available = await isTableAvailable(table.id, todayStr, "19:00", 4);
  console.log(`\n1. Checking availability for 19:00 slot:`);
  console.log(`   Available? ${available} (Expected: true)`);
  if (!available) throw new Error("19:00 slot should be available!");

  // Khách A đặt bàn lúc 19:00
  // We insert a confirmed reservation directly
  const resATime = new Date("2000-01-01T19:00:00Z");
  const resA = await prisma.reservation.create({
    data: {
      userId: user.id,
      tableId: table.id,
      reservedDate: new Date(todayStr),
      reservedTime: resATime,
      guestCount: 4,
      status: "confirmed",
      durationMinutes: 120
    }
  });
  console.log(`   Created confirmed Reservation A (#${resA.id}) for 19:00`);

  // Verify Table 1 status remains AVAILABLE
  const tableCheck1 = await prisma.table.findUnique({ where: { id: table.id } });
  console.log(`   Table status after booking: ${tableCheck1?.status} (Expected: available)`);
  if (tableCheck1?.status !== "available") throw new Error("Table status should remain available!");

  // Scenario step 2: 15:30 — Khách B muốn đặt bàn lúc 15:30
  // Let's check availability for 15:30 to 17:30
  available = await isTableAvailable(table.id, todayStr, "15:30", 4);
  console.log(`\n2. Checking availability for 15:30 slot:`);
  console.log(`   Available? ${available} (Expected: true)`);
  if (!available) throw new Error("15:30 slot should be available!");

  // Scenario step 3: 17:00 — Bàn 1 tự động đổi sang RESERVED (trước 2 giờ)
  // To test the scheduler logic, we will mock the current time.
  const now = new Date();
  const soon = new Date(now.getTime() + 25 * 60 * 1000); // 25 minutes from now
  const soonTimeStr = `${String(soon.getHours()).padStart(2, "0")}:${String(soon.getMinutes()).padStart(2, "0")}`;
  console.log(`\n3. Testing scheduler upcoming reservation auto-block (within 30 mins):`);
  console.log(`   Current actual time: ${now.toTimeString()}`);
  console.log(`   Creating upcoming reservation at: ${soonTimeStr}`);

  const resUpcoming = await prisma.reservation.create({
    data: {
      userId: user.id,
      tableId: table.id,
      reservedDate: new Date(todayStr),
      reservedTime: new Date(`2000-01-01T${soonTimeStr}:00Z`),
      guestCount: 4,
      status: "confirmed",
      durationMinutes: 120
    }
  });

  // Run the scheduler
  console.log(`   Running scheduler...`);
  await runScheduler();

  // Verify Table status has become 'reserved'
  const tableCheck2 = await prisma.table.findUnique({ where: { id: table.id } });
  console.log(`   Table status after scheduler run: ${tableCheck2?.status} (Expected: reserved)`);
  if (tableCheck2?.status !== "reserved") throw new Error("Table status should have changed to 'reserved'!");

  // Scenario step 4: 19:00 — Khách A đến, quét QR -> tạo table_session -> Bàn 1 -> OCCUPIED
  console.log(`\n4. Testing open session on reserved table:`);
  
  let responseData: any = null;
  const req = {
    params: { tableId: String(table.id) },
    body: { reservationId: resUpcoming.id }
  } as any;
  const res = {
    status: (code: number) => ({
      json: (data: any) => { responseData = data; }
    })
  } as any;
  const next = (err: any) => { console.error("next called with", err); };

  await openSession(req, res, next);
  console.log(`   openSession response:`, responseData);
  if (!responseData?.success) throw new Error("Failed to open session on reserved table!");

  // Verify Table status has become 'occupied'
  const tableCheck3 = await prisma.table.findUnique({ where: { id: table.id } });
  console.log(`   Table status after openSession: ${tableCheck3?.status} (Expected: occupied)`);
  if (tableCheck3?.status !== "occupied") throw new Error("Table status should have changed to 'occupied'!");

  // Scenario step 5: 21:00 — Nếu Khách A không đến (no-show) -> System tự đổi bàn 1 -> AVAILABLE, Reservation -> NO_SHOW
  console.log(`\n5. Testing scheduler no-show handler (2 hours past):`);
  // Clean up session and reset table to reserved
  await prisma.tableSession.deleteMany({ where: { tableId: table.id } });
  await prisma.table.update({ where: { id: table.id }, data: { status: "reserved" } });
  
  // Set reservation to 2.5 hours in the past
  const past = new Date(now.getTime() - 2.5 * 60 * 60 * 1000);
  const pastTimeStr = `${String(past.getHours()).padStart(2, "0")}:${String(past.getMinutes()).padStart(2, "0")}`;
  console.log(`   Updating reservation time to past: ${pastTimeStr}`);
  
  await prisma.reservation.update({
    where: { id: resUpcoming.id },
    data: {
      reservedTime: new Date(`2000-01-01T${pastTimeStr}:00Z`),
      status: "confirmed"
    }
  });

  // Run the scheduler
  console.log(`   Running scheduler...`);
  await runScheduler();

  // Verify reservation is marked as no_show
  const resCheck = await prisma.reservation.findUnique({ where: { id: resUpcoming.id } });
  console.log(`   Reservation status: ${resCheck?.status} (Expected: no_show)`);
  if (resCheck?.status !== "no_show") throw new Error("Reservation should be marked as 'no_show'!");

  // Verify table is marked as available
  const tableCheck4 = await prisma.table.findUnique({ where: { id: table.id } });
  console.log(`   Table status: ${tableCheck4?.status} (Expected: available)`);
  if (tableCheck4?.status !== "available") throw new Error("Table status should have changed to 'available'!");

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Flow operates exactly as expected.");
}

main()
  .catch((e) => {
    console.error("\n❌ TEST FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    // Clean up test table
    await prisma.reservation.deleteMany({
      where: {
        table: {
          tableNumber: "TEST99"
        }
      }
    });
    await prisma.tableSession.deleteMany({
      where: {
        table: {
          tableNumber: "TEST99"
        }
      }
    });
    await prisma.table.deleteMany({
      where: {
        tableNumber: "TEST99"
      }
    });
    await prisma.$disconnect();
  });
