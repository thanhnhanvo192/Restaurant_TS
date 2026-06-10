"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Armchair, 
  ClipboardList, 
  CalendarCheck, 
  DollarSign, 
  TrendingUp, 
  ArrowRight,
  LayoutGrid,
  Utensils,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface Table {
  id: number;
  tableNumber: string;
  capacity: number;
  location: string | null;
  status: "available" | "reserved" | "occupied" | "cleaning";
  tableSessions?: Array<{ id: number; status: string }>;
}

interface Reservation {
  id: number;
  reservedDate: string;
  reservedTime: string;
  guestCount: number;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  user: {
    name: string;
    phone: string | null;
  };
  table: {
    tableNumber: string;
  };
}

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Order {
  id: number;
  sessionId: number;
  tableNumber: string;
  status: "pending" | "confirmed" | "preparing" | "served" | "cancelled";
  items: OrderItem[];
  createdAt: string;
  totalPrice: number;
}

export default function ManagerDashboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data States
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  
  // Stats Counters
  const [tableStats, setTableStats] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    reserved: 0,
    cleaning: 0
  });

  const [orderStats, setOrderStats] = useState({
    pending: 0,
    preparing: 0,
    served: 0,
    cancelled: 0
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch tables
      const tablesRes = await api.get("/api/tables");
      const tablesList: Table[] = tablesRes.data.data || [];
      setTables(tablesList);

      // Compute Table Stats
      const stats = {
        total: tablesList.length,
        available: tablesList.filter(t => t.status === "available").length,
        occupied: tablesList.filter(t => t.status === "occupied").length,
        reserved: tablesList.filter(t => t.status === "reserved").length,
        cleaning: tablesList.filter(t => t.status === "cleaning").length
      };
      setTableStats(stats);

      // 2. Fetch reservations
      const reservationsRes = await api.get("/api/reservations");
      const reservationsList: Reservation[] = reservationsRes.data.data || [];
      setReservations(reservationsList.slice(0, 5)); // Keep last 5

      // 3. Fetch orders from active table sessions
      const occupiedTables = tablesList.filter(
        (t) => t.status === "occupied" && t.tableSessions?.[0]
      );

      let allActiveOrders: Order[] = [];
      
      if (occupiedTables.length > 0) {
        const ordersPromises = occupiedTables.map((t) =>
          api.get(`/api/orders/${t.tableSessions![0].id}`)
        );
        const ordersResponses = await Promise.all(ordersPromises);

        allActiveOrders = ordersResponses.flatMap((res, index) => {
          const table = occupiedTables[index];
          const sessionOrders: any[] = res.data.data || [];
          return sessionOrders.map((o) => {
            const totalPrice = o.items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
            return {
              id: o.id,
              sessionId: o.sessionId,
              tableNumber: table.tableNumber,
              status: o.status,
              items: o.items,
              createdAt: o.createdAt,
              totalPrice
            };
          });
        });

        // Sort by creation time desc
        allActiveOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      
      setRecentOrders(allActiveOrders.slice(0, 5)); // Keep top 5 latest active orders

      // Calculate order statuses
      setOrderStats({
        pending: allActiveOrders.filter(o => o.status === "pending").length,
        preparing: allActiveOrders.filter(o => o.status === "confirmed" || o.status === "preparing").length,
        served: allActiveOrders.filter(o => o.status === "served").length,
        cancelled: allActiveOrders.filter(o => o.status === "cancelled").length
      });

    } catch (err) {
      console.error(err);
      toast.error("Không thể tải thông tin vận hành real-time.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted) {
      fetchDashboardData();
      
      // Auto refresh operational data every 45 seconds
      const timer = setInterval(() => {
        fetchDashboardData();
      }, 45000);
      return () => clearInterval(timer);
    }
  }, [isMounted]);

  const getElapsedTime = (createdTime: string) => {
    const start = new Date(createdTime).getTime();
    const now = Date.now();
    const diffMins = Math.floor((now - start) / 60000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    return `${Math.floor(diffMins / 60)} giờ trước`;
  };

  const getReservationStatusBadge = (status: Reservation["status"]) => {
    const configs = {
      pending: { label: "Chờ duyệt", class: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
      confirmed: { label: "Đã xác nhận", class: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
      cancelled: { label: "Đã hủy", class: "bg-red-500/10 text-red-400 border-red-500/20" },
      completed: { label: "Hoàn tất", class: "bg-green-500/10 text-green-400 border-green-500/20" },
      no_show: { label: "Vắng mặt", class: "bg-rose-500/10 text-rose-400 border-rose-500/20" }
    };
    const config = configs[status] || { label: status, class: "bg-zinc-800 text-zinc-400" };
    return (
      <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold border capitalize ${config.class}`}>
        {config.label}
      </Badge>
    );
  };

  const getOrderStatusBadge = (status: Order["status"]) => {
    const configs = {
      pending: { label: "Chờ duyệt", class: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
      confirmed: { label: "Đã nhận", class: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
      preparing: { label: "Chế biến", class: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
      served: { label: "Đã phục vụ", class: "bg-green-500/15 text-green-400 border-green-500/20" },
      cancelled: { label: "Đã hủy", class: "bg-red-500/15 text-red-400 border-red-500/20" }
    };
    const config = configs[status] || { label: status, class: "bg-zinc-850 text-zinc-400 border-zinc-800" };
    return (
      <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold border capitalize ${config.class}`}>
        {config.label}
      </Badge>
    );
  };

  if (!isMounted) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-zinc-950 text-zinc-100">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (isLoading && tables.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm text-zinc-400">Đang tải thông tin vận hành...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Real-time counters row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Tables Card */}
        <Card className="border-zinc-800 bg-zinc-900 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bàn ăn hoạt động</p>
              <h3 className="text-3xl font-extrabold text-white font-heading">{tableStats.occupied}/{tableStats.total}</h3>
              <p className="text-[10px] text-zinc-500">Đang có khách ăn uống trực tiếp</p>
            </div>
            <div className="p-3.5 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
              <Armchair className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Orders Card */}
        <Card className="border-zinc-800 bg-zinc-900 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Orders chờ duyệt</p>
              <h3 className="text-3xl font-extrabold text-white font-heading">{orderStats.pending}</h3>
              <p className="text-[10px] text-zinc-500">{orderStats.preparing} orders đang được chế biến</p>
            </div>
            <div className="p-3.5 bg-yellow-500/10 text-yellow-500 rounded-2xl border border-yellow-500/20">
              <ClipboardList className="w-6 h-6 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Today's Reservations Card */}
        <Card className="border-zinc-800 bg-zinc-900 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Lịch đặt bàn mới</p>
              <h3 className="text-3xl font-extrabold text-white font-heading">{reservations.filter(r => r.status === "pending").length}</h3>
              <p className="text-[10px] text-zinc-500">Đang chờ quản lý xác nhận</p>
            </div>
            <div className="p-3.5 bg-purple-500/10 text-purple-500 rounded-2xl border border-purple-500/20">
              <CalendarCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Quick link to stats */}
        <Card className="border-zinc-800 bg-zinc-900 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Báo cáo & Thống kê</p>
              <h3 className="text-sm font-bold text-zinc-300">Xem doanh thu chi tiết</h3>
              <Button 
                onClick={() => router.push("/manager/statistics")}
                variant="link" 
                className="text-amber-500 p-0 text-xs font-bold flex items-center gap-1 mt-1 cursor-pointer"
              >
                Đi tới Thống kê <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="p-3.5 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables layout occupancy dashboard */}
      <Card className="border-zinc-800 bg-zinc-900 shadow-md">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-white font-heading">Trạng thái sơ đồ bàn ăn</CardTitle>
            <p className="text-xs text-zinc-500">Tổng số bàn: {tableStats.total} bàn</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">Trống ({tableStats.available})</Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">Có khách ({tableStats.occupied})</Badge>
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Đã đặt ({tableStats.reserved})</Badge>
            <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">Dọn dẹp ({tableStats.cleaning})</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {tables.map(table => {
              const borderColors = {
                available: "border-green-500/30 hover:border-green-500 bg-green-500/5",
                occupied: "border-red-500/30 hover:border-red-500 bg-red-500/5",
                reserved: "border-yellow-500/30 hover:border-yellow-500 bg-yellow-500/5",
                cleaning: "border-zinc-750 hover:border-zinc-500 bg-zinc-950/20"
              };
              const textColors = {
                available: "text-green-400",
                occupied: "text-red-400",
                reserved: "text-yellow-400",
                cleaning: "text-zinc-500"
              };
              return (
                <div 
                  key={table.id}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${borderColors[table.status]}`}
                >
                  <span className={`text-[10px] font-bold uppercase ${textColors[table.status]}`}>{table.status}</span>
                  <Armchair className={`w-8 h-8 my-2 ${textColors[table.status]}`} />
                  <span className="text-xs font-extrabold text-white">Bàn {table.tableNumber}</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5">{table.capacity} chỗ</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Split Grid for Recent Orders and Reservations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Recent Active Orders */}
        <Card className="border-zinc-800 bg-zinc-900 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center justify-between font-heading">
              <span>Đơn hàng đang xử lý</span>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Mới nhất</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                <ClipboardList className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-xs">Hiện tại không có đơn hàng nào đang hoạt động.</p>
              </div>
            ) : (
              recentOrders.map(order => (
                <div 
                  key={order.id}
                  className="flex items-center justify-between bg-zinc-950/40 border border-zinc-850 p-3.5 rounded-xl hover:border-zinc-800 transition"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                        Bàn {order.tableNumber}
                      </span>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {getElapsedTime(order.createdAt)}
                      </span>
                    </div>
                    {/* Items snippet */}
                    <p className="text-[11px] text-zinc-400 truncate">
                      {order.items.map(item => `${item.name} x${item.quantity}`).join(", ")}
                    </p>
                  </div>
                  
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-xs font-extrabold text-white">{(order.totalPrice || 0).toLocaleString("vi-VN")} đ</p>
                    <div className="mt-1">{getOrderStatusBadge(order.status)}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Side: Recent Reservations */}
        <Card className="border-zinc-800 bg-zinc-900 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center justify-between font-heading">
              <span>Đặt bàn gần đây</span>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">Lịch đặt mới</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                <CalendarCheck className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-xs">Chưa có lịch hẹn đặt bàn nào.</p>
              </div>
            ) : (
              reservations.map(res => (
                <div 
                  key={res.id}
                  className="flex items-center justify-between bg-zinc-950/40 border border-zinc-850 p-3.5 rounded-xl hover:border-zinc-800 transition"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-white">{res.user.name}</p>
                    <p className="text-[10px] text-zinc-400">
                      Bàn: <span className="text-white font-semibold">Bàn {res.table.tableNumber}</span> • {res.guestCount} khách
                    </p>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>
                        {new Date(res.reservedDate).toLocaleDateString("vi-VN")} - {res.reservedTime.substring(11, 16)}
                      </span>
                    </p>
                  </div>
                  
                  <div className="text-right ml-4 flex-shrink-0">
                    {getReservationStatusBadge(res.status)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Shortcuts Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Phím tắt quản trị nhanh</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button 
            onClick={() => router.push("/manager/tables")}
            variant="outline" 
            className="border-zinc-800 hover:border-amber-500 hover:bg-amber-500/5 text-zinc-300 hover:text-white flex items-center justify-start gap-3 p-4 py-6 rounded-2xl transition cursor-pointer"
          >
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold block">Quản lý Bàn ăn</span>
              <span className="text-[10px] text-zinc-500">Cấu hình & QR codes</span>
            </div>
          </Button>

          <Button 
            onClick={() => router.push("/manager/menu")}
            variant="outline" 
            className="border-zinc-800 hover:border-orange-500 hover:bg-orange-500/5 text-zinc-300 hover:text-white flex items-center justify-start gap-3 p-4 py-6 rounded-2xl transition cursor-pointer"
          >
            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
              <Utensils className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold block">Quản lý Thực đơn</span>
              <span className="text-[10px] text-zinc-500">Giá món & trạng thái</span>
            </div>
          </Button>

          <Button 
            onClick={() => router.push("/manager/staff")}
            variant="outline" 
            className="border-zinc-800 hover:border-purple-500 hover:bg-purple-500/5 text-zinc-300 hover:text-white flex items-center justify-start gap-3 p-4 py-6 rounded-2xl transition cursor-pointer"
          >
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold block">Quản lý Nhân viên</span>
              <span className="text-[10px] text-zinc-500">Tài khoản & phân vai</span>
            </div>
          </Button>

          <Button 
            onClick={() => router.push("/manager/statistics")}
            variant="outline" 
            className="border-zinc-800 hover:border-emerald-500 hover:bg-emerald-500/5 text-zinc-300 hover:text-white flex items-center justify-start gap-3 p-4 py-6 rounded-2xl transition cursor-pointer"
          >
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold block">Xem Báo cáo</span>
              <span className="text-[10px] text-zinc-500">Doanh thu & biểu đồ</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
