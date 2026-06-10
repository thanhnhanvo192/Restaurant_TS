import { PrismaClient } from "@prisma/client";
import { getSocketService } from "../socket";

const prisma = new PrismaClient();

export async function runScheduler() {
  try {
    const now = new Date();
    
    // Find active reservations for today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    
    const activeReservations = await prisma.reservation.findMany({
      where: {
        status: { in: ["confirmed", "pending"] },
        reservedDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        table: true,
        tableSession: true,
      }
    });

    let socketService: any = null;
    try {
      socketService = getSocketService();
    } catch (e) {
      // Safe to ignore in test/scripts environments
    }

    for (const res of activeReservations) {
      // Reconstruct reservation start datetime timezone-independently
      const resTime =
        res.reservedTime instanceof Date
          ? `${String(res.reservedTime.getUTCHours()).padStart(2, "0")}:${String(res.reservedTime.getUTCMinutes()).padStart(2, "0")}`
          : String(res.reservedTime);
      const [resHour, resMinute] = resTime.split(":").map(Number);
      
      const resYear = res.reservedDate.getUTCFullYear();
      const resMonth = res.reservedDate.getUTCMonth();
      const resDay = res.reservedDate.getUTCDate();
      const resDateTime = new Date(resYear, resMonth, resDay, resHour, resMinute, 0, 0);
      
      const diffMs = resDateTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (60 * 1000);
      
      // 1. "Tìm reservations confirmed có reserved_time trong 30 phút tới → Đổi table status → 'reserved'"
      if (res.status === "confirmed" && diffMinutes <= 30 && diffMinutes > -120) {
        if (res.table.status === "available") {
          await prisma.table.update({
            where: { id: res.tableId },
            data: { status: "reserved" },
          });
          console.log(`[Scheduler] Updated Table #${res.tableId} (${res.table.tableNumber}) status to 'reserved' due to Reservation #${res.id}`);
          
          if (socketService) {
            try {
              socketService.emitToReceptionists("table-status-changed", {
                tableId: res.tableId,
                status: "reserved",
              });
            } catch (e) {
              console.error("Socket emit failed in scheduler", e);
            }
          }
        }
      }
      
      // 2. "Tìm reservations đã qua 2 tiếng mà không có table_session → Đổi reservation status → 'no_show', Đổi table status → 'available'"
      if (diffMinutes <= -120 && !res.tableSession) {
        // Update reservation to no_show
        await prisma.reservation.update({
          where: { id: res.id },
          data: {
            status: "no_show",
            noShowAt: now,
          },
        });
        console.log(`[Scheduler] Marked Reservation #${res.id} as 'no_show'`);
        
        if (socketService) {
          try {
            socketService.emitToReceptionists("reservation-cancelled", {
              reservationId: res.id,
              status: "no_show",
            });
          } catch (e) {
            console.error("Socket emit failed in scheduler", e);
          }
        }

        // If the table status is 'reserved', free it (make it 'available')
        if (res.table.status === "reserved") {
          await prisma.table.update({
            where: { id: res.tableId },
            data: { status: "available" },
          });
          console.log(`[Scheduler] Reset Table #${res.tableId} (${res.table.tableNumber}) status to 'available' due to no_show`);
          
          if (socketService) {
            try {
              socketService.emitToReceptionists("table-status-changed", {
                tableId: res.tableId,
                status: "available",
              });
            } catch (e) {
              console.error("Socket emit failed in scheduler", e);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error in runScheduler:", error);
  }
}

export function startScheduler() {
  console.log("⏰ [Scheduler] Background status updater started (runs every 5 minutes)");
  // Run once immediately on start
  runScheduler().catch(console.error);
  
  // Set interval of 5 minutes
  setInterval(() => {
    runScheduler().catch(console.error);
  }, 5 * 60 * 1000);
}
