"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAuthenticated, getUser, removeToken } from "@/lib/auth";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Loader2,
  Calendar,
  Clock,
  Users,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  LogOut,
  ChevronRight,
  BookOpen,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface Table {
  id: number;
  tableNumber: string;
  capacity: number;
  location?: string | null;
  status: string;
}

interface Reservation {
  id: number;
  tableId: number;
  reservedDate: string;
  reservedTime: string;
  guestCount: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  customerNote?: string | null;
  staffNote?: string | null;
  table?: Table | null;
}

export default function ReservationsPage() {
  const router = useRouter();
  const [isMount, setIsMount] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Active Tab: 'list' or 'new'
  const [activeTab, setActiveTab] = useState<"list" | "new">("list");

  // Booking Form State
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [guestCount, setGuestCount] = useState(2);
  const [customerNote, setCustomerNote] = useState("");

  // Table Search State
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [isSearchingTables, setIsSearchingTables] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Submit Booking State
  const [isBooking, setIsBooking] = useState(false);

  // Authenticate and load reservations
  useEffect(() => {
    setIsMount(true);
    
    if (!isAuthenticated()) {
      toast.error("Vui lòng đăng nhập để tiếp tục.");
      router.push("/customer/login?redirect=/customer/reservations");
      return;
    }

    const customer = getUser();
    if (customer && customer.role === "customer") {
      setCustomerName(customer.name || customer.email || "Khách Hàng");
    } else {
      toast.error("Tài khoản không hợp lệ.");
      router.push("/customer/login?redirect=/customer/reservations");
      return;
    }

    // Set default reservation date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split("T")[0]);
    setBookingTime("18:30");

    fetchMyReservations();
  }, []);

  // Listen to real-time events for this customer
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      console.log("[Socket] Customer Subscribing to reservation events");

      const handleConfirmed = (data: {
        reservationId: number;
        tableNumber: string;
        status: string;
        staffNote?: string;
      }) => {
        console.log("[Socket] reservation-confirmed received:", data);
        setReservations((prev) =>
          prev.map((res) =>
            res.id === data.reservationId
              ? { ...res, status: "confirmed", staffNote: data.staffNote || res.staffNote }
              : res
          )
        );
        toast.success(`Đơn đặt bàn #${data.reservationId} (Bàn ${data.tableNumber}) đã được XÁC NHẬN!`);
      };

      const handleCancelled = (data: {
        reservationId: number;
        tableNumber: string;
        status: string;
        staffNote?: string;
      }) => {
        console.log("[Socket] reservation-cancelled received:", data);
        setReservations((prev) =>
          prev.map((res) =>
            res.id === data.reservationId
              ? { ...res, status: "cancelled", staffNote: data.staffNote || res.staffNote }
              : res
          )
        );
        toast.error(`Đơn đặt bàn #${data.reservationId} đã bị HỦY. Lý do: "${data.staffNote || ''}"`);
      };

      socket.on("reservation-confirmed", handleConfirmed);
      socket.on("reservation-cancelled", handleCancelled);

      return () => {
        socket.off("reservation-confirmed", handleConfirmed);
        socket.off("reservation-cancelled", handleCancelled);
      };
    }
  }, []);

  const fetchMyReservations = async () => {
    setIsLoadingList(true);
    try {
      const response = await api.get("/api/reservations/my");
      if (response.data && response.data.success) {
        setReservations(response.data.data);
      } else {
        toast.error("Không thể tải danh sách đặt bàn.");
      }
    } catch (error) {
      console.error("Load reservations error:", error);
      toast.error("Lỗi tải thông tin đặt bàn.");
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    disconnectSocket();
    toast.success("Đã đăng xuất tài khoản.");
    router.push("/customer/login");
  };

  // Find vacant tables matching parameters
  const handleSearchTables = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime || guestCount <= 0) {
      toast.error("Vui lòng điền đầy đủ ngày, giờ và số khách.");
      return;
    }

    setIsSearchingTables(true);
    setSelectedTableId(null);
    setHasSearched(false);

    try {
      const response = await api.get("/api/reservations/available-tables", {
        params: {
          date: bookingDate,
          time: bookingTime,
          guest_count: guestCount,
        },
      });

      if (response.data && response.data.success) {
        setAvailableTables(response.data.data);
        setHasSearched(true);
        if (response.data.data.length === 0) {
          toast.info("Không có bàn trống phù hợp với yêu cầu.");
        } else {
          toast.success(`Tìm thấy ${response.data.data.length} bàn trống.`);
        }
      } else {
        toast.error("Lỗi tìm kiếm bàn trống.");
      }
    } catch (error: any) {
      console.error("Search tables error:", error);
      const errMsg = error.response?.data?.error || "Không thể tìm kiếm bàn trống.";
      toast.error(errMsg);
    } finally {
      setIsSearchingTables(false);
    }
  };

  // Submit new booking
  const handleCreateReservation = async () => {
    if (!selectedTableId) {
      toast.error("Vui lòng chọn bàn muốn đặt.");
      return;
    }

    setIsBooking(true);
    const payload = {
      tableId: selectedTableId,
      date: bookingDate,
      time: bookingTime,
      guestCount: Number(guestCount),
      customerNote: customerNote || undefined,
    };

    try {
      const response = await api.post("/api/reservations", payload);
      if (response.data && response.data.success) {
        toast.success("Đặt bàn thành công! Đang chờ lễ tân xác nhận.");
        
        // Reset search states
        setSelectedTableId(null);
        setAvailableTables([]);
        setCustomerNote("");
        setHasSearched(false);
        
        // Refresh and switch tab
        fetchMyReservations();
        setActiveTab("list");
      } else {
        toast.error(response.data.error || "Đặt bàn thất bại.");
      }
    } catch (error: any) {
      console.error("Submit booking error:", error);
      const errMsg = error.response?.data?.error || "Đã xảy ra lỗi khi tạo đặt bàn.";
      toast.error(errMsg);
    } finally {
      setIsBooking(false);
    }
  };

  // Cancel own booking
  const handleCancelReservation = async (reservationId: number) => {
    const confirmCancel = window.confirm("Quý khách có chắc chắn muốn hủy đặt bàn này không?");
    if (!confirmCancel) return;

    try {
      const response = await api.patch(`/api/reservations/${reservationId}/cancel`, {
        reason: "Khách hàng tự hủy trên giao diện",
      });

      if (response.data && response.data.success) {
        toast.success("Đã hủy đặt bàn thành công.");
        fetchMyReservations();
      } else {
        toast.error(response.data.error || "Không thể hủy đặt bàn.");
      }
    } catch (error: any) {
      console.error("Cancel reservation error:", error);
      const errMsg = error.response?.data?.error || "Lỗi khi hủy đặt bàn.";
      toast.error(errMsg);
    }
  };

  // Format Helper functions
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    if (timeStr.includes("T")) {
      const parts = timeStr.split("T");
      if (parts.length === 2) {
        return parts[1].substring(0, 5);
      }
    }
    return timeStr.substring(0, 5);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getStatusBadge = (status: Reservation["status"]) => {
    const config = {
      pending: { label: "Chờ xác nhận", class: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
      confirmed: { label: "Đã xác nhận", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      cancelled: { label: "Đã hủy", class: "bg-red-500/10 text-red-400 border-red-500/20" },
      completed: { label: "Hoàn tất", class: "bg-zinc-800 text-zinc-400 border-zinc-700" },
    };
    const match = config[status] || { label: status, class: "bg-zinc-800 text-zinc-400 border-zinc-700" };
    return (
      <Badge variant="outline" className={`${match.class} text-xs py-0.5 px-2 font-medium`}>
        {match.label}
      </Badge>
    );
  };

  if (!isMount) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 pb-16 selection:bg-amber-500 selection:text-zinc-950">
      {/* Top Banner and Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-5 text-amber-500" />
          <h1 className="text-sm font-semibold text-zinc-100">Gourmet Booking</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-800/40 px-2.5 py-1 rounded-lg border border-zinc-800">
            <User className="size-3.5 text-amber-500" />
            <span className="max-w-[80px] truncate font-medium text-zinc-300">{customerName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 hover:border-red-900/30 text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-red-950/20 cursor-pointer transition-all"
            title="Đăng xuất"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto w-full px-4 py-6 space-y-6">
        {/* Banner */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">ĐẶT BÀN ONLINE</h2>
          <p className="text-xs text-zinc-400">Trải nghiệm bữa tiệc sang trọng và chu đáo</p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
          <button
            onClick={() => setActiveTab("list")}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "list" ? "bg-primary text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <BookOpen className="size-3.5" /> Lịch sử đặt bàn
          </button>
          <button
            onClick={() => setActiveTab("new")}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "new" ? "bg-primary text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Plus className="size-3.5" /> Đặt bàn mới
          </button>
        </div>

        {/* PAGE 3A: LIST RESERVATIONS */}
        {activeTab === "list" && (
          <div className="space-y-4">
            {isLoadingList ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="h-32 bg-zinc-900/30 border border-zinc-900 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <Card className="border-zinc-850 bg-zinc-900/10 text-center py-12">
                <CardContent className="space-y-3">
                  <Calendar className="size-8 mx-auto text-zinc-600 stroke-[1.5]" />
                  <p className="text-xs text-zinc-400">Quý khách chưa có đơn đặt bàn nào.</p>
                  <Button
                    onClick={() => setActiveTab("new")}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold px-4"
                  >
                    Đặt bàn ngay
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reservations.map((res) => (
                  <Card
                    key={res.id}
                    className="border-zinc-905 bg-zinc-900/20 backdrop-blur-xl relative overflow-hidden"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-semibold">
                          <span>Mã đặt bàn:</span>
                          <span className="text-zinc-200">#{res.id}</span>
                        </div>
                        {getStatusBadge(res.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 text-xs pt-1 border-t border-zinc-900/60">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Calendar className="size-3.5 text-amber-500" />
                          <span className="text-zinc-200 font-medium">{formatDate(res.reservedDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Clock className="size-3.5 text-amber-500" />
                          <span className="text-zinc-200 font-medium">{formatTime(res.reservedTime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400 col-span-2">
                          <Users className="size-3.5 text-amber-500" />
                          <span className="text-zinc-200">
                            Số khách: <strong className="text-zinc-100">{res.guestCount}</strong> người
                          </span>
                        </div>
                        {res.table && (
                          <div className="flex items-center gap-1.5 text-zinc-400 col-span-2">
                            <span className="inline-block w-3.5 h-3.5 rounded-full bg-zinc-800 text-[9px] font-bold flex items-center justify-center text-amber-500 border border-zinc-700">
                              B
                            </span>
                            <span className="text-zinc-200">
                              Bàn số: <strong className="text-zinc-100">{res.table.tableNumber}</strong> (Sức chứa {res.table.capacity} • {res.table.location || "Sảnh chính"})
                            </span>
                          </div>
                        )}
                        {res.customerNote && (
                          <div className="col-span-2 text-[11px] text-zinc-500 italic mt-0.5 bg-zinc-950/20 p-2 rounded-lg border border-zinc-900/50">
                            Ghi chú: "{res.customerNote}"
                          </div>
                        )}
                      </div>

                      {res.status === "pending" && (
                        <div className="flex justify-end pt-1">
                          <Button
                            onClick={() => handleCancelReservation(res.id)}
                            variant="destructive"
                            size="sm"
                            className="text-xs h-7 px-3 rounded-lg flex items-center gap-1 border-0 cursor-pointer"
                          >
                            <XCircle className="size-3.5" /> Hủy đặt bàn
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAGE 3B: NEW RESERVATION FORM */}
        {activeTab === "new" && (
          <div className="space-y-5">
            <Card className="border-zinc-850 bg-zinc-900/20 backdrop-blur-xl">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-base font-bold text-zinc-100">Tìm Bàn Trống</CardTitle>
                <CardDescription className="text-xs text-zinc-400">Chọn thời gian và số lượng khách để kiểm tra bàn khả dụng.</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleSearchTables} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel className="text-zinc-300 text-xs" htmlFor="bookingDate">Ngày đặt bàn</FieldLabel>
                      <Input
                        id="bookingDate"
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="bg-zinc-950/50 border-zinc-800 text-zinc-100 text-xs focus:border-amber-500/50 focus:ring-amber-500/10"
                      />
                    </Field>

                    <Field>
                      <FieldLabel className="text-zinc-300 text-xs" htmlFor="bookingTime">Giờ đến</FieldLabel>
                      <Input
                        id="bookingTime"
                        type="time"
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="bg-zinc-950/50 border-zinc-800 text-zinc-100 text-xs focus:border-amber-500/50 focus:ring-amber-500/10"
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel className="text-zinc-300 text-xs" htmlFor="guestCount">Số lượng khách</FieldLabel>
                    <Input
                      id="guestCount"
                      type="number"
                      min={1}
                      max={30}
                      value={guestCount}
                      onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
                      className="bg-zinc-950/50 border-zinc-800 text-zinc-100 text-xs focus:border-amber-500/50 focus:ring-amber-500/10"
                    />
                  </Field>

                  <Button
                    type="submit"
                    disabled={isSearchingTables}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    {isSearchingTables ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-white" />
                        Đang quét dữ liệu...
                      </>
                    ) : (
                      <>
                        <Search className="size-4 text-white" /> Tìm bàn trống
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Empty lookup / results layout */}
            {hasSearched && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider">
                    Danh Sách Bàn Trống ({availableTables.length})
                  </h3>
                  {selectedTableId && (
                    <Badge className="bg-amber-500 text-zinc-950 text-[10px] font-bold">
                      Đã chọn 1 bàn
                    </Badge>
                  )}
                </div>

                {availableTables.length === 0 ? (
                  <div className="p-6 text-center border border-zinc-800 rounded-xl bg-zinc-900/10 text-zinc-500 space-y-2">
                    <AlertCircle className="size-6 mx-auto opacity-30 text-amber-500" />
                    <p className="text-xs">Không có bàn nào thỏa mãn điều kiện công suất hoặc lịch trống.</p>
                    <p className="text-[10px] text-zinc-650">Vui lòng thay đổi giờ (±2 tiếng) hoặc chọn số người phù hợp.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availableTables.map((table) => {
                      const isSelected = selectedTableId === table.id;
                      return (
                        <div
                          key={table.id}
                          onClick={() => setSelectedTableId(table.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-24 ${
                            isSelected
                              ? "bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/5"
                              : "bg-zinc-900/20 border-zinc-900 hover:border-zinc-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-zinc-100">Bàn {table.tableNumber}</span>
                            <span className="text-[10px] text-zinc-500 font-medium">Sức chứa: {table.capacity}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-400 block truncate">
                              {table.location || "Sảnh chính"}
                            </span>
                            <span className="text-[9px] text-zinc-500">
                              Cặp đôi / Nhóm nhỏ
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedTableId && (
                  <Card className="border-zinc-800 bg-zinc-900/20 backdrop-blur-xl animate-fade-in">
                    <CardContent className="p-4 space-y-3">
                      <Field>
                        <FieldLabel className="text-zinc-300 text-xs" htmlFor="customerNote">
                          Ghi chú đặc biệt (Tùy chọn)
                        </FieldLabel>
                        <Input
                          id="customerNote"
                          type="text"
                          placeholder="Ví dụ: Bàn gần cửa sổ, ăn kiêng..."
                          value={customerNote}
                          onChange={(e) => setCustomerNote(e.target.value)}
                          className="bg-zinc-950/50 border-zinc-800 text-zinc-100 text-xs focus:border-amber-500/50 focus:ring-amber-500/10"
                        />
                      </Field>

                      <Button
                        onClick={handleCreateReservation}
                        disabled={isBooking}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold py-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10 border-0"
                      >
                        {isBooking ? (
                          <>
                            <Loader2 className="size-4 animate-spin text-zinc-950" />
                            Đang tạo đặt bàn...
                          </>
                        ) : (
                          <>
                            Xác nhận đặt bàn <ChevronRight className="size-4" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
