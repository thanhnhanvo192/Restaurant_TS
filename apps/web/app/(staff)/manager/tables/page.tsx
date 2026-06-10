"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Armchair, 
  QrCode, 
  Download, 
  Printer, 
  MapPin
} from "lucide-react";
import { toast } from "sonner";
import { Table, TableStatus } from "@/types";
import { Pagination } from "@/components/ui/pagination";

export default function ManagerTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TableStatus>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add/Edit Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null); // null = Create mode
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [tableNumber, setTableNumber] = useState("");
  const [capacity, setCapacity] = useState<number>(4);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<TableStatus>("available");

  // QR Code Dialog State
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Fetch tables
  const fetchTables = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/tables");
      setTables(res.data.data || []);
    } catch (error) {
      console.error("Fetch tables error:", error);
      toast.error("Không thể tải danh sách bàn ăn.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, locationFilter]);

  // Open Create Dialog
  const handleOpenCreateDialog = () => {
    setEditingTable(null);
    setTableNumber("");
    setCapacity(4);
    setLocation("Sảnh chính");
    setNotes("");
    setStatus("available");
    setIsDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEditDialog = (table: Table) => {
    setEditingTable(table);
    setTableNumber(table.tableNumber);
    setCapacity(table.capacity);
    setLocation(table.location || "");
    setNotes(table.notes || "");
    setStatus(table.status);
    setIsDialogOpen(true);
  };

  // Submit Form (Create / Update)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tableNumber.trim()) {
      toast.error("Vui lòng nhập số bàn.");
      return;
    }
    if (capacity <= 0) {
      toast.error("Sức chứa phải lớn hơn 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        tableNumber: tableNumber.trim(),
        capacity: Number(capacity),
        location: location.trim() || null,
        notes: notes.trim() || null,
      };

      if (editingTable) {
        // Edit mode
        payload.status = status;
        const res = await api.patch(`/api/tables/${editingTable.id}`, payload);
        if (res.data && res.data.success) {
          toast.success(`Cập nhật bàn ${tableNumber} thành công!`);
          fetchTables(); // Refresh list to get session bindings correctly
          setIsDialogOpen(false);
        } else {
          toast.error(res.data.error || "Cập nhật bàn thất bại.");
        }
      } else {
        // Create mode
        const res = await api.post("/api/tables", payload);
        if (res.data && res.data.success) {
          toast.success(`Thêm bàn ${tableNumber} mới thành công!`);
          fetchTables();
          setIsDialogOpen(false);
        } else {
          toast.error(res.data.error || "Thêm bàn thất bại.");
        }
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Lỗi thao tác trên bàn ăn.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Soft Delete Table
  const handleDeleteTable = async (table: Table) => {
    const confirmMsg = `Bạn có chắc chắn muốn xóa (vô hiệu hóa) Bàn ${table.tableNumber}?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await api.delete(`/api/tables/${table.id}`);
      if (res.data && res.data.success) {
        toast.success(`Đã xóa Bàn ${table.tableNumber} thành công.`);
        setTables(tables.filter((t) => t.id !== table.id));
      } else {
        toast.error(res.data.error || "Xóa bàn thất bại.");
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Không thể xóa bàn ăn.";
      toast.error(errMsg);
    }
  };

  // Open QR Dialog & Generate QR Code
  const handleOpenQrDialog = async (table: Table) => {
    setQrTable(table);
    setQrCodeDataUrl(table.qrCodeUrl || null);
    setIsQrDialogOpen(true);

    // If QR code is not cached in DB yet, trigger generation
    if (!table.qrCodeUrl) {
      setIsGeneratingQr(true);
      try {
        const res = await api.post(`/api/tables/${table.id}/generate-qr`);
        if (res.data && res.data.success && res.data.data.qrCodeUrl) {
          const generatedUrl = res.data.data.qrCodeUrl;
          setQrCodeDataUrl(generatedUrl);
          // Update local state tables list with generated QR
          setTables(prev => prev.map(t => t.id === table.id ? { ...t, qrCodeUrl: generatedUrl } : t));
          toast.success(`Đã tạo mã QR cho Bàn ${table.tableNumber}!`);
        } else {
          toast.error("Không thể sinh mã QR.");
        }
      } catch (error: any) {
        console.error("Generate QR error:", error);
        toast.error("Lỗi sinh mã QR từ server.");
      } finally {
        setIsGeneratingQr(false);
      }
    }
  };

  // Print QR Code
  const handlePrintQr = () => {
    if (!qrCodeDataUrl || !qrTable) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Trình duyệt chặn mở cửa sổ mới. Vui lòng tắt chặn pop-up.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Mã QR Bàn ${qrTable.tableNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .container {
              border: 2px solid #ccc;
              padding: 20px;
              border-radius: 15px;
              max-width: 350px;
            }
            img {
              width: 250px;
              height: 250px;
            }
            h1 {
              font-size: 24px;
              margin: 10px 0;
            }
            p {
              font-size: 14px;
              color: #666;
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <p>Gourmet Restaurant</p>
            <h1>BÀN ${qrTable.tableNumber}</h1>
            <img src="${qrCodeDataUrl}" alt="QR Code" />
            <p>Quét mã QR để đặt bàn & chọn món</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Download QR Code
  const handleDownloadQr = () => {
    if (!qrCodeDataUrl || !qrTable) return;
    const link = document.createElement("a");
    link.href = qrCodeDataUrl;
    link.download = `Ban_${qrTable.tableNumber}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter logic
  const filteredTables = tables.filter((t) => {
    const matchesSearch = t.tableNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesLocation = 
      locationFilter === "all" || 
      (t.location && t.location.toLowerCase() === locationFilter.toLowerCase()) ||
      (!t.location && locationFilter === "Sảnh chính"); // treat null as main lobby

    return matchesSearch && matchesStatus && matchesLocation;
  });

  // Extract unique locations for filtering dropdown
  const uniqueLocations = Array.from(
    new Set(tables.map((t) => t.location || "Sảnh chính"))
  );

  const getStatusBadge = (status: TableStatus) => {
    const configs = {
      available: { label: "Trống", class: "bg-green-500/10 text-green-400 border-green-500/20" },
      reserved: { label: "Đã đặt", class: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
      occupied: { label: "Có khách", class: "bg-red-500/10 text-red-400 border-red-500/20" },
      cleaning: { label: "Dọn dẹp", class: "bg-zinc-800 text-zinc-400 border-zinc-700" },
    };
    const config = configs[status] || { label: status, class: "bg-zinc-800 text-zinc-400 border-zinc-700" };
    return (
      <Badge variant="secondary" className={`px-2.5 py-0.5 text-[10px] font-bold border capitalize ${config.class}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Tìm theo số bàn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-white rounded-xl pl-10 focus:border-amber-500 transition w-full h-10"
            />
          </div>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 px-3 text-zinc-100 text-sm h-10 w-full sm:w-44 outline-none focus:border-amber-500 transition"
          >
            <option value="all">Tất cả khu vực</option>
            {uniqueLocations.map((loc, idx) => (
              <option key={idx} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 px-3 text-zinc-100 text-sm h-10 w-full sm:w-44 outline-none focus:border-amber-500 transition"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="available">Trống</option>
            <option value="reserved">Đã đặt</option>
            <option value="occupied">Có khách</option>
            <option value="cleaning">Dọn dẹp</option>
          </select>
        </div>

        {/* Add Table Button */}
        <Button
          onClick={handleOpenCreateDialog}
          className="w-full lg:w-auto bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl h-10 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Thêm bàn mới
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm text-zinc-400">Đang tải danh sách bàn ăn...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tables Grid/Table */}
          <Card className="border-zinc-800 bg-zinc-900 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <th className="p-4 pl-6">Bàn ăn</th>
                    <th className="p-4">Khu vực</th>
                    <th className="p-4">Sức chứa</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4">Ghi chú</th>
                    <th className="p-4 pr-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredTables.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-12 text-zinc-500">
                        Không tìm thấy bàn nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredTables
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((table) => (
                        <tr key={table.id} className="hover:bg-zinc-850/10 transition-colors">
                          {/* Table Identity */}
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="flex w-9 h-9 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-750 text-amber-500">
                                <Armchair className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-bold text-white block">Bàn {table.tableNumber}</span>
                                <span className="text-[10px] text-zinc-500">ID Bàn: #{table.id}</span>
                              </div>
                            </div>
                          </td>
                          
                          {/* Location */}
                          <td className="p-4 text-zinc-300">
                            <span className="flex items-center gap-1.5 text-xs">
                              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                              {table.location || "Sảnh chính"}
                            </span>
                          </td>

                          {/* Capacity */}
                          <td className="p-4 font-semibold text-white">
                            {table.capacity} khách
                          </td>

                          {/* Status */}
                          <td className="p-4">
                            {getStatusBadge(table.status)}
                          </td>

                          {/* Notes */}
                          <td className="p-4 text-zinc-400 text-xs max-w-xs truncate">
                            {table.notes || <span className="text-zinc-650 italic">Không có</span>}
                          </td>

                          {/* Actions */}
                          <td className="p-4 pr-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* QR Code Dialog Trigger */}
                              <Button
                                size="icon-sm"
                                variant="outline"
                                onClick={() => handleOpenQrDialog(table)}
                                className="border-zinc-800 hover:bg-zinc-800/60 text-zinc-400 hover:text-amber-500 h-8 w-8 rounded-lg cursor-pointer"
                                title="Tải mã QR"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </Button>

                              {/* Edit Trigger */}
                              <Button
                                size="icon-sm"
                                variant="outline"
                                onClick={() => handleOpenEditDialog(table)}
                                className="border-zinc-800 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 h-8 w-8 rounded-lg cursor-pointer"
                                title="Sửa thông tin"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>

                              {/* Soft Delete Trigger */}
                              <Button
                                size="icon-sm"
                                variant="outline"
                                onClick={() => handleDeleteTable(table)}
                                className="border-zinc-800 hover:bg-zinc-800/60 text-zinc-400 hover:text-red-400 h-8 w-8 rounded-lg cursor-pointer"
                                title="Xóa bàn"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredTables.length / pageSize)}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filteredTables.length}
          />
        </div>
      )}

      {/* Add / Edit Table Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black font-heading">
              {editingTable ? `Cập nhật: Bàn ${editingTable.tableNumber}` : "Thêm bàn mới"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Nhập các thông tin cấu hình cho bàn ăn dưới đây.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Table Number */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium block">Số bàn / Tên bàn <span className="text-red-500">*</span></label>
              <Input
                placeholder="Ví dụ: 01, A5, VIP1..."
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-black rounded-xl focus:border-amber-500 transition"
                required
              />
            </div>

            {/* Capacity & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">Sức chứa (khách) <span className="text-red-500">*</span></label>
                <Input
                  type="number"
                  min={1}
                  value={capacity || ""}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="bg-zinc-950 border-zinc-800 text-black rounded-xl focus:border-amber-500 transition"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">Khu vực</label>
                <Input
                  placeholder="Ví dụ: Sảnh chính, Lầu 1, VIP..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-black rounded-xl focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Status (Only available in Edit mode) */}
            {editingTable && (
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">Trạng thái bàn</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TableStatus)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 text-sm h-10 w-full outline-none focus:border-amber-500 transition"
                >
                  <option value="available">Trống (Sẵn sàng)</option>
                  <option value="reserved">Đã đặt trước</option>
                  <option value="occupied">Có khách</option>
                  <option value="cleaning">Đang dọn dẹp</option>
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium block">Ghi chú thêm</label>
              <textarea
                placeholder="Ghi chú về vị trí, đặc điểm của bàn..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-black rounded-xl p-3 text-sm h-20 w-full outline-none focus:border-amber-500 transition"
              />
            </div>

            {/* Dialog Buttons */}
            <DialogFooter className="flex sm:justify-between items-center pt-3 border-t border-zinc-800 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-zinc-800 hover:bg-zinc-800 text-xs h-10 w-full sm:w-auto cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs h-10 w-full sm:w-auto cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingTable ? (
                  "Lưu thay đổi"
                ) : (
                  "Tạo bàn"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Utility Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black font-heading">
              Mã QR check-in: Bàn {qrTable?.tableNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Quét mã QR để tự động check-in và gọi món trực tuyến.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-6">
            {isGeneratingQr ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <p className="text-xs text-zinc-500">Đang sinh mã QR code...</p>
              </div>
            ) : qrCodeDataUrl ? (
              <div className="p-4 bg-white rounded-2xl shadow-inner border border-zinc-200">
                <img src={qrCodeDataUrl} alt="Table QR Code" className="w-48 h-48" />
              </div>
            ) : (
              <div className="text-xs text-red-400 py-12">
                Không thể tải mã QR cho bàn ăn này.
              </div>
            )}

            {qrTable && (
              <div className="mt-4 text-xs">
                <span className="text-zinc-400">Khu vực: </span>
                <span className="text-black font-semibold">{qrTable.location || "Sảnh chính"}</span>
                <span className="text-zinc-500 mx-2">•</span>
                <span className="text-zinc-400">Sức chứa: </span>
                <span className="text-black font-semibold">{qrTable.capacity} khách</span>
              </div>
            )}
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
            <Button
              onClick={handlePrintQr}
              disabled={!qrCodeDataUrl}
              className="bg-zinc-800 hover:bg-zinc-700 text-black font-semibold text-xs h-10 w-full flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-500" /> In mã QR
            </Button>
            <Button
              onClick={handleDownloadQr}
              disabled={!qrCodeDataUrl}
              className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs h-10 w-full flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Tải hình ảnh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
