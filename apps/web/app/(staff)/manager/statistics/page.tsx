"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  UtensilsCrossed, 
  Loader2, 
  Calendar,
  AlertCircle,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
  Layers
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell 
} from "recharts";
import { toast } from "sonner";

interface StatData {
  total_revenue: number;
  total_orders: number;
  total_tables_served: number;
}

interface RevenueChartItem {
  date: string;
  revenue: number;
  order_count: number;
}

interface TopItem {
  menu_item_id: number;
  name: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
}

interface InventoryStatData {
  total_import_value: number;
  total_import_qty: number;
  total_export_qty: number;
  total_import_transactions: number;
  total_export_transactions: number;
  total_adjustment_transactions: number;
  top_imported_items: Array<{
    itemId: number;
    name: string;
    unit: string;
    total_quantity: number;
    total_value: number;
  }>;
  top_exported_items: Array<{
    itemId: number;
    name: string;
    unit: string;
    total_quantity: number;
  }>;
}

interface InventoryChartItem {
  date: string;
  import_value: number;
  import_qty: number;
  export_qty: number;
}

export default function ManagerStatisticsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [statsToday, setStatsToday] = useState<StatData | null>(null);
  const [statsWeek, setStatsWeek] = useState<StatData | null>(null);
  const [statsMonth, setStatsMonth] = useState<StatData | null>(null);
  const [chartData, setChartData] = useState<RevenueChartItem[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);

  // Inventory stats states
  const [activeTab, setActiveTab] = useState<"sales" | "inventory">("sales");
  const [inventoryPeriod, setInventoryPeriod] = useState<"today" | "week" | "month">("month");
  const [inventoryStats, setInventoryStats] = useState<InventoryStatData | null>(null);
  const [inventoryChartData, setInventoryChartData] = useState<InventoryChartItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchInventoryData = async (period: "today" | "week" | "month" = inventoryPeriod) => {
    setIsLoadingInventory(true);
    try {
      const [resSummary, resChart] = await Promise.all([
        api.get(`/api/stats/inventory?period=${period}`),
        api.get(`/api/stats/inventory-chart?days=30`)
      ]);
      setInventoryStats(resSummary.data.data);
      setInventoryChartData(resChart.data.data);
    } catch (err: any) {
      console.error(err);
      toast.error("Tải dữ liệu thống kê kho thất bại!");
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        resToday,
        resWeek,
        resMonth,
        resChart,
        resTopItems
      ] = await Promise.all([
        api.get("/api/stats/revenue?period=today"),
        api.get("/api/stats/revenue?period=week"),
        api.get("/api/stats/revenue?period=month"),
        api.get("/api/stats/revenue-chart?days=30"),
        api.get("/api/stats/top-items?limit=5")
      ]);

      setStatsToday(resToday.data.data);
      setStatsWeek(resWeek.data.data);
      setStatsMonth(resMonth.data.data);
      setChartData(resChart.data.data);
      setTopItems(resTopItems.data.data);
    } catch (err: any) {
      console.error(err);
      setError("Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.");
      toast.error("Tải dữ liệu dashboard thất bại!");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted) {
      fetchDashboardData();
      fetchInventoryData();
    }
  }, [isMounted]);

  // Format date helper (YYYY-MM-DD -> DD/MM)
  const formatDateLabel = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  // Format currency helper
  const formatCurrency = (value: number) => {
    return value.toLocaleString("vi-VN") + " đ";
  };

  if (!isMounted) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-zinc-950 text-zinc-100">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stat Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-zinc-800 bg-zinc-900 animate-pulse">
              <CardContent className="h-28" />
            </Card>
          ))}
        </div>
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900 animate-pulse h-96" />
          <Card className="border-zinc-800 bg-zinc-900 animate-pulse h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-[50vh] items-center justify-center border border-zinc-800 bg-zinc-900/50 rounded-2xl p-6 text-center max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Đã xảy ra lỗi</h3>
        <p className="text-sm text-zinc-400 mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-amber-500 text-zinc-950 font-semibold rounded-xl hover:bg-amber-600 cursor-pointer transition"
        >
          Tải lại dữ liệu
        </button>
      </div>
    );
  }

  // Predefined colors for BarChart cells
  const BAR_COLORS = ["#f59e0b", "#fb923c", "#f97316", "#ea580c", "#d97706"];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("sales")}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "sales"
              ? "border-amber-500 text-amber-500 font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Doanh thu & Bán chạy
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "inventory"
              ? "border-amber-500 text-amber-500 font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Xuất nhập kho
        </button>
      </div>

      {activeTab === "sales" ? (
        <div className="space-y-6">
          {/* 3 Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Today */}
            <Card className="border-zinc-800 bg-zinc-900 shadow-md hover:border-zinc-700 transition duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-semibold text-zinc-400">Doanh thu hôm nay</CardTitle>
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white font-heading">
                  {formatCurrency(statsToday?.total_revenue || 0)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Đơn đã phục vụ: <span className="text-zinc-300 font-bold">{statsToday?.total_orders || 0}</span> • 
                  Bàn: <span className="text-zinc-300 font-bold">{statsToday?.total_tables_served || 0}</span>
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Week */}
            <Card className="border-zinc-800 bg-zinc-900 shadow-md hover:border-zinc-700 transition duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-semibold text-zinc-400">Doanh thu tuần này</CardTitle>
                <div className="p-2 bg-orange-500/10 text-orange-405 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white font-heading">
                  {formatCurrency(statsWeek?.total_revenue || 0)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Đơn đã phục vụ: <span className="text-zinc-300 font-bold">{statsWeek?.total_orders || 0}</span> • 
                  Bàn: <span className="text-zinc-300 font-bold">{statsWeek?.total_tables_served || 0}</span>
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Month */}
            <Card className="border-zinc-800 bg-zinc-900 shadow-md hover:border-zinc-700 transition duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-semibold text-zinc-400">Doanh thu tháng này</CardTitle>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white font-heading">
                  {formatCurrency(statsMonth?.total_revenue || 0)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Đơn đã phục vụ: <span className="text-zinc-300 font-bold">{statsMonth?.total_orders || 0}</span> • 
                  Bàn: <span className="text-zinc-300 font-bold">{statsMonth?.total_tables_served || 0}</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LineChart - Revenue 30 Days */}
            <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900 shadow-md">
              <CardHeader>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  Biểu đồ doanh thu 30 ngày qua
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height={320} minWidth={0}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDateLabel} 
                        stroke="#71717a" 
                        tickLine={false} 
                        fontSize={11}
                      />
                      <YAxis 
                        stroke="#71717a" 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v.toLocaleString())}
                        fontSize={11}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "12px" }}
                        labelClassName="text-zinc-400 text-xs font-bold"
                        formatter={(value: any) => [formatCurrency(value as number), "Doanh thu"]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#f59e0b" 
                        strokeWidth={2.5}
                        dot={{ r: 2, fill: "#f59e0b", stroke: "#f59e0b", strokeWidth: 1 }}
                        activeDot={{ r: 6 }}
                        fill="url(#colorRevenue)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* BarChart - Top 5 Best Sellers */}
            <Card className="border-zinc-800 bg-zinc-900 shadow-md">
              <CardHeader>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-orange-455" />
                  Top 5 món bán chạy nhất
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {topItems.length === 0 ? (
                  <div className="h-80 flex flex-col items-center justify-center text-zinc-500">
                    <ShoppingBag className="w-10 h-10 opacity-30 mb-2" />
                    <p className="text-sm">Chưa có dữ liệu bán chạy.</p>
                  </div>
                ) : (
                  <div className="h-80 w-full flex flex-col justify-between">
                    <ResponsiveContainer width="100%" height={220} minWidth={0}>
                      <BarChart
                        data={topItems}
                        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#71717a" 
                          tickLine={false} 
                          fontSize={10}
                          tick={false}
                        />
                        <YAxis 
                          stroke="#71717a" 
                          tickLine={false} 
                          axisLine={false}
                          fontSize={11}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "12px" }}
                          labelClassName="text-zinc-200 text-xs font-bold"
                          formatter={(value: any) => [`${value} phần`, "Số lượng"]}
                        />
                        <Bar dataKey="total_quantity" radius={[6, 6, 0, 0]}>
                          {topItems.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    
                    {/* Details List */}
                    <div className="space-y-1.5 pt-2 border-t border-zinc-800 text-xs overflow-y-auto max-h-[30%]">
                      {topItems.map((item, idx) => (
                        <div key={item.menu_item_id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span 
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }} 
                            />
                            <span className="text-zinc-300 font-medium truncate">{item.name}</span>
                          </div>
                          <span className="text-zinc-400 font-bold ml-2 flex-shrink-0">{item.total_quantity} phần</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header with Period Selector */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Thống kê hoạt động Kho</h2>
              <p className="text-xs text-zinc-400">Xem tổng quan giá trị nhập kho, số lượng xuất nhập và các biến động.</p>
            </div>
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              {(["today", "week", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setInventoryPeriod(p);
                    fetchInventoryData(p);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    inventoryPeriod === p
                      ? "bg-amber-500 text-zinc-950 font-bold shadow-md"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {p === "today" ? "Hôm nay" : p === "week" ? "7 ngày qua" : "30 ngày qua"}
                </button>
              ))}
            </div>
          </div>

          {isLoadingInventory ? (
            <div className="flex h-[40vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <>
              {/* 4 Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Tổng giá trị nhập */}
                <Card className="border-zinc-800 bg-zinc-900 shadow-md hover:border-zinc-700 transition duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-semibold text-zinc-400">Giá trị nhập kho</CardTitle>
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white font-heading">
                      {formatCurrency(inventoryStats?.total_import_value || 0)}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Chi phí nhập nguyên vật liệu
                    </p>
                  </CardContent>
                </Card>

                {/* Card 2: Lượng nhập */}
                <Card className="border-zinc-800 bg-zinc-900 shadow-md hover:border-zinc-700 transition duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-semibold text-zinc-400">Số lượng nhập</CardTitle>
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                      <ArrowDownToLine className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white font-heading">
                      {(inventoryStats?.total_import_qty || 0).toLocaleString("vi-VN")}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Lượt nhập: <span className="text-zinc-300 font-bold">{inventoryStats?.total_import_transactions || 0}</span> lần
                    </p>
                  </CardContent>
                </Card>

                {/* Card 3: Lượng xuất */}
                <Card className="border-zinc-800 bg-zinc-900 shadow-md hover:border-zinc-700 transition duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-semibold text-zinc-400">Số lượng xuất</CardTitle>
                    <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg">
                      <ArrowUpFromLine className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white font-heading">
                      {(inventoryStats?.total_export_qty || 0).toLocaleString("vi-VN")}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Lượt xuất: <span className="text-zinc-300 font-bold">{inventoryStats?.total_export_transactions || 0}</span> lần
                    </p>
                  </CardContent>
                </Card>

                {/* Card 4: Điều chỉnh */}
                <Card className="border-zinc-800 bg-zinc-900 shadow-md hover:border-zinc-700 transition duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-semibold text-zinc-400">Lượt điều chỉnh</CardTitle>
                    <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                      <Activity className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white font-heading">
                      {inventoryStats?.total_adjustment_transactions || 0}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Lượt điều chỉnh tồn kho
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 1: Giá trị nhập kho */}
                <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-amber-500" />
                      Biểu đồ chi phí nhập kho 30 ngày qua
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height={320} minWidth={0}>
                        <LineChart
                          data={inventoryChartData}
                          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id="colorImportValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={formatDateLabel} 
                            stroke="#71717a" 
                            tickLine={false} 
                            fontSize={11}
                          />
                          <YAxis 
                            stroke="#71717a" 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v.toLocaleString())}
                            fontSize={11}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "12px" }}
                            labelClassName="text-zinc-400 text-xs font-bold"
                            formatter={(value: any) => [formatCurrency(value as number), "Giá trị nhập"]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="import_value" 
                            stroke="#f59e0b" 
                            strokeWidth={2.5}
                            dot={{ r: 2, fill: "#f59e0b", stroke: "#f59e0b", strokeWidth: 1 }}
                            activeDot={{ r: 6 }}
                            fill="url(#colorImportValue)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Chart 2: Nhập xuất lượng so sánh */}
                <Card className="border-zinc-800 bg-zinc-900 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-500" />
                      Lượng Nhập vs Xuất hàng ngày
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height={320} minWidth={0}>
                        <BarChart
                          data={inventoryChartData}
                          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={formatDateLabel} 
                            stroke="#71717a" 
                            tickLine={false} 
                            fontSize={11}
                          />
                          <YAxis 
                            stroke="#71717a" 
                            tickLine={false} 
                            axisLine={false}
                            fontSize={11}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "12px" }}
                            labelClassName="text-zinc-200 text-xs font-bold"
                          />
                          <Bar dataKey="import_qty" name="Nhập kho" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="export_qty" name="Xuất kho" fill="#f97316" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top items lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Imported */}
                <Card className="border-zinc-800 bg-zinc-900 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                      <ArrowDownToLine className="w-5 h-5 text-emerald-450" />
                      Top 5 mặt hàng nhập nhiều nhất
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!inventoryStats?.top_imported_items || inventoryStats.top_imported_items.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-zinc-500">
                        <Package className="w-8 h-8 opacity-30 mb-2" />
                        <p className="text-sm">Chưa có dữ liệu nhập.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {inventoryStats.top_imported_items.map((item, idx) => (
                          <div key={item.itemId} className="flex items-center justify-between border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
                            <div className="min-w-0 flex-1 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                                  {idx + 1}
                                </span>
                                <span className="text-sm font-semibold text-zinc-200 truncate">{item.name}</span>
                              </div>
                              <div className="text-xs text-zinc-400 mt-1 pl-7">
                                Tổng giá trị: <span className="text-zinc-300 font-medium">{formatCurrency(item.total_value)}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-white">{item.total_quantity}</span>
                              <span className="text-xs text-zinc-500 ml-1">{item.unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Exported */}
                <Card className="border-zinc-800 bg-zinc-900 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                      <ArrowUpFromLine className="w-5 h-5 text-orange-450" />
                      Top 5 mặt hàng xuất nhiều nhất
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!inventoryStats?.top_exported_items || inventoryStats.top_exported_items.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-zinc-500">
                        <Package className="w-8 h-8 opacity-30 mb-2" />
                        <p className="text-sm">Chưa có dữ liệu xuất.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {inventoryStats.top_exported_items.map((item, idx) => (
                          <div key={item.itemId} className="flex items-center justify-between border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
                            <div className="min-w-0 flex-1 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold">
                                  {idx + 1}
                                </span>
                                <span className="text-sm font-semibold text-zinc-200 truncate">{item.name}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-white">{item.total_quantity}</span>
                              <span className="text-xs text-zinc-500 ml-1">{item.unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
