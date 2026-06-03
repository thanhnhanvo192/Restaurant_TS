import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

// ============ Types ============

interface RevenueSummaryResponse {
  total_revenue: number;
  total_orders: number;
  total_tables_served: number;
}

interface RevenueChartItem {
  date: string;
  revenue: number;
  order_count: number;
}

interface TopItemResponse {
  menu_item_id: number;
  name: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
}

// ============ Helper: Get date range based on period ============

function getDateRange(period: "today" | "week" | "month"): [Date, Date] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let startDate = new Date(now);

  switch (period) {
    case "today":
      break; // startDate is already today 00:00
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
  }

  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  return [startDate, endDate];
}

// ============ getRevenueSummary ============

export async function getRevenueSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { period = "today" } = req.query;

    if (!["today", "week", "month"].includes(period as string)) {
      res.status(400).json({
        success: false,
        error: "Invalid period. Use: today, week, month",
        code: "INVALID_PERIOD",
      });
      return;
    }

    const [startDate, endDate] = getDateRange(
      period as "today" | "week" | "month",
    );

    // Get total revenue (sum of paid invoices)
    const revenueResult = await prisma.invoice.aggregate({
      where: {
        status: "paid",
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        total: true,
      },
    });

    const totalRevenue = revenueResult._sum.total
      ? parseFloat(revenueResult._sum.total.toString())
      : 0;

    // Get total orders served (count distinct orders with status='served')
    const servedOrdersCount = await prisma.order.count({
      where: {
        status: "served",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get total tables served (count distinct session_id from paid invoices)
    const tableServedCount = await prisma.invoice.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        sessionId: true,
      },
      distinct: ["sessionId"],
    });

    const response: RevenueSummaryResponse = {
      total_revenue: totalRevenue,
      total_orders: servedOrdersCount,
      total_tables_served: tableServedCount.length,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
}

// ============ getRevenueChart ============

export async function getRevenueChart(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { days = "30" } = req.query;
    const numDays = parseInt(days as string, 10);

    if (isNaN(numDays) || numDays < 1) {
      res.status(400).json({
        success: false,
        error: "days must be a positive integer",
        code: "INVALID_DAYS",
      });
      return;
    }

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays + 1);
    startDate.setHours(0, 0, 0, 0);

    // Query paid invoices using raw query with template literal
    const invoicesByDate = (await prisma.$queryRaw`
      SELECT
        DATE(invoices.paid_at) as date,
        COALESCE(SUM(invoices.total), 0) as total_revenue,
        COUNT(DISTINCT invoices.session_id) as order_count
      FROM invoices
      WHERE invoices.status = 'paid'
        AND invoices.paid_at >= ${startDate}
        AND invoices.paid_at <= ${endDate}
      GROUP BY DATE(invoices.paid_at)
      ORDER BY date ASC
    `) as Array<{
      date: Date;
      total_revenue: Decimal;
      order_count: bigint;
    }>;

    // Create a map of existing data
    const dataMap = new Map<string, { revenue: number; order_count: number }>();
    invoicesByDate.forEach((row) => {
      const dateStr = new Date(row.date).toISOString().split("T")[0];
      dataMap.set(dateStr, {
        revenue: parseFloat(row.total_revenue.toString()),
        order_count: parseInt(row.order_count.toString(), 10),
      });
    });

    // Generate array of all dates in range, filling gaps with 0
    const chart: RevenueChartItem[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const existing = dataMap.get(dateStr);

      chart.push({
        date: dateStr,
        revenue: existing?.revenue ?? 0,
        order_count: existing?.order_count ?? 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      data: chart,
    });
  } catch (error) {
    next(error);
  }
}

// ============ getTopItems ============

export async function getTopItems(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { from, to, limit = "10" } = req.query;
    const numLimit = parseInt(limit as string, 10);

    if (isNaN(numLimit) || numLimit < 1) {
      res.status(400).json({
        success: false,
        error: "limit must be a positive integer",
        code: "INVALID_LIMIT",
      });
      return;
    }

    // Parse date range if provided
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (from && to) {
      fromDate = new Date(from as string);
      toDate = new Date(to as string);
      toDate.setHours(23, 59, 59, 999);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        res.status(400).json({
          success: false,
          error: "Invalid date format for from or to",
          code: "INVALID_DATE",
        });
        return;
      }
    }

    let topItems;

    if (fromDate && toDate) {
      topItems = (await prisma.$queryRaw`
        SELECT
          mi.id as menu_item_id,
          mi.name,
          mc.name as category,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.quantity * oi.unit_price) as total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        JOIN menu_categories mc ON mi.category_id = mc.id
        JOIN table_sessions ts ON o.session_id = ts.id
        JOIN invoices ON invoices.session_id = ts.id
        WHERE o.status = 'served'
          AND invoices.status = 'paid'
          AND invoices.paid_at >= ${fromDate}
          AND invoices.paid_at <= ${toDate}
        GROUP BY mi.id, mi.name, mc.name
        ORDER BY total_quantity DESC
        LIMIT ${numLimit}
      `) as Array<{
        menu_item_id: number;
        name: string;
        category: string;
        total_quantity: bigint;
        total_revenue: Decimal;
      }>;
    } else {
      topItems = (await prisma.$queryRaw`
        SELECT
          mi.id as menu_item_id,
          mi.name,
          mc.name as category,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.quantity * oi.unit_price) as total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        JOIN menu_categories mc ON mi.category_id = mc.id
        JOIN table_sessions ts ON o.session_id = ts.id
        JOIN invoices ON invoices.session_id = ts.id
        WHERE o.status = 'served'
          AND invoices.status = 'paid'
        GROUP BY mi.id, mi.name, mc.name
        ORDER BY total_quantity DESC
        LIMIT ${numLimit}
      `) as Array<{
        menu_item_id: number;
        name: string;
        category: string;
        total_quantity: bigint;
        total_revenue: Decimal;
      }>;
    }

    const response: TopItemResponse[] = topItems.map((item) => ({
      menu_item_id: item.menu_item_id,
      name: item.name,
      category: item.category,
      total_quantity: parseInt(item.total_quantity.toString(), 10),
      total_revenue: parseFloat(item.total_revenue.toString()),
    }));

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
}
