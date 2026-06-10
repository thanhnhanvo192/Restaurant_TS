"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  CheckCircle, 
  Clock, 
  Coffee, 
  UserCheck, 
  Info,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Table, TableStatus } from "@/types";

interface OrderItemAPI {
  id: number;
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  note?: string | null;
}

interface OrderAPI {
  id: number;
  sessionId: number;
  status: "pending" | "confirmed" | "preparing" | "served" | "cancelled";
  items: OrderItemAPI[];
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TableExtended extends Table {
  pendingOrdersCount?: number;
  orders?: OrderAPI[];
  hasServedOrders?: boolean;
  tableSessions?: Array<{
    id: number;
    tableId: number;
    openedAt: string;
    closedAt?: string | null;
    status: 'open' | 'closed';
  }>;
}

export default function ReceptionistTablesPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableExtended | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [dialogOrders, setDialogOrders] = useState<OrderAPI[]>([]);

  // Cleaning table states
  const [cleaningTable, setCleaningTable] = useState<TableExtended | null>(null);
  const [isCleaningDialogOpen, setIsCleaningDialogOpen] = useState(false);
  const [isSubmittingCleaning, setIsSubmittingCleaning] = useState(false);

  // Function to load orders for an occupied table
  const fetchTableOrders = async (sessionId: number) => {
    try {
      const ordersRes = await api.get(`/api/orders/${sessionId}`);
      return ordersRes.data.data || [];
    } catch (err) {
      console.error(`Failed to fetch orders for session ${sessionId}:`, err);
      return [];
    }
  };

  // Main fetch tables function
  const fetchTables = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await api.get("/api/tables");
      const tableList: TableExtended[] = res.data.data || [];

      // For occupied tables, fetch their open session orders in parallel to calculate pending count & checks
      const enrichedTables = await Promise.all(
        tableList.map(async (table) => {
          if (table.status === "occupied" && table.tableSessions?.[0]) {
            const orders = await fetchTableOrders(table.tableSessions[0].id);
            const pendingCount = orders.filter((o: any) => o.status === "pending").length;
            const hasServed = orders.some((o: any) => o.status === "served");
            return {
              ...table,
              pendingOrdersCount: pendingCount,
              orders: orders,
              hasServedOrders: hasServed,
            };
          }
          return {
            ...table,
            pendingOrdersCount: 0,
            orders: [],
            hasServedOrders: false,
          };
        })
      );

      setTables(enrichedTables);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách bàn ăn.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTables(true);
  }, [fetchTables]);

  // Socket IO real-time subscriptions
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      console.log("[Socket] Subscribing to receptionist events in Tables Page");

      // Table status updated
      socket.on("table-status-changed", (data: { tableId: number; status: TableStatus }) => {
        console.log("[Socket] table-status-changed received:", data);
        
        // Refresh tables list to catch all session mappings and states
        fetchTables(false);
        
        // If the open table is currently selected in dialog, close dialog or refresh it
        setSelectedTable(prev => {
          if (prev && prev.id === data.tableId) {
            if (data.status !== "occupied") {
              setIsDialogOpen(false);
              return null;
            }
          }
          return prev;
        });
      });

      // New order created by customer
      socket.on("new-order", (data: { tableId: number; sessionId: number }) => {
        console.log("[Socket] new-order received:", data);
        toast.info(`Có order mới ở Bàn ăn #${data.tableId}!`);
        fetchTables(false);

        // If current table dialog is open, refresh its orders list
        setSelectedTable(prev => {
          if (prev && prev.id === data.tableId) {
            setIsLoadingOrders(true);
            fetchTableOrders(data.sessionId).then(orders => {
              setDialogOrders(orders);
              setIsLoadingOrders(false);
            });
          }
          return prev;
        });
      });

      // Order confirmed
      socket.on("order-confirmed", () => {
        fetchTables(false);
      });

      // Order completed (served)
      socket.on("order-completed", () => {
        fetchTables(false);
      });

      // Invoice paid
      socket.on("invoice-paid", (data: { tableId: number; tableNumber: string }) => {
        toast.success(`Hóa đơn của Bàn ${data.tableNumber} đã được thanh toán tiền mặt!`);
        fetchTables(false);
      });
    }

    return () => {
      if (socket) {
        socket.off("table-status-changed");
        socket.off("new-order");
        socket.off("order-confirmed");
        socket.off("order-completed");
        socket.off("invoice-paid");
      }
    };
  }, [fetchTables]);

  // Handle clicking a table card
  const handleTableClick = async (table: TableExtended) => {
    if (table.status !== "occupied") {
      // Show info toast for non-occupied tables
      if (table.status === "available") {
        toast.info(`Bàn ${table.tableNumber} đang trống.`);
      } else if (table.status === "reserved") {
        toast.info(`Bàn ${table.tableNumber} đã được đặt trước.`);
      } else if (table.status === "cleaning") {
        setCleaningTable(table);
        setIsCleaningDialogOpen(true);
      }
      return;
    }

    setSelectedTable(table);
    setIsDialogOpen(true);

    if (table.tableSessions?.[0]) {
      setIsLoadingOrders(true);
      const orders = await fetchTableOrders(table.tableSessions[0].id);
      setDialogOrders(orders);
      setIsLoadingOrders(false);
    }
  };

  const handleCompleteCleaning = async () => {
    if (!cleaningTable) return;
    setIsSubmittingCleaning(true);
    try {
      const res = await api.patch(`/api/tables/${cleaningTable.id}`, {
        status: "available",
      });
      if (res.data && res.data.success) {
        toast.success(`Đã chuyển Bàn ${cleaningTable.tableNumber} sang trạng thái trống (available).`);
        setIsCleaningDialogOpen(false);
        setCleaningTable(null);
        fetchTables(false);
      } else {
        toast.error("Không thể cập nhật trạng thái bàn.");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Lỗi cập nhật trạng thái bàn.";
      toast.error(errMsg);
    } finally {
      setIsSubmittingCleaning(false);
    }
  };

  const getStatusConfig = (status: TableStatus) => {
    switch (status) {
      case "available":
        return {
          title: "Bàn trống",
          cardBg: "bg-green-950/20 border-green-500/20 hover:border-green-500/40 hover:bg-green-950/30 shadow-[0_0_15px_rgba(34,197,94,0.03)]",
          badgeBg: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle,
          colorText: "text-green-400",
        };
      case "reserved":
        return {
          title: "Đã đặt trước",
          cardBg: "bg-yellow-950/20 border-yellow-500/20 hover:border-yellow-500/40 hover:bg-yellow-950/30 shadow-[0_0_15px_rgba(234,179,8,0.03)]",
          badgeBg: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: Clock,
          colorText: "text-yellow-400",
        };
      case "occupied":
        return {
          title: "Có khách",
          cardBg: "bg-red-950/20 border-red-500/20 hover:border-red-500/40 hover:bg-red-950/30 shadow-[0_0_15px_rgba(239,68,68,0.03)] cursor-pointer",
          badgeBg: "bg-red-100 text-red-800 border-red-200",
          icon: UserCheck,
          colorText: "text-red-400",
        };
      case "cleaning":
        return {
          title: "Đang dọn dẹp",
          cardBg: "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 shadow-none cursor-pointer",
          badgeBg: "bg-gray-100 text-gray-800 border-gray-250",
          icon: Coffee,
          colorText: "text-zinc-400",
        };
      default:
        return {
          title: status,
          cardBg: "bg-zinc-900 border-zinc-800",
          badgeBg: "bg-zinc-800 text-zinc-300",
          icon: Info,
          colorText: "text-zinc-400",
        };
    }
  };

  const getOrderStatusBadge = (status: OrderAPI["status"]) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">Chờ xác nhận</Badge>;
      case "confirmed":
        return <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">Đã xác nhận</Badge>;
      case "preparing":
        return <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">Đang chế biến</Badge>;
      case "served":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">Đã phục vụ</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]">Đã hủy</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  // Stats summaries
  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === "available").length,
    occupied: tables.filter(t => t.status === "occupied").length,
    reserved: tables.filter(t => t.status === "reserved").length,
    cleaning: tables.filter(t => t.status === "cleaning").length,
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm text-zinc-400">Đang tải sơ đồ bàn ăn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top dashboard summary widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-xs font-semibold text-zinc-400">Tổng số bàn</span>
          <span className="text-2xl font-bold text-white mt-1">{stats.total}</span>
        </div>
        <div className="bg-green-950/10 border border-green-900/25 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-xs font-semibold text-green-400">Bàn trống</span>
          <span className="text-2xl font-bold text-green-400 mt-1">{stats.available}</span>
        </div>
        <div className="bg-red-950/10 border border-red-900/25 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-xs font-semibold text-red-400">Có khách</span>
          <span className="text-2xl font-bold text-red-400 mt-1">{stats.occupied}</span>
        </div>
        <div className="bg-yellow-950/10 border border-yellow-900/25 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-xs font-semibold text-yellow-400">Đã đặt trước</span>
          <span className="text-2xl font-bold text-yellow-400 mt-1">{stats.reserved}</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-xs font-semibold text-zinc-400">Đang dọn dẹp</span>
          <span className="text-2xl font-bold text-zinc-300 mt-1">{stats.cleaning}</span>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map((table) => {
          const config = getStatusConfig(table.status);
          const Icon = config.icon;
          const isOccupied = table.status === "occupied";
          const pendingCount = table.pendingOrdersCount || 0;

          return (
            <Card
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={`relative overflow-hidden border transition-all duration-300 ${config.cardBg}`}
            >
              {/* Decorative status accent border */}
              <div className={`absolute top-0 inset-x-0 h-1 ${isOccupied ? "bg-red-500" : table.status === "available" ? "bg-green-500" : table.status === "reserved" ? "bg-yellow-500" : "bg-zinc-700"}`} />

              <CardContent className="p-5 flex flex-col justify-between h-36">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white font-heading">
                      Bàn {table.tableNumber}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Sức chứa: {table.capacity} người • {table.location || "Sảnh"}
                    </p>
                  </div>

                  {/* Pending Orders Count Badge */}
                  {isOccupied && pendingCount > 0 && (
                    <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 text-[10px] font-extrabold px-2 py-0.5 animate-bounce shadow-md">
                      {pendingCount} Order chờ
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60 mt-auto">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${config.colorText}`} />
                    <span className={`text-[11px] font-bold ${config.colorText}`}>
                      {config.title}
                    </span>
                  </div>
                  
                  {isOccupied && table.hasServedOrders && (
                    <Badge className="bg-amber-500 text-zinc-950 font-extrabold text-[9px] px-1.5 py-0">
                      Cần thanh toán
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Session Details Dialog for occupied tables */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <span>Bàn số {selectedTable?.tableNumber}</span>
              <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold capitalize">
                Có Khách
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Chi tiết session và danh sách order của bàn ăn này.
            </DialogDescription>
          </DialogHeader>

          {/* Dialog Main Content */}
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4 p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl text-xs">
              <div>
                <span className="text-zinc-400 block">ID Table Session:</span>
                <span className="font-semibold text-white">#{selectedTable?.tableSessions?.[0]?.id}</span>
              </div>
              <div>
                <span className="text-zinc-400 block">Thời gian vào:</span>
                <span className="font-semibold text-white">
                  {selectedTable?.tableSessions?.[0]?.openedAt 
                    ? new Date(selectedTable.tableSessions[0].openedAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })
                    : "--:--"
                  }
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Danh sách Orders</h4>

              {isLoadingOrders ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                </div>
              ) : dialogOrders.length === 0 ? (
                <div className="p-6 text-center border border-zinc-800 rounded-xl bg-zinc-900/40 text-zinc-500">
                  <AlertCircle className="w-5 h-5 mx-auto opacity-30 text-amber-500 mb-1" />
                  <p className="text-xs">Bàn chưa có order nào được gửi.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dialogOrders.map((order) => (
                    <div 
                      key={order.id}
                      className="p-3 border border-zinc-850 bg-zinc-900/40 rounded-xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5">
                        <span className="text-[11px] font-bold text-zinc-300">Order #{order.id}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500">
                            {new Date(order.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {getOrderStatusBadge(order.status)}
                        </div>
                      </div>

                      {/* Items */}
                      <ul className="space-y-1.5">
                        {order.items?.map((item: any, idx: number) => (
                          <li key={idx} className="flex justify-between text-xs text-zinc-300">
                            <span>
                              {item.name} <strong className="text-white">x{item.quantity}</strong>
                              {item.note && <span className="text-[10px] text-zinc-500 italic ml-1">({item.note})</span>}
                            </span>
                            <span className="font-semibold text-zinc-200">
                              {(item.subtotal || (item.unitPrice * item.quantity)).toLocaleString("vi-VN")} đ
                            </span>
                          </li>
                        ))}
                      </ul>

                      {order.note && (
                        <div className="text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/10 p-1.5 rounded">
                          Ghi chú order: {order.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between items-center mt-3 pt-3 border-t border-zinc-800">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-zinc-800 hover:bg-zinc-800 text-xs h-9 cursor-pointer"
            >
              Đóng
            </Button>
            
            {selectedTable && selectedTable.hasServedOrders && (
              <Button
                onClick={() => {
                  setIsDialogOpen(false);
                  router.push(`/receptionist/invoices?sessionId=${selectedTable.tableSessions?.[0]?.id}`);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs h-9 cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5 mr-1" />
                Tạo hóa đơn & Thanh toán
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận hoàn tất dọn dẹp bàn */}
      <Dialog open={isCleaningDialogOpen} onOpenChange={setIsCleaningDialogOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-black font-heading flex items-center gap-2">
              Hoàn tất dọn dẹp
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Xác nhận Bàn {cleaningTable?.tableNumber} đã dọn dẹp xong và sẵn sàng đón khách mới?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCleaningDialogOpen(false);
                setCleaningTable(null);
              }}
              className="border-zinc-800 hover:bg-zinc-800 text-xs h-9 cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              onClick={handleCompleteCleaning}
              disabled={isSubmittingCleaning}
              className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs h-9 cursor-pointer"
            >
              {isSubmittingCleaning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : null}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
