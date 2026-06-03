"use client";

import React, { useEffect, useState, useRef } from "react";
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
  Trash, 
  Search, 
  Upload, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { MenuCategory, MenuItem } from "@/types";

export default function ManagerMenuPage() {
  const [activeTab, setActiveTab] = useState<"categories" | "items">("items");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Categories state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Items state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null); // null means "Create" mode
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // Form states for item
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemSortOrder, setItemSortOrder] = useState("0");
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resCats, resItems] = await Promise.all([
        api.get("/api/menu/categories"),
        api.get("/api/menu/items")
      ]);
      setCategories(resCats.data.data || []);
      setItems(resItems.data.data || []);
    } catch (error) {
      console.error("Failed to fetch menu data:", error);
      toast.error("Không thể tải thông tin thực đơn.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Categories CRUD ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsSubmittingCategory(true);
    try {
      const res = await api.post("/api/menu/categories", {
        name: newCategoryName,
        sortOrder: categories.length + 1
      });
      setCategories([...categories, res.data.data]);
      setNewCategoryName("");
      toast.success("Đã thêm danh mục mới thành công!");
    } catch (error) {
      console.error(error);
      toast.error("Không thể thêm danh mục.");
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleStartEditCategory = (cat: MenuCategory) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editingCategoryName.trim()) return;

    try {
      const res = await api.patch(`/api/menu/categories/${id}`, {
        name: editingCategoryName
      });
      setCategories(
        categories.map((c) => (c.id === id ? { ...c, name: res.data.data.name } : c))
      );
      setEditingCategoryId(null);
      setEditingCategoryName("");
      toast.success("Cập nhật danh mục thành công!");
    } catch (error) {
      console.error(error);
      toast.error("Không thể cập nhật danh mục.");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xoá danh mục này? Các món ăn thuộc danh mục này sẽ không bị xoá nhưng danh mục sẽ bị ẩn.")) return;

    try {
      await api.delete(`/api/menu/categories/${id}`);
      setCategories(categories.filter((c) => c.id !== id));
      toast.success("Đã xoá danh mục.");
    } catch (error) {
      console.error(error);
      toast.error("Không thể xoá danh mục.");
    }
  };

  // --- Items CRUD ---
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemName("");
    setItemPrice("");
    setItemDescription("");
    setItemCategoryId(categories[0]?.id?.toString() || "");
    setItemSortOrder("0");
    setItemImage(null);
    setItemImagePreview(null);
    setIsItemDialogOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(item.price.toString());
    setItemDescription(item.description || "");
    setItemCategoryId(item.categoryId.toString());
    setItemSortOrder(item.sortOrder.toString());
    setItemImage(null);
    setItemImagePreview(item.imageUrl ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${item.imageUrl}` : null);
    setIsItemDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setItemImage(file);
      setItemImagePreview(URL.createObjectURL(file));
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemPrice || !itemCategoryId) {
      toast.error("Vui lòng nhập đầy đủ các trường bắt buộc.");
      return;
    }

    setIsSubmittingItem(true);
    try {
      const formData = new FormData();
      formData.append("name", itemName);
      formData.append("price", itemPrice);
      formData.append("description", itemDescription);
      formData.append("categoryId", itemCategoryId);
      formData.append("sortOrder", itemSortOrder);
      if (itemImage) {
        formData.append("image", itemImage);
      }

      if (editingItem) {
        // Edit mode
        const res = await api.patch(`/api/menu/items/${editingItem.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setItems(items.map((i) => (i.id === editingItem.id ? res.data.data : i)));
        toast.success("Cập nhật món ăn thành công!");
      } else {
        // Create mode
        const res = await api.post("/api/menu/items", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setItems([res.data.data, ...items]);
        toast.success("Thêm món ăn mới thành công!");
      }
      setIsItemDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Lỗi thao tác trên món ăn.";
      toast.error(errMsg);
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleToggleItemStatus = async (item: MenuItem) => {
    const newStatus = item.status === "available" ? "unavailable" : "available";
    try {
      const res = await api.patch(`/api/menu/items/${item.id}/toggle`, {
        status: newStatus
      });
      setItems(items.map((i) => (i.id === item.id ? { ...i, status: res.data.data.status } : i)));
      toast.success(`Đã chuyển trạng thái món sang ${newStatus === "available" ? "Đang bán" : "Ngưng bán"}`);
    } catch (error) {
      console.error(error);
      toast.error("Không thể thay đổi trạng thái món ăn.");
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn ngưng bán món ăn này?")) return;

    try {
      await api.delete(`/api/menu/items/${id}`);
      setItems(items.map(i => i.id === id ? { ...i, status: "unavailable" as const } : i));
      toast.success("Đã ẩn món ăn thành công!");
    } catch (error) {
      console.error(error);
      toast.error("Không thể xoá món ăn.");
    }
  };

  // Filters for items
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategoryFilter === "all" || item.categoryId.toString() === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("items")}
          className={`px-5 py-3 text-sm font-semibold transition cursor-pointer ${
            activeTab === "items"
              ? "border-b-2 border-amber-500 text-amber-500"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Danh sách Món ăn ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-5 py-3 text-sm font-semibold transition cursor-pointer ${
            activeTab === "categories"
              ? "border-b-2 border-amber-500 text-amber-500"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Danh mục ({categories.length})
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm text-zinc-400">Đang tải thông tin thực đơn...</p>
          </div>
        </div>
      ) : activeTab === "categories" ? (
        /* CATEGORIES TAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Category Form */}
          <Card className="border-zinc-800 bg-zinc-900 shadow-md h-fit">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Thêm danh mục mới</h3>
              <form onSubmit={handleAddCategory} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">Tên danh mục</label>
                  <Input
                    placeholder="Ví dụ: Món khai vị, Lẩu..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white rounded-xl focus:border-amber-500 transition"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmittingCategory || !newCategoryName.trim()}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl h-10 transition cursor-pointer"
                >
                  {isSubmittingCategory ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1.5" /> Thêm danh mục
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Categories List */}
          <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900 shadow-md">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tất cả danh mục</h3>
              
              {categories.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">Chưa có danh mục nào được tạo.</div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      {editingCategoryId === cat.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-4">
                          <Input
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-white rounded-xl py-1 h-9 flex-1"
                          />
                          <Button
                            size="icon-sm"
                            onClick={() => handleUpdateCategory(cat.id)}
                            className="bg-green-600 hover:bg-green-700 text-white h-9 w-9 rounded-xl cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={handleCancelEditCategory}
                            className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 h-9 w-9 rounded-xl cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">{cat.name}</span>
                            <span className="text-[10px] text-zinc-500">Thứ tự hiển thị: {cat.sortOrder}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon-sm"
                              variant="outline"
                              onClick={() => handleStartEditCategory(cat)}
                              className="border-zinc-800 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 h-8 w-8 rounded-lg cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="border-zinc-850 hover:bg-red-950/20 text-zinc-400 hover:text-red-400 hover:border-red-950/50 h-8 w-8 rounded-lg cursor-pointer"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ITEMS TAB */
        <div className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Tìm tên món, mô tả..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white rounded-xl pl-10 focus:border-amber-500 transition w-full h-10"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 px-3 text-zinc-100 text-sm h-10 w-full sm:w-48 outline-none focus:border-amber-500 transition"
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Add Item Button */}
            <Button
              onClick={handleOpenCreateItem}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl h-10 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Thêm món ăn mới
            </Button>
          </div>

          {/* Items Table */}
          <Card className="border-zinc-800 bg-zinc-900 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <th className="p-4 pl-6">Món ăn</th>
                    <th className="p-4">Danh mục</th>
                    <th className="p-4">Đơn giá</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4">Thứ tự</th>
                    <th className="p-4 pr-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-zinc-500">
                        Không tìm thấy món ăn nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const itemCat = categories.find((c) => c.id === item.categoryId);
                      const isAvailable = item.status === "available";

                      return (
                        <tr key={item.id} className="hover:bg-zinc-850/20 transition-colors">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              {item.imageUrl ? (
                                <img
                                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${item.imageUrl}`}
                                  alt={item.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-zinc-800 bg-zinc-950"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-850 flex items-center justify-center text-zinc-600">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-bold text-white block truncate">{item.name}</span>
                                {item.description && (
                                  <span className="text-xs text-zinc-400 block truncate max-w-[250px]">{item.description}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-zinc-300 font-medium">
                            {itemCat?.name || `ID: ${item.categoryId}`}
                          </td>
                          <td className="p-4 text-zinc-100 font-bold">
                            {Number(item.price).toLocaleString("vi-VN")} đ
                          </td>
                          <td className="p-4">
                            <Badge
                              onClick={() => handleToggleItemStatus(item)}
                              className={`px-2 py-0.5 text-[10px] font-bold border capitalize cursor-pointer select-none transition ${
                                isAvailable
                                  ? "bg-green-500/10 text-green-400 border-green-500/25 hover:bg-green-500/20"
                                  : "bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20"
                              }`}
                            >
                              {isAvailable ? "Đang bán" : "Ngưng bán"}
                            </Badge>
                          </td>
                          <td className="p-4 text-zinc-400 text-xs">
                            {item.sortOrder}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="icon-sm"
                                variant="outline"
                                onClick={() => handleOpenEditItem(item)}
                                className="border-zinc-800 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 h-8 w-8 rounded-lg cursor-pointer"
                                title="Chỉnh sửa món"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="outline"
                                onClick={() => handleDeleteItem(item.id)}
                                className="border-zinc-850 hover:bg-red-950/20 text-zinc-400 hover:text-red-400 hover:border-red-950/50 h-8 w-8 rounded-lg cursor-pointer"
                                title="Ngưng bán / Xoá"
                              >
                                <Trash className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* Add / Edit Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white font-heading">
              {editingItem ? `Chỉnh sửa món: ${editingItem.name}` : "Thêm món ăn mới"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Điền các thông tin của món ăn dưới đây để lưu vào thực đơn.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleItemSubmit} className="space-y-4 pt-2">
            {/* Image Upload Area */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium block">Ảnh món ăn</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                {itemImagePreview ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-zinc-850">
                    <img
                      src={itemImagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                      <span className="text-xs font-bold text-white bg-zinc-900/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <Upload className="w-3 h-3" /> Thay đổi ảnh
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-zinc-500" />
                    <span className="text-xs font-bold text-zinc-400">Nhấp để tải lên hình ảnh</span>
                    <span className="text-[10px] text-zinc-600">Định dạng JPG, PNG, WEBP tối đa 5MB</span>
                  </>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium block">Tên món ăn <span className="text-red-500">*</span></label>
              <Input
                placeholder="Nhập tên món ăn..."
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-white rounded-xl focus:border-amber-500 transition"
                required
              />
            </div>

            {/* Category & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">Danh mục <span className="text-red-500">*</span></label>
                <select
                  value={itemCategoryId}
                  onChange={(e) => setItemCategoryId(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 px-3 text-zinc-100 text-sm h-10 w-full outline-none focus:border-amber-500 transition"
                  required
                >
                  <option value="" disabled>Chọn danh mục</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">Đơn giá (đ) <span className="text-red-500">*</span></label>
                <Input
                  type="number"
                  placeholder="Giá bán..."
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white rounded-xl focus:border-amber-500 transition"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Sort Order */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium block">Thứ tự sắp xếp</label>
              <Input
                type="number"
                placeholder="0"
                value={itemSortOrder}
                onChange={(e) => setItemSortOrder(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-white rounded-xl focus:border-amber-500 transition"
                min="0"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium block">Mô tả chi tiết</label>
              <textarea
                placeholder="Thành phần, hương vị món ăn..."
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl p-3 text-sm focus:border-amber-500 transition outline-none"
              />
            </div>

            {/* Action Buttons */}
            <DialogFooter className="flex sm:justify-between items-center pt-3 border-t border-zinc-800 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsItemDialogOpen(false)}
                className="border-zinc-800 hover:bg-zinc-800 text-xs h-10 w-full sm:w-auto cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingItem}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs h-10 w-full sm:w-auto cursor-pointer"
              >
                {isSubmittingItem ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingItem ? (
                  "Lưu thay đổi"
                ) : (
                  "Tạo món ăn"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
