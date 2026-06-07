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
  AlertCircle
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

export default function ManagerStatisticsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [statsToday, setStatsToday] = useState<StatData | null>(null);
  const [statsWeek, setStatsWeek] = useState<StatData | null>(null);
  const [statsMonth, setStatsMonth] = useState<StatData | null>(null);
  const [chartData, setChartData] = useState<RevenueChartItem[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
            <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg">
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
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
              <UtensilsCrossed className="w-5 h-5 text-orange-450" />
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
                <ResponsiveContainer width="100%" height="70%" minWidth={0}>
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
  );
}
