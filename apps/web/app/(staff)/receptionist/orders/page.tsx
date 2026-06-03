"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Check, 
  ChefHat, 
  Clock, 
  Trash2, 
  AlertCircle,
  BellRing
} from "lucide-react";
import { toast } from "sonner";
import { OrderStatus } from "@/types";

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

interface OrderExtended extends OrderAPI {
  tableNumber: string;
}

export default function ReceptionistOrdersPage() {
  const [orders, setOrders] = useState<OrderExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  
  // Timer to force re-render for elapsed time updates
  const [, setTick] = useState(0);

  // Fetch active tables, map their open sessions, and fetch orders
  const fetchOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const tablesRes = await api.get("/api/tables");
      const tables = tablesRes.data.data || [];
      const occupiedTables = tables.filter(
        (t: any) => t.status === "occupied" && t.tableSessions?.[0]
      );

      // Create mapping from session ID to table number
      const sessionToTableNumberMap = new Map<number, string>();
      occupiedTables.forEach((t: any) => {
        sessionToTableNumberMap.set(t.tableSessions[0].id, t.tableNumber);
      });

      // Fetch orders for all open sessions in parallel
      const ordersPromises = occupiedTables.map((t: any) =>
        api.get(`/api/orders/${t.tableSessions[0].id}`)
      );
      const ordersResponses = await Promise.all(ordersPromises);

      const allOrders: OrderExtended[] = ordersResponses.flatMap((res, index) => {
        const session = occupiedTables[index].tableSessions[0];
        const tableNumber = sessionToTableNumberMap.get(session.id) || "N/A";
        const sessionOrders: OrderAPI[] = res.data.data || [];
        return sessionOrders.map((o) => ({
          ...o,
          tableNumber,
        }));
      });

      // Sort by creation time desc
      allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setOrders(allOrders);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách orders.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOrders(true);

    // Set interval for elapsed time ticks every 30 seconds
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Real-time socket events
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      console.log("[Socket] Subscribing to receptionist events in Orders Page");

      // Event: new order created by customer
      socket.on("new-order", (data: { orderId: number; tableId: number }) => {
        toast.custom((t) => (
          <div className="flex items-center gap-3 p-4 bg-zinc-900 border border-amber-500/30 rounded-xl text-zinc-100 shadow-2xl animate-bounce">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <BellRing className="w-4 h-4 animate-ring" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Order mới!</p>
              <p className="text-[10px] text-zinc-400">Bàn #{data.tableId} vừa gửi một order mới.</p>
            </div>
          </div>
        ), { duration: 5000 });
        
        fetchOrders(false);
      });

      // Event: order status changes
      socket.on("order-confirmed", () => {
        fetchOrders(false);
      });

      socket.on("order-completed", () => {
        fetchOrders(false);
      });

      socket.on("order-cancelled", () => {
        fetchOrders(false);
      });

      // Event: table status changes (e.g. closed/cleaned)
      socket.on("table-status-changed", () => {
        fetchOrders(false);
      });
      
      socket.on("invoice-paid", () => {
        fetchOrders(false);
      });
    }

    return () => {
      if (socket) {
        socket.off("new-order");
        socket.off("order-confirmed");
        socket.off("order-completed");
        socket.off("order-cancelled");
        socket.off("table-status-changed");
        socket.off("invoice-paid");
      }
    };
  }, [fetchOrders]);

  // Actions handler
  const handleConfirmOrder = async (orderId: number) => {
    setActionLoadingId(orderId);
    try {
      const response = await api.patch(`/api/orders/${orderId}/confirm`);
      if (response.data && response.data.success) {
        toast.success(`Đã xác nhận order #${orderId}`);
        fetchOrders(false);
      } else {
        toast.error("Không thể xác nhận order.");
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Lỗi khi xác nhận order.";
      toast.error(errMsg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompleteOrder = async (orderId: number) => {
    setActionLoadingId(orderId);
    try {
      const response = await api.patch(`/api/orders/${orderId}/complete`);
      if (response.data && response.data.success) {
        toast.success(`Đã đánh dấu hoàn thành order #${orderId}`);
        fetchOrders(false);
      } else {
        toast.error("Không thể hoàn thành order.");
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Lỗi khi hoàn thành order.";
      toast.error(errMsg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    const confirmCancel = window.confirm("Bạn có chắc chắn muốn hủy order này?");
    if (!confirmCancel) return;

    setActionLoadingId(orderId);
    try {
      const response = await api.patch(`/api/orders/${orderId}/cancel`);
      if (response.data && response.data.success) {
        toast.success(`Đã hủy order #${orderId}`);
        fetchOrders(false);
      } else {
        toast.error("Không thể hủy order.");
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Lỗi khi hủy order.";
      toast.error(errMsg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper to compute elapsed time description
  const getElapsedTime = (createdTime: string) => {
    const start = new Date(createdTime).getTime();
    const now = Date.now();
    const diffMins = Math.floor((now - start) / 60000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} giờ trước`;
  };

  // Filter orders into columns
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const cookingOrders = orders.filter((o) => o.status === "confirmed" || o.status === "preparing");
  const servedOrders = orders.filter((o) => o.status === "served");

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm text-zinc-400">Đang tải danh sách orders...</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      title: "Chờ xác nhận",
      orders: pendingOrders,
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      columnBg: "bg-zinc-900/40 border-zinc-850/80",
      actions: (order: OrderExtended) => {
        const isActionLoading = actionLoadingId === order.id;
        return (
          <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800/80">
            <Button
              onClick={() => handleCancelOrder(order.id)}
              variant="outline"
              size="sm"
              disabled={isActionLoading}
              className="flex-1 border-zinc-800 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/30 text-xs h-8.5 font-bold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Hủy
            </Button>
            <Button
              onClick={() => handleConfirmOrder(order.id)}
              disabled={isActionLoading}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs h-8.5 font-extrabold cursor-pointer"
            >
              {isActionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Xác nhận
                </>
              )}
            </Button>
          </div>
        );
      },
    },
    {
      title: "Đang chế biến",
      orders: cookingOrders,
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      columnBg: "bg-zinc-900/40 border-zinc-850/80",
      actions: (order: OrderExtended) => {
        const isActionLoading = actionLoadingId === order.id;
        return (
          <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800/80">
            <Button
              onClick={() => handleCompleteOrder(order.id)}
              disabled={isActionLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-xs h-8.5 font-extrabold cursor-pointer"
            >
              {isActionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <ChefHat className="w-3.5 h-3.5 mr-1.5" />
                  Hoàn thành món
                </>
              )}
            </Button>
          </div>
        );
      },
    },
    {
      title: "Đã phục vụ",
      orders: servedOrders,
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      columnBg: "bg-zinc-900/20 border-zinc-900",
      actions: () => null,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start h-[calc(100vh-10rem)]">
      {columns.map((col, idx) => (
        <div
          key={idx}
          className={`flex flex-col h-full rounded-2xl border p-4 ${col.columnBg}`}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {col.title}
            </h3>
            <Badge variant="outline" className={`${col.badgeColor} font-extrabold px-2.5 text-[10px]`}>
              {col.orders.length} orders
            </Badge>
          </div>

          {/* Orders list wrapper */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {col.orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-zinc-800/60 rounded-xl text-zinc-600 p-4">
                <AlertCircle className="w-6 h-6 stroke-[1.5] mb-1.5 opacity-30 text-zinc-500" />
                <span className="text-[11px]">Trống</span>
              </div>
            ) : (
              col.orders.map((order) => (
                <Card
                  key={order.id}
                  className="border-zinc-800 bg-zinc-950/65 backdrop-blur-xl relative overflow-hidden transition-all duration-300 hover:border-zinc-700/60 hover:shadow-lg"
                >
                  <CardContent className="p-4 flex flex-col justify-between">
                    <div>
                      {/* Top bar info */}
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 mb-2">
                        <span className="text-xs font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
                          Bàn {order.tableNumber}
                        </span>
                        
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-amber-500/80" />
                          <span>{getElapsedTime(order.createdAt)}</span>
                        </div>
                      </div>

                      {/* Items */}
                      <ul className="space-y-1.5 pt-0.5">
                        {order.items?.map((item: any, itemIdx: number) => (
                          <li key={itemIdx} className="text-xs text-zinc-300 flex justify-between">
                            <span>
                              {item.name} <strong className="text-white">x{item.quantity}</strong>
                              {item.note && (
                                <span className="text-[10px] text-amber-400/90 italic ml-1 block bg-amber-500/5 px-1 py-0.5 rounded max-w-[200px]">
                                  Ghi chú: {item.note}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* Order general note */}
                      {order.note && (
                        <div className="mt-2.5 text-[10px] text-amber-500/95 bg-amber-500/5 border border-amber-500/10 p-1.5 rounded-lg">
                          Ghi chú chung: {order.note}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {col.actions(order)}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
