"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Phone,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Reservation, ReservationStatus } from "@/types";

export default function ReceptionistReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Dialog actions
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [dialogAction, setDialogAction] = useState<"confirm" | "cancel" | null>(null);
  const [staffNote, setStaffNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load reservations
  const fetchReservations = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await api.get("/api/reservations");
      if (response.data && response.data.success) {
        setReservations(response.data.data || []);
      } else {
        toast.error("Không thể tải danh sách đặt bàn.");
      }
    } catch (error) {
      console.error("Fetch reservations error:", error);
      toast.error("Lỗi kết nối máy chủ để tải thông tin đặt bàn.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations(true);
  }, [fetchReservations]);

  // Socket IO Real-time integration
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      console.log("[Socket] Subscribing to receptionist events in Reservations Page");

      // Realtime notification when customer creates a reservation
      socket.on("new-reservation", (data: any) => {
        console.log("[Socket] new-reservation received:", data);
        
        // Refresh full list from DB to ensure correct object structure & joins
        fetchReservations(false);
      });

      // Realtime status updates if another receptionist actions a booking
      socket.on("reservation-confirmed", (data: { reservationId: number; status: string }) => {
        console.log("[Socket] reservation-confirmed received:", data);
        setReservations((prev) =>
          prev.map((res) =>
            res.id === data.reservationId ? { ...res, status: "confirmed" as ReservationStatus } : res
          )
        );
      });

      socket.on("reservation-cancelled", (data: { reservationId: number; status: string }) => {
        console.log("[Socket] reservation-cancelled received:", data);
        setReservations((prev) =>
          prev.map((res) =>
            res.id === data.reservationId ? { ...res, status: "cancelled" as ReservationStatus } : res
          )
        );
      });
    }

    return () => {
      if (socket) {
        socket.off("new-reservation");
        socket.off("reservation-confirmed");
        socket.off("reservation-cancelled");
      }
    };
  }, [fetchReservations]);

  // Handle Confirm
  const handleConfirmReservation = async () => {
    if (!selectedRes) return;
    setIsSubmitting(true);
    try {
      const response = await api.patch(`/api/reservations/${selectedRes.id}/confirm`, {
        staffNote: staffNote || undefined,
      });

      if (response.data && response.data.success) {
        toast.success(`Đã xác nhận đặt bàn #${selectedRes.id} thành công.`);
        setReservations((prev) =>
          prev.map((res) =>
            res.id === selectedRes.id
              ? { ...res, status: "confirmed", staffNote: staffNote || res.staffNote }
              : res
          )
        );
        closeDialog();
      } else {
        toast.error(response.data.error || "Không thể xác nhận đặt bàn.");
      }
    } catch (error: any) {
      console.error("Confirm reservation error:", error);
      const errMsg = error.response?.data?.error || "Lỗi xử lý xác nhận đặt bàn.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel
  const handleCancelReservation = async () => {
    if (!selectedRes) return;
    setIsSubmitting(true);
    try {
      const response = await api.patch(`/api/reservations/${selectedRes.id}/cancel`, {
        reason: cancelReason || "Lễ tân hủy đặt bàn",
      });

      if (response.data && response.data.success) {
        toast.success(`Đã hủy đặt bàn #${selectedRes.id} thành công.`);
        setReservations((prev) =>
          prev.map((res) =>
            res.id === selectedRes.id
              ? { ...res, status: "cancelled", staffNote: cancelReason || res.staffNote }
              : res
          )
        );
        closeDialog();
      } else {
        toast.error(response.data.error || "Không thể hủy đặt bàn.");
      }
    } catch (error: any) {
      console.error("Cancel reservation error:", error);
      const errMsg = error.response?.data?.error || "Lỗi xử lý hủy đặt bàn.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openActionDialog = (res: Reservation, action: "confirm" | "cancel") => {
    setSelectedRes(res);
    setDialogAction(action);
    setStaffNote("");
    setCancelReason("");
  };

  const closeDialog = () => {
    setSelectedRes(null);
    setDialogAction(null);
    setStaffNote("");
    setCancelReason("");
  };

  // Formatting helpers
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
      pending: { label: "Chờ xử lý", class: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
      confirmed: { label: "Đã xác nhận", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      cancelled: { label: "Đã hủy", class: "bg-red-500/10 text-red-400 border-red-500/20" },
      completed: { label: "Hoàn tất", class: "bg-zinc-800 text-zinc-400 border-zinc-700" },
    };
    const match = config[status] || { label: status, class: "bg-zinc-800 text-zinc-400 border-zinc-700" };
    return (
      <Badge variant="outline" className={`${match.class} text-xs py-0.5 px-2.5 font-bold`}>
        {match.label}
      </Badge>
    );
  };

  // Filter & Search Logic
  const filteredReservations = reservations.filter((res) => {
    // 1. Tab filter
    if (activeTab === "pending" && res.status !== "pending") return false;

    // 2. Search query (Customer Name, Phone, Table Number)
    const custName = res.user?.name?.toLowerCase() || "";
    const custPhone = res.user?.phone || "";
    const tblNum = res.table?.tableNumber?.toLowerCase() || "";
    const query = searchTerm.toLowerCase();

    const matchesSearch =
      custName.includes(query) ||
      custPhone.includes(query) ||
      tblNum.includes(query) ||
      String(res.id).includes(query);

    // 3. Date filter
    let matchesDate = true;
    if (filterDate) {
      const resDateFormatted = new Date(res.reservedDate).toISOString().split("T")[0];
      matchesDate = resDateFormatted === filterDate;
    }

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Quick Summary Panels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4 flex flex-col justify-between h-20">
            <span className="text-xs font-semibold text-zinc-400">Tổng đơn đặt bàn</span>
            <span className="text-2xl font-bold text-white mt-1">{reservations.length}</span>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex flex-col justify-between h-20">
            <span className="text-xs font-semibold text-amber-500">Chờ xác nhận</span>
            <span className="text-2xl font-bold text-amber-500 mt-1">
              {reservations.filter((r) => r.status === "pending").length}
            </span>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex flex-col justify-between h-20">
            <span className="text-xs font-semibold text-emerald-400">Đã xác nhận</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1">
              {reservations.filter((r) => r.status === "confirmed").length}
            </span>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4 flex flex-col justify-between h-20">
            <span className="text-xs font-semibold text-zinc-450">Hủy / Hoàn tất</span>
            <span className="text-2xl font-bold text-zinc-400 mt-1">
              {reservations.filter((r) => r.status === "cancelled" || r.status === "completed").length}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Tab Section */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-zinc-900 p-4 rounded-xl border border-zinc-850">
        {/* Switch Tab buttons */}
        <div className="flex gap-1.5 p-1 bg-zinc-950 border border-zinc-850 rounded-xl max-w-xs">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 py-1.5 px-4 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "pending"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Chờ xử lý ({reservations.filter((r) => r.status === "pending").length})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-1.5 px-4 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "all"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Tất cả ({reservations.length})
          </button>
        </div>

        {/* Search Input and Date Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 md:justify-end">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Tìm tên khách, SĐT, số bàn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100 text-xs focus:ring-amber-500/10 focus:border-amber-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500 shrink-0" />
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs focus:ring-amber-500/10 focus:border-amber-500/50 w-full sm:w-auto"
            />
            {filterDate && (
              <Button
                variant="ghost"
                onClick={() => setFilterDate("")}
                className="text-[10px] text-zinc-400 hover:text-white px-2 cursor-pointer"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-zinc-900/30 border border-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredReservations.length === 0 ? (
        <Card className="border-zinc-850 bg-zinc-900/10 text-center py-16">
          <CardContent className="space-y-3">
            <CalendarIcon className="size-10 mx-auto text-zinc-655 opacity-30 stroke-[1.5]" />
            <h3 className="text-sm font-bold text-zinc-300">Không tìm thấy yêu cầu đặt bàn nào</h3>
            <p className="text-xs text-zinc-500">
              {activeTab === "pending"
                ? "Hiện tại không có đơn đặt bàn mới nào đang chờ xử lý."
                : "Không có kết quả nào trùng khớp với bộ lọc tìm kiếm."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReservations.map((res) => (
            <Card
              key={res.id}
              className={`border-zinc-850 bg-zinc-900/20 backdrop-blur-xl relative overflow-hidden transition-all duration-300 hover:bg-zinc-900/30 ${
                res.status === "pending" ? "border-l-4 border-l-amber-500" : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left block: Core details */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-bold text-zinc-400">Mã: #{res.id}</span>
                      {getStatusBadge(res.status)}
                      <span className="text-[11px] text-zinc-550">
                        Đặt ngày: {new Date(res.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-xs">
                      {/* Customer Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-zinc-300 font-semibold text-sm">
                          <User className="h-3.5 w-3.5 text-amber-500" />
                          <span>{res.user?.name || "Khách Vãng Lai"}</span>
                        </div>
                        {res.user?.phone && (
                          <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                            <Phone className="h-3 w-3 text-zinc-500" />
                            <span>{res.user.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* DateTime Reservation */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <CalendarIcon className="h-3.5 w-3.5 text-amber-500" />
                          <span>Ngày: <strong>{formatDate(res.reservedDate)}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                          <span>Giờ: <strong>{formatTime(res.reservedTime)}</strong></span>
                        </div>
                      </div>

                      {/* Table / Guests */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <Users className="h-3.5 w-3.5 text-amber-500" />
                          <span>Số khách: <strong className="text-white">{res.guestCount}</strong> người</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <span className="inline-block w-3.5 h-3.5 rounded-full bg-zinc-800 text-[9px] font-bold flex items-center justify-center text-amber-500 border border-zinc-700">
                            B
                          </span>
                          <span>
                            Bàn: <strong className="text-white">{res.table?.tableNumber || "--"}</strong>
                            {res.table?.location && ` (${res.table.location})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Notes block */}
                    {res.customerNote && (
                      <div className="text-[11px] text-zinc-400 italic bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 max-w-2xl">
                        Khách ghi chú: "{res.customerNote}"
                      </div>
                    )}
                    {res.staffNote && (
                      <div className="text-[11px] text-amber-400 bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/10 max-w-2xl">
                        Nhân viên ghi chú / Lý do hủy: "{res.staffNote}"
                        {res.confirmedBy && ` (Xử lý bởi: ${res.confirmedBy.name})`}
                      </div>
                    )}
                  </div>

                  {/* Right block: Action buttons */}
                  {res.status === "pending" && (
                    <div className="flex sm:flex-row lg:flex-col gap-2 shrink-0 pt-3 lg:pt-0 border-t border-zinc-800/40 lg:border-t-0 lg:pl-4">
                      <Button
                        onClick={() => openActionDialog(res, "confirm")}
                        className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Xác nhận
                      </Button>
                      <Button
                        onClick={() => openActionDialog(res, "cancel")}
                        variant="destructive"
                        className="text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Hủy yêu cầu
                      </Button>
                    </div>
                  )}
                  {res.status === "confirmed" && (
                    <div className="flex sm:flex-row lg:flex-col gap-2 shrink-0 pt-3 lg:pt-0 border-t border-zinc-800/40 lg:border-t-0 lg:pl-4">
                      <Button
                        onClick={() => openActionDialog(res, "cancel")}
                        variant="destructive"
                        className="text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Hủy đặt bàn
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation & Cancel Action Dialog */}
      <Dialog open={selectedRes !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              {dialogAction === "confirm" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Xác nhận đặt bàn #{selectedRes?.id}
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-400" />
                  Hủy yêu cầu đặt bàn #{selectedRes?.id}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Khách hàng: <strong className="text-white">{selectedRes?.user?.name}</strong> • Số điện thoại:{" "}
              <strong className="text-white">{selectedRes?.user?.phone || "N/A"}</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Form fields inside dialog */}
          <div className="py-2 space-y-4">
            {dialogAction === "confirm" ? (
              <div className="space-y-2">
                <Label htmlFor="staffNote" className="text-zinc-300 text-xs">Ghi chú của tiếp tân (Tùy chọn)</Label>
                <Input
                  id="staffNote"
                  placeholder="Ví dụ: Đã sắp xếp bàn tốt nhất, chuẩn bị hoa..."
                  value={staffNote}
                  onChange={(e) => setStaffNote(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs focus:ring-amber-500/10 focus:border-amber-500/50"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="cancelReason" className="text-zinc-300 text-xs">Lý do hủy đặt bàn (Bắt buộc)</Label>
                <Input
                  id="cancelReason"
                  placeholder="Ví dụ: Khách báo hủy qua điện thoại, hết bàn..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs focus:ring-red-500/10 focus:border-red-500/50"
                  required
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isSubmitting}
              className="border-zinc-850 hover:bg-zinc-800 text-xs h-9 cursor-pointer"
            >
              Đóng
            </Button>
            {dialogAction === "confirm" ? (
              <Button
                onClick={handleConfirmReservation}
                disabled={isSubmitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs h-9 px-4 cursor-pointer shadow-md shadow-emerald-500/5"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Xác nhận đặt bàn"}
              </Button>
            ) : (
              <Button
                onClick={handleCancelReservation}
                disabled={isSubmitting || !cancelReason.trim()}
                variant="destructive"
                className="text-xs h-9 px-4 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Hủy đặt bàn"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
