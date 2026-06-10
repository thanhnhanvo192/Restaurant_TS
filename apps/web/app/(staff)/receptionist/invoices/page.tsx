"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { getUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  Receipt, 
  DollarSign, 
  Percent, 
  Printer, 
  CheckCircle2, 
  ChevronRight, 
  AlertTriangle,
  ArrowLeft,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { Table, Invoice } from "@/types";

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
  tableSessions: Array<{
    id: number;
    status: string;
    openedAt: string;
  }>;
}

function InvoicePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [occupiedTables, setOccupiedTables] = useState<TableExtended[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>("");
  const [discountPct, setDiscountPct] = useState<number>(0);
  
  const [orders, setOrders] = useState<OrderAPI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Invoice Checkout state
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isCreated, setIsCreated] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [staffName, setStaffName] = useState("Lễ tân");

  // Load occupied tables with open sessions
  const fetchOccupiedSessions = async () => {
    try {
      const res = await api.get("/api/tables");
      const tablesList = res.data.data || [];
      const occupied = tablesList.filter(
        (t: any) => t.status === "occupied" && t.tableSessions?.[0]
      );
      setOccupiedTables(occupied);

      // Extract sessionId query param if present
      const querySessionId = searchParams.get("sessionId");
      if (querySessionId) {
        setSelectedSessionId(querySessionId);
        
        // Find if that session exists to set table number
        const matchedTable = occupied.find(
          (t: any) => t.tableSessions[0].id === Number(querySessionId)
        );
        if (matchedTable) {
          setSelectedTableNumber(matchedTable.tableNumber);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách bàn ăn có khách.");
    }
  };

  // Fetch orders when session is selected
  const fetchSessionOrders = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/orders/${sessionId}`);
      setOrders(res.data.data || []);

      // Check if invoice already exists for this session
      try {
        const invoiceRes = await api.get(`/api/invoices/sessions/${sessionId}/invoice`);
        if (invoiceRes.data && invoiceRes.data.success && invoiceRes.data.data) {
          const existingInvoice = invoiceRes.data.data;
          setInvoice(existingInvoice);
          setIsCreated(true);
          setDiscountPct(Number(existingInvoice.discountPct) || 0);
          if (existingInvoice.status === "paid") {
            setIsPaid(true);
          } else {
            setIsPaid(false);
          }
        } else {
          setInvoice(null);
          setIsCreated(false);
          setIsPaid(false);
        }
      } catch (invoiceErr: any) {
        setInvoice(null);
        setIsCreated(false);
        setIsPaid(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách order của session.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOccupiedSessions();
    const staff = getUser();
    if (staff && staff.name) {
      setStaffName(staff.name);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionOrders(selectedSessionId);
    } else {
      setOrders([]);
    }
  }, [selectedSessionId]);

  const handleSessionChange = (value: string) => {
    setSelectedSessionId(value);
    const matchedTable = occupiedTables.find(
      (t) => t.tableSessions[0].id === Number(value)
    );
    if (matchedTable) {
      setSelectedTableNumber(matchedTable.tableNumber);
    }
  };

  // Filter served orders for billing
  const servedOrders = orders.filter((o) => o.status === "served");
  const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "confirmed" || o.status === "preparing");

  // Aggregate items from all served orders for receipt layout
  const getAggregatedItems = () => {
    const itemsMap = new Map<number, { name: string; quantity: number; unitPrice: number; subtotal: number }>();
    servedOrders.forEach(order => {
      order.items?.forEach((item: any) => {
        const existing = itemsMap.get(item.menuItemId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.subtotal += item.subtotal || (item.unitPrice * item.quantity);
        } else {
          itemsMap.set(item.menuItemId, {
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal || (item.unitPrice * item.quantity)
          });
        }
      });
    });
    return Array.from(itemsMap.values());
  };

  const aggregatedItems = getAggregatedItems();
  const subtotal = aggregatedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = (subtotal * discountPct) / 100;
  const total = subtotal - discountAmount;

  // Handle invoice creation
  const handleCreateInvoice = async () => {
    if (!selectedSessionId) {
      toast.error("Vui lòng chọn bàn/session cần tạo hóa đơn.");
      return;
    }

    if (servedOrders.length === 0) {
      toast.error("Không tìm thấy order nào đã phục vụ (served) trong session này.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post("/api/invoices", {
        sessionId: Number(selectedSessionId),
        discount_pct: Number(discountPct),
      });

      if (response.data && response.data.success) {
        setInvoice(response.data.data);
        setIsCreated(true);
        toast.success("Tạo hóa đơn thành công! Chuyển sang thanh toán.");
      } else {
        toast.error("Tạo hóa đơn thất bại.");
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Lỗi tạo hóa đơn.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle pay by cash
  const handlePayByCash = async () => {
    if (!invoice) return;

    setIsSubmitting(true);
    try {
      const response = await api.post(`/api/invoices/${invoice.id}/pay/cash`);
      if (response.data && response.data.success) {
        setInvoice(response.data.data); // Update with paidAt data
        setIsPaid(true);
        toast.success("Đã ghi nhận thanh toán tiền mặt thành công!");
        
        // Notify socket status change
        const socket = getSocket();
        if (socket) {
          socket.emit("table-status-changed", {
            tableId: invoice.session?.tableId,
            status: "cleaning",
          });
        }
      } else {
        toast.error("Ghi nhận thanh toán thất bại.");
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Lỗi xử lý thanh toán.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle pay by VNPay
  const [isVnpayLoading, setIsVnpayLoading] = useState(false);

  const handlePayByVnpay = async () => {
    if (!invoice) return;

    setIsVnpayLoading(true);
    try {
      const response = await api.post(`/api/invoices/${invoice.id}/pay/vnpay`);
      if (response.data && response.data.success && response.data.data.paymentUrl) {
        const { paymentUrl } = response.data.data;
        toast.info("Đang mở trang thanh toán VNPay...");
        window.open(paymentUrl, "_blank");
      } else {
        toast.error("Không tạo được link thanh toán VNPay.");
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Lỗi xử lý thanh toán VNPay.";
      toast.error(errMsg);
    } finally {
      setIsVnpayLoading(false);
    }
  };

  // Real-time socket listener for payment notifications
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !invoice || isPaid) return;

    const handleInvoicePaid = (data: { invoiceId: number; amount: number; paidAt: string }) => {
      if (data.invoiceId === invoice.id) {
        setInvoice((prev) => prev ? { ...prev, status: "paid", paidAt: data.paidAt } : null);
        setIsPaid(true);
        toast.success("Khách hàng đã thanh toán hóa đơn thành công qua VNPay!");
      }
    };

    socket.on("invoice-paid", handleInvoicePaid);

    return () => {
      socket.off("invoice-paid", handleInvoicePaid);
    };
  }, [invoice, isPaid]);

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setInvoice(null);
    setIsCreated(false);
    setIsPaid(false);
    setSelectedSessionId("");
    setSelectedTableNumber("");
    setDiscountPct(0);
    setOrders([]);
    fetchOccupiedSessions();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stylesheet specifically to optimize thermal receipt style print */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          /* Hide everything except printable receipt */
          body > div:first-child,
          header,
          aside,
          nav,
          main > div > *:not(#printable-receipt),
          button {
            display: none !important;
            visibility: hidden !important;
          }
          #printable-receipt {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important; /* Standard thermal receipt width */
            padding: 5mm !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 12px !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* STEP 1 & 2: INVOICE BUILDER & PREVIEW OR CHECKOUT SCREEN */}
      {!isPaid ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form Card */}
          <Card className="border-zinc-800 bg-zinc-900 text-zinc-100 h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white font-heading flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-500" />
                {isCreated ? "Thông tin Hóa Đơn" : "Tạo Hóa Đơn"}
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                {isCreated ? "Vui lòng kiểm tra lại thông tin và xác nhận thanh toán." : "Chọn bàn đang hoạt động để tiến hành tạo hóa đơn."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isCreated ? (
                <>
                  {/* Select Table Session */}
                  <Field>
                    <FieldLabel className="text-xs text-zinc-300">Bàn / Session có khách</FieldLabel>
                    <div className="flex gap-2">
                      <Select
                        value={selectedSessionId}
                        onValueChange={handleSessionChange}
                        disabled={occupiedTables.length === 0}
                      >
                        <SelectTrigger className="w-full bg-zinc-950/50 border-zinc-800 text-zinc-100 text-xs py-5">
                          <SelectValue placeholder={occupiedTables.length === 0 ? "Không có bàn nào đang hoạt động" : "Chọn bàn ăn..."} />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                          {occupiedTables.map((table) => (
                            <SelectItem key={table.tableSessions[0].id} value={String(table.tableSessions[0].id)} className="focus:bg-zinc-800 focus:text-white">
                              Bàn {table.tableNumber} (Session #{table.tableSessions[0].id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </Field>

                  {/* Discount percentage input */}
                  <Field>
                    <FieldLabel className="text-xs text-zinc-300">Giảm giá (%)</FieldLabel>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={discountPct || ""}
                        onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value))))}
                        placeholder="0"
                        className="bg-zinc-950/50 border-zinc-800 text-zinc-100 pl-10 text-xs py-5"
                      />
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    </div>
                  </Field>

                  {/* Warning if there are pending orders */}
                  {pendingOrders.length > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex gap-2 text-xs">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <div>
                        <span className="font-bold block">Order chưa phục vụ!</span>
                        Bàn này hiện có <strong className="text-white">{pendingOrders.length} order</strong> đang ở trạng thái chuẩn bị. Chỉ có món đã phục vụ (served) mới được đưa vào hóa đơn.
                      </div>
                    </div>
                  )}

                  {/* Create Invoice button */}
                  <Button
                    onClick={handleCreateInvoice}
                    disabled={isSubmitting || !selectedSessionId || servedOrders.length === 0}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold py-5 rounded-xl text-xs cursor-pointer shadow-lg shadow-amber-500/5 mt-4"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <>
                        Tiến hành tạo hóa đơn <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </>
              ) : (
                // Checkout Mode: Show checkout controls
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-2.5 text-xs text-zinc-300">
                    <div className="flex justify-between">
                      <span>Mã hóa đơn:</span>
                      <span className="text-white font-bold">#{invoice?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bàn phục vụ:</span>
                      <span className="text-white font-bold">Bàn {selectedTableNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trạng thái:</span>
                      <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]">Chờ thanh toán</Badge>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handlePayByCash}
                      disabled={isSubmitting || isVnpayLoading}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold py-5 rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-500/5"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <>
                          <DollarSign className="w-4 h-4 mr-1" />
                          Xác nhận Thanh toán tiền mặt
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handlePayByVnpay}
                      disabled={isSubmitting || isVnpayLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-xl text-xs cursor-pointer shadow-lg shadow-blue-600/5 flex items-center justify-center gap-1.5"
                    >
                      {isVnpayLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Thanh toán VNPay (Sandbox)
                        </>
                      )}
                    </Button>
                  </div>

                  <Button
                    onClick={() => setIsCreated(false)}
                    variant="outline"
                    className="w-full border-zinc-850 hover:bg-zinc-800 text-zinc-400 text-xs py-5 rounded-xl cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Quay lại chỉnh sửa
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-time Invoice preview / billing items card */}
          <Card className="border-zinc-800 bg-zinc-900 text-zinc-100 flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white font-heading">
                Xem Trước Hóa Đơn
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Chi tiết các món ăn phục vụ xong cần thanh toán.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              {/* Itemized List */}
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                </div>
              ) : !selectedSessionId ? (
                <div className="p-8 text-center text-zinc-600 text-xs">
                  Vui lòng chọn bàn ăn để xem trước danh sách món ăn.
                </div>
              ) : servedOrders.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs space-y-2 border border-zinc-800 rounded-xl bg-zinc-900/40">
                  <p className="font-bold text-amber-500">Chưa có món ăn nào được phục vụ xong!</p>
                  <p className="text-zinc-500 text-[10px]">Cần hoàn thành chế biến và giao món cho khách trên trang quản lý order trước khi lập hóa đơn.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Aggregated table list */}
                  <div className="border border-zinc-850 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-950/60 border-b border-zinc-850 text-zinc-400 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Món ăn</th>
                          <th className="p-3 text-center">SL</th>
                          <th className="p-3 text-right">Đơn giá</th>
                          <th className="p-3 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {aggregatedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-900/40">
                            <td className="p-3 font-semibold text-zinc-200">{item.name}</td>
                            <td className="p-3 text-center text-white font-bold">{item.quantity}</td>
                            <td className="p-3 text-right text-zinc-300">{item.unitPrice.toLocaleString("vi-VN")} đ</td>
                            <td className="p-3 text-right text-white font-semibold">{item.subtotal.toLocaleString("vi-VN")} đ</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="p-4 bg-zinc-950/20 border border-zinc-850 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Tạm tính (Subtotal):</span>
                      <span className="text-zinc-200">{subtotal.toLocaleString("vi-VN")} đ</span>
                    </div>
                    {discountPct > 0 && (
                      <div className="flex justify-between text-zinc-400">
                        <span>Giảm giá ({discountPct}%):</span>
                        <span className="text-amber-500">-{discountAmount.toLocaleString("vi-VN")} đ</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-zinc-850">
                      <span>Tổng cộng (Total):</span>
                      <span className="text-amber-500 text-base">{total.toLocaleString("vi-VN")} đ</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // SUCCESS CHECKOUT SCREEN (INVOICE PAID)
        <div className="max-w-md mx-auto space-y-6 no-print">
          <Card className="border-zinc-800 bg-zinc-900 text-zinc-100 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-500" />
            <CardContent className="p-6 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-pulse" />
              <div>
                <h3 className="text-xl font-bold text-white font-heading">Thanh Toán Thành Công!</h3>
                <p className="text-xs text-zinc-400 mt-1">Đã hoàn thành phiên phục vụ bàn số {selectedTableNumber}.</p>
              </div>

              <div className="border border-zinc-850 rounded-xl p-4 bg-zinc-950/40 text-xs text-left space-y-2 text-zinc-300">
                <div className="flex justify-between">
                  <span>Mã hóa đơn:</span>
                  <span className="text-white font-bold">#{invoice?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tổng tiền đã thu:</span>
                  <span className="text-emerald-400 font-extrabold">{Number(invoice?.total || 0).toLocaleString("vi-VN")} đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Phương thức:</span>
                  <span className="text-zinc-200">Tiền mặt (Cash)</span>
                </div>
                <div className="flex justify-between">
                  <span>Thời gian thanh toán:</span>
                  <span className="text-zinc-200">
                    {invoice?.paidAt ? new Date(invoice.paidAt).toLocaleString("vi-VN") : new Date().toLocaleString("vi-VN")}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handlePrint}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold py-4 text-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  In hóa đơn (Receipt)
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1 border-zinc-800 hover:bg-zinc-800 text-xs py-4 cursor-pointer"
                >
                  Đón bàn tiếp theo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PRINT-FRIENDLY THERMAL RECEIPT DISPLAY */}
      {invoice && (
        <div 
          id="printable-receipt" 
          className="hidden p-4 bg-white text-black font-mono text-xs max-w-[80mm] leading-relaxed mx-auto border border-zinc-200"
        >
          <div className="text-center font-bold text-sm tracking-wider uppercase mb-1">
            GOURMET RESTAURANT
          </div>
          <div className="text-center text-[10px] mb-3">
            123 Đường Hải Phòng, Hải Châu, Đà Nẵng<br />
            ĐT: 0905 123 456<br />
            --------------------------------
          </div>

          <div className="space-y-1 text-[11px] mb-3">
            <div>Mã HD: #{invoice.id}</div>
            <div>Bàn phục vụ: Bàn {selectedTableNumber}</div>
            <div>Nhân viên: {staffName}</div>
            <div>Ngày: {new Date(invoice.paidAt || Date.now()).toLocaleString("vi-VN")}</div>
            <div>--------------------------------</div>
          </div>

          {/* Items table */}
          <table className="w-full text-[11px] mb-2">
            <thead>
              <tr className="border-b border-dashed border-black">
                <th className="text-left py-1">Tên món</th>
                <th className="text-center py-1">SL</th>
                <th className="text-right py-1">T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1">{item.name}</td>
                  <td className="text-center py-1">{item.quantity}</td>
                  <td className="text-right py-1">{item.subtotal.toLocaleString("vi-VN")} đ</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-black pt-2 space-y-1.5 text-[11px] text-right">
            <div className="flex justify-between">
              <span>Cộng món ăn:</span>
              <span>{subtotal.toLocaleString("vi-VN")} đ</span>
            </div>
            {discountPct > 0 && (
              <div className="flex justify-between text-black">
                <span>Giảm giá ({discountPct}%):</span>
                <span>-{discountAmount.toLocaleString("vi-VN")} đ</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-black">
              <span>Tổng cộng:</span>
              <span>{total.toLocaleString("vi-VN")} đ</span>
            </div>
          </div>

          <div className="text-center text-[10px] mt-6 pt-4 border-t border-dashed border-black">
            Cảm ơn quý khách. Hẹn gặp lại!<br />
            Powered by Gourmet System
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReceptionistInvoicesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    }>
      <InvoicePageContent />
    </Suspense>
  );
}
