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
  Search, 
  AlertTriangle, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  Package, 
  Boxes, 
  Clipboard, 
  DollarSign, 
  User 
} from "lucide-react";
import { toast } from "sonner";
import { InventoryItem, InventoryItemType } from "@/types";
import { Pagination } from "@/components/ui/pagination";

export default function WarehouseInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "ingredient" | "product" | "low_warning">("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Restock Dialog State
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);
  const [restockQty, setRestockQty] = useState("");
  const [restockSupplier, setRestockSupplier] = useState("");
  const [restockPrice, setRestockPrice] = useState("");
  const [restockNote, setRestockNote] = useState("");

  // Export Dialog State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSubmittingExport, setIsSubmittingExport] = useState(false);
  const [exportQty, setExportQty] = useState("");
  const [exportNote, setExportNote] = useState("");

  // Create Ingredient Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemType, setNewItemType] = useState<InventoryItemType>("ingredient");
  const [newItemMinQty, setNewItemMinQty] = useState("0");
  const [newItemNotes, setNewItemNotes] = useState("");

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/inventory");
      setItems(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải danh sách tồn kho.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const handleOpenRestock = (item: InventoryItem) => {
    setSelectedItem(item);
    setRestockQty("");
    setRestockSupplier("");
    setRestockPrice("");
    setRestockNote("");
    setIsRestockOpen(true);
  };

  const handleOpenExport = (item: InventoryItem) => {
    setSelectedItem(item);
    setExportQty("");
    setExportNote("");
    setIsExportOpen(true);
  };

  const handleExportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const qty = parseFloat(exportQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Số lượng xuất kho phải lớn hơn 0.");
      return;
    }

    const currentQtyNum = Number(selectedItem.currentQty);
    if (qty > currentQtyNum) {
      toast.error(`Số lượng xuất kho (${qty}) vượt quá lượng tồn kho hiện tại (${currentQtyNum} ${selectedItem.unit}).`);
      return;
    }

    setIsSubmittingExport(true);
    try {
      const payload: any = {
        quantity: qty,
      };
      if (exportNote.trim()) payload.note = exportNote;

      const res = await api.post(`/api/inventory/${selectedItem.id}/remove-stock`, payload);
      
      // Update item in local state
      const updatedItem = res.data.data.item;
      setItems(items.map((i) => (i.id === selectedItem.id ? updatedItem : i)));
      
      toast.success(`Đã xuất kho ${qty} ${selectedItem.unit} từ ${selectedItem.name}!`);
      setIsExportOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Lỗi xuất kho.");
    } finally {
      setIsSubmittingExport(false);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const qty = parseFloat(restockQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Số lượng nhập kho phải lớn hơn 0.");
      return;
    }

    setIsSubmittingRestock(true);
    try {
      const payload: any = {
        quantity: qty,
      };
      if (restockSupplier.trim()) payload.supplier = restockSupplier;
      if (restockPrice) payload.unit_cost = parseFloat(restockPrice);
      if (restockNote.trim()) payload.note = restockNote;

      const res = await api.post(`/api/inventory/${selectedItem.id}/add-stock`, payload);
      
      // Update item in local state
      const updatedItem = res.data.data.item;
      setItems(items.map((i) => (i.id === selectedItem.id ? updatedItem : i)));
      
      toast.success(`Đã nhập kho ${qty} ${selectedItem.unit} cho ${selectedItem.name}!`);
      setIsRestockOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Lỗi nhập kho.");
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newItemName.trim() || !newItemUnit.trim()) {
      toast.error("Vui lòng nhập đầy đủ Tên và Đơn vị tính.");
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const payload = {
        name: newItemName,
        unit: newItemUnit,
        item_type: newItemType,
        min_qty: parseFloat(newItemMinQty) || 0,
        notes: newItemNotes
      };

      const res = await api.post("/api/inventory", payload);
      setItems([res.data.data, ...items]);
      toast.success(`Đã tạo ${newItemType === "ingredient" ? "nguyên liệu" : "hàng hoá"} mới thành công!`);
      setIsCreateOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Không thể thêm nguyên liệu/hàng hoá mới.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Helper properties
  const lowStockCount = items.filter((item) => {
    const qty = Number(item.currentQty);
    const min = Number(item.minQty);
    return qty <= min;
  }).length;

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "ingredient") {
      return matchesSearch && item.itemType === "ingredient";
    }
    if (activeTab === "product") {
      return matchesSearch && item.itemType === "product";
    }
    if (activeTab === "low_warning") {
      const qty = Number(item.currentQty);
      const min = Number(item.minQty);
      return matchesSearch && qty <= min;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Navigation / Filtering Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-5 py-3 text-sm font-semibold transition cursor-pointer ${
            activeTab === "all"
              ? "border-b-2 border-amber-500 text-amber-500"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Tất cả ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("ingredient")}
          className={`px-5 py-3 text-sm font-semibold transition cursor-pointer ${
            activeTab === "ingredient"
              ? "border-b-2 border-amber-500 text-amber-500"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Nguyên liệu ({items.filter(i => i.itemType === "ingredient").length})
        </button>
        <button
          onClick={() => setActiveTab("product")}
          className={`px-5 py-3 text-sm font-semibold transition cursor-pointer ${
            activeTab === "product"
              ? "border-b-2 border-amber-500 text-amber-500"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Hàng hoá ({items.filter(i => i.itemType === "product").length})
        </button>
        <button
          onClick={() => setActiveTab("low_warning")}
          className={`px-5 py-3 text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === "low_warning"
              ? "border-b-2 border-amber-500 text-amber-500"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Cảnh báo thấp
          {lowStockCount > 0 && (
            <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white animate-pulse">
              {lowStockCount}
            </span>
          )}
        </button>
      </div>

      {/* Action / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Tìm nguyên liệu, hàng hoá..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-950 border-zinc-800 text-white rounded-xl pl-10 focus:border-amber-500 transition w-full h-10"
          />
        </div>

        {/* Action Button */}
        <Button
          onClick={() => {
            setNewItemName("");
            setNewItemUnit("");
            setNewItemType("ingredient");
            setNewItemMinQty("0");
            setNewItemNotes("");
            setIsCreateOpen(true);
          }}
          className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl h-10 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Thêm nguyên liệu mới
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm text-zinc-400">Đang tải danh sách kho...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Inventory Table */}
          <Card className="border-zinc-800 bg-zinc-900 shadow-md overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <th className="p-4 pl-6">Tên mặt hàng</th>
                    <th className="p-4">Phân loại</th>
                    <th className="p-4">Tồn kho</th>
                    <th className="p-4">Mức tối thiểu</th>
                    <th className="p-4">Đơn vị</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 pr-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-zinc-500">
                        Không có mặt hàng nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredItems
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((item) => {
                        const current = Number(item.currentQty);
                        const min = Number(item.minQty);
                        const isLowStock = current <= min;

                        return (
                          <tr 
                            key={item.id} 
                            className={`hover:bg-zinc-850/20 transition-colors ${
                              isLowStock 
                                ? "bg-red-500/5 hover:bg-red-500/10" 
                                : ""
                            }`}
                          >
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-2.5">
                                {isLowStock && (
                                  <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse flex-shrink-0" />
                                )}
                                <div>
                                  <span className="font-bold text-white block">{item.name}</span>
                                  {item.notes && (
                                    <span className="text-[10px] text-zinc-500 block truncate max-w-[200px]">{item.notes}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge 
                                variant="secondary" 
                                className={`px-1.5 py-0 text-[10px] font-bold uppercase border ${
                                  item.itemType === "ingredient"
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/15"
                                    : "bg-purple-500/10 text-purple-400 border-purple-500/15"
                                }`}
                              >
                                {item.itemType === "ingredient" ? "Nguyên liệu" : "Hàng hoá"}
                              </Badge>
                            </td>
                            <td className={`p-4 font-bold text-base ${isLowStock ? "text-red-400" : "text-white"}`}>
                              {current.toLocaleString("vi-VN")}
                            </td>
                            <td className="p-4 text-zinc-400 font-semibold">
                              {min.toLocaleString("vi-VN")}
                            </td>
                            <td className="p-4 text-zinc-350 text-xs">
                              {item.unit}
                            </td>
                            <td className="p-4">
                              {isLowStock ? (
                                <Badge className="bg-red-600/10 text-red-400 border border-red-500/25 text-[10px] font-extrabold px-1.5 py-0">
                                  Cần nhập kho
                                </Badge>
                              ) : (
                                <Badge className="bg-green-600/10 text-green-400 border border-green-500/25 text-[10px] font-extrabold px-1.5 py-0">
                                  Đủ hàng
                                </Badge>
                              )}
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenRestock(item)}
                                  className="bg-zinc-850 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300 font-bold text-xs h-8 px-2.5 rounded-lg border border-zinc-750 transition cursor-pointer"
                                >
                                  <ArrowDownToLine className="w-3.5 h-3.5 mr-1" />
                                  Nhập kho
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenExport(item)}
                                  className="bg-zinc-850 hover:bg-red-500 hover:text-zinc-950 text-zinc-300 font-bold text-xs h-8 px-2.5 rounded-lg border border-zinc-750 transition cursor-pointer"
                                >
                                  <ArrowUpFromLine className="w-3.5 h-3.5 mr-1" />
                                  Xuất kho
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredItems.length / pageSize)}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filteredItems.length}
          />
        </div>
      )}

      {/* Restock Dialog (Nhập kho) */}
      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-100 font-heading flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-500" />
              <span>Nhập kho: {selectedItem?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Nhập số lượng, đơn giá và nhà cung cấp để tăng lượng tồn kho.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRestockSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">Số lượng ({selectedItem?.unit}) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="Số lượng..."
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-black rounded-xl pl-9 focus:border-amber-500 transition"
                    required
                  />
                </div>
              </div>

              {/* Price / Cost */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">Đơn giá vốn (đ)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    type="number"
                    placeholder="Đơn giá..."
                    value={restockPrice}
                    onChange={(e) => setRestockPrice(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-black rounded-xl pl-9 focus:border-amber-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Supplier */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium block">Nhà cung cấp</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Tên nhà cung cấp..."
                  value={restockSupplier}
                  onChange={(e) => setRestockSupplier(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-black rounded-xl pl-9 focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium block">Ghi chú</label>
              <div className="relative">
                <Clipboard className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <textarea
                  placeholder="Ghi chú thêm (Hạn sử dụng, mã lô hàng...)"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 text-black rounded-xl p-3 pl-9 text-sm focus:border-amber-500 transition outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <DialogFooter className="flex sm:justify-between items-center pt-3 border-t border-zinc-800 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRestockOpen(false)}
                className="border-zinc-800 hover:bg-zinc-800 text-xs h-10 w-full sm:w-auto cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingRestock}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs h-10 w-full sm:w-auto cursor-pointer"
              >
                {isSubmittingRestock ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Xác nhận nhập kho"
                )}
              </Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Export Dialog (Xuất kho) */}
        <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
          <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-zinc-100 font-heading flex items-center gap-2">
                <Boxes className="w-5 h-5 text-red-500" />
                <span>Xuất kho: {selectedItem?.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Nhập số lượng xuất và lý do xuất kho (chế biến món ăn, hao hụt, hỏng...).
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleExportSubmit} className="space-y-4 pt-2">
              {/* Quantity & Unit */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">
                  Số lượng xuất ({selectedItem?.unit}) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                     type="number"
                     step="0.001"
                     placeholder={`Tối đa ${selectedItem ? Number(selectedItem.currentQty) : 0}...`}
                     value={exportQty}
                     onChange={(e) => setExportQty(e.target.value)}
                     className="bg-zinc-950 border-zinc-800 text-black rounded-xl pl-9 focus:border-red-500 transition"
                     required
                  />
                </div>
                <span className="text-[10px] text-zinc-500 block">
                  Tồn kho hiện tại: {selectedItem ? Number(selectedItem.currentQty).toLocaleString("vi-VN") : 0} {selectedItem?.unit}
                </span>
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">Lý do / Ghi chú</label>
                <div className="relative">
                  <Clipboard className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <textarea
                    placeholder="Ví dụ: Xuất chế biến món ăn, Hàng hỏng hết hạn..."
                    value={exportNote}
                    onChange={(e) => setExportNote(e.target.value)}
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-800 text-black rounded-xl p-3 pl-9 text-sm focus:border-red-500 transition outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <DialogFooter className="flex sm:justify-between items-center pt-3 border-t border-zinc-800 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsExportOpen(false)}
                  className="border-zinc-800 hover:bg-zinc-800 text-xs h-10 w-full sm:w-auto cursor-pointer"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingExport}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs h-10 w-full sm:w-auto cursor-pointer"
                >
                  {isSubmittingExport ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Xác nhận xuất kho"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create New Item Dialog (Thêm nguyên liệu mới) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 max-w-sm animate-fade-in">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-100 font-heading">
              Thêm nguyên liệu / hàng hoá mới
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Nhập thông tin cơ bản của mặt hàng kho mới.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium block">Tên mặt hàng <span className="text-red-500">*</span></label>
              <Input
                placeholder="Ví dụ: Thịt bò Mỹ, Pepsi lon..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-black rounded-xl focus:border-amber-500 transition"
                required
              />
            </div>

            {/* Type & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">Phân loại <span className="text-red-500">*</span></label>
                <select
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value as InventoryItemType)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 px-3 text-zinc-100 text-sm h-10 w-full outline-none focus:border-amber-500 transition"
                  required
                >
                  <option value="ingredient">Nguyên liệu</option>
                  <option value="product">Hàng hoá</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">Đơn vị tính <span className="text-red-500">*</span></label>
                <Input
                  placeholder="kg, lít, lon..."
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-black rounded-xl focus:border-amber-500 transition"
                  required
                />
              </div>
            </div>

            {/* Min Qty */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium block">Mức tồn kho tối thiểu (cảnh báo thấp)</label>
              <Input
                type="number"
                step="0.001"
                placeholder="0"
                value={newItemMinQty}
                onChange={(e) => setNewItemMinQty(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-black rounded-xl focus:border-amber-500 transition"
                min="0"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium block">Mô tả / Ghi chú</label>
              <textarea
                placeholder="Mô tả thêm về mặt hàng kho..."
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                rows={2}
                className="w-full bg-zinc-950 border border-zinc-800 text-black rounded-xl p-3 text-sm focus:border-amber-500 transition outline-none"
              />
            </div>

            {/* Action Buttons */}
            <DialogFooter className="flex sm:justify-between items-center pt-3 border-t border-zinc-800 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="border-zinc-800 hover:bg-zinc-800 text-xs h-10 w-full sm:w-auto cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingCreate}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs h-10 w-full sm:w-auto cursor-pointer"
              >
                {isSubmittingCreate ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Tạo mặt hàng"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
