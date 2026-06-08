"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface MenuItem {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  status: "available" | "unavailable";
}

interface MenuCategory {
  id: number;
  name: string;
  sortOrder: number;
  menuItems?: MenuItem[];
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  note: string;
}

interface PageProps {
  params: Promise<{ tableId: string }>;
}

export default function MenuPage({ params }: PageProps) {
  const { tableId } = use(params);
  const router = useRouter();

  const [isMount, setIsMount] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [tableNumber, setTableNumber] = useState<string>("");
  
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Load session storage and menu data
  useEffect(() => {
    setIsMount(true);
    
    const storedSession = sessionStorage.getItem("sessionId");
    const storedTableNum = sessionStorage.getItem("tableNumber") || "";
    
    if (storedSession) {
      setSessionId(Number(storedSession));
    }
    setTableNumber(storedTableNum);

    const fetchMenu = async () => {
      try {
        const response = await api.get("/api/menu");
        if (response.data && response.data.success) {
          const menuData: MenuCategory[] = response.data.data;
          setCategories(menuData);
          if (menuData.length > 0) {
            setSelectedCategoryId(menuData[0].id);
          }
        } else {
          toast.error("Không thể tải thực đơn.");
        }
      } catch (error) {
        console.error("Fetch menu error:", error);
        toast.error("Lỗi kết nối máy chủ khi lấy thực đơn.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, []);

  if (!isMount) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // If no session exists, prompt the user to scan the QR again
  if (!sessionId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-950/40 border border-amber-900/50 text-amber-500">
            <Info className="h-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-white mb-2">
            Yêu Cầu Check-in
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Quý khách chưa đăng ký ngồi vào bàn. Vui lòng check-in để mở phiên gọi món của bàn này.
          </p>
          <Button
            onClick={() => router.push(`/table/${tableId}`)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold"
          >
            Đến Trang Check-in
          </Button>
        </div>
      </div>
    );
  }

  // Get items in the selected category
  const activeCategory = categories.find((cat) => cat.id === selectedCategoryId);
  const activeMenuItems = activeCategory?.menuItems || [];

  // Cart operations
  const addToCart = (item: MenuItem) => {
    const priceNum = typeof item.price === "string" ? parseFloat(item.price) : item.price;
    setCart((prev) => {
      const existing = prev.find((cartItem) => cartItem.id === item.id);
      if (existing) {
        return prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: priceNum,
          imageUrl: item.imageUrl,
          quantity: 1,
          note: "",
        },
      ];
    });
    toast.success(`Đã thêm ${item.name} vào giỏ`);
  };

  const updateQuantity = (itemId: number, change: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + change;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const updateItemNote = (itemId: number, note: string) => {
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, note } : item))
    );
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Calculate totals
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  // Submit order
  const handleSendOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmittingOrder(true);
    
    const payload = {
      sessionId: sessionId,
      items: cart.map((item) => ({
        menuItemId: item.id,
        quantity: item.quantity,
        note: item.note || undefined,
      })),
    };

    try {
      const response = await api.post("/api/orders", payload);
      if (response.data && response.data.success) {
        toast.success("Order đã gửi, chờ xác nhận!");
        setCart([]); // Clear cart
        setIsCartOpen(false); // Close drawer
      } else {
        toast.error(response.data.error || "Gửi order thất bại.");
      }
    } catch (error: any) {
      console.error("Send order error:", error);
      const errMsg = error.response?.data?.error || "Không thể gửi order. Vui lòng liên hệ phục vụ.";
      toast.error(errMsg);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-zinc-950">
            <UtensilsCrossed className="size-4 font-bold" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Gourmet Menu</h1>
            <p className="text-[10px] text-zinc-400">Trải nghiệm ẩm thực cao cấp</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tableNumber && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs py-0.5 px-2">
              Bàn {tableNumber}
            </Badge>
          )}
        </div>
      </header>

      {/* Hero promo area */}
      <div className="p-4 bg-gradient-to-b from-zinc-900/50 to-transparent">
        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 overflow-hidden flex items-center gap-4">
          <div className="absolute top-0 right-0 p-3 text-amber-500/20">
            <Sparkles className="size-16" />
          </div>
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] font-bold tracking-wider text-amber-500 uppercase">Khuyến Mãi Hôm Nay</span>
            <h3 className="text-sm font-bold text-white">Combo Thượng Hạng</h3>
            <p className="text-xs text-zinc-400">Giảm giá 10% khi đặt trước qua QR.</p>
          </div>
        </div>
      </div>

      {/* Category Horizontal scroll tabs */}
      <div className="sticky top-[53px] z-30 bg-zinc-950/95 backdrop-blur-sm border-y border-zinc-900 py-3 overflow-x-auto scrollbar-none flex gap-2 px-4">
        {isLoading ? (
          <div className="flex gap-2 w-full animate-pulse">
            <div className="h-8 w-20 bg-zinc-800 rounded-full" />
            <div className="h-8 w-24 bg-zinc-800 rounded-full" />
            <div className="h-8 w-16 bg-zinc-800 rounded-full" />
          </div>
        ) : (
          categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                selectedCategoryId === category.id
                  ? "bg-amber-500 text-zinc-950 shadow-md"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {category.name}
            </button>
          ))
        )}
      </div>

      {/* Menu items listing */}
      <main className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 bg-zinc-900/40 rounded-xl border border-zinc-900 animate-pulse" />
            ))}
          </div>
        ) : activeMenuItems.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            <UtensilsCrossed className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Hiện chưa có món ăn khả dụng trong danh mục này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeMenuItems.map((item) => {
              const priceNum = typeof item.price === "string" ? parseFloat(item.price) : item.price;
              const cartQuantity = cart.find((cartItem) => cartItem.id === item.id)?.quantity || 0;
              
              return (
                <Card
                  key={item.id}
                  className="border-zinc-900 bg-zinc-900/20 hover:bg-zinc-900/40 transition-all duration-200 rounded-xl overflow-hidden flex"
                >
                  <div className="relative w-24 h-24 shrink-0 bg-zinc-950 flex items-center justify-center overflow-hidden border-r border-zinc-900">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl.startsWith("http") ? item.imageUrl : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}${item.imageUrl}`}
                        alt={item.name}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-zinc-700">
                        <UtensilsCrossed className="size-6 opacity-30" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 flex-1 flex flex-col justify-between min-w-0">
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {item.description || "Hương vị ẩm thực truyền thống Gourmet phong cách Châu Âu."}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-900/50">
                      <span className="text-xs font-extrabold text-amber-500">
                        {formatPrice(priceNum)}
                      </span>
                      
                      {cartQuantity > 0 ? (
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg h-7 overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="px-2 text-zinc-400 hover:text-white"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="px-1 text-[11px] font-bold text-white min-w-[1.25rem] text-center">
                            {cartQuantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="px-2 text-zinc-400 hover:text-white"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => addToCart(item)}
                          size="icon-xs"
                          className="bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-lg cursor-pointer h-7 w-7"
                        >
                          <Plus className="size-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart bottom bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-40">
          <div className="max-w-md mx-auto rounded-2xl bg-zinc-900/90 border border-amber-500/20 backdrop-blur-lg px-4 py-3 flex items-center justify-between shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-zinc-950">
                <ShoppingBag className="size-5" />
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-zinc-950 border border-zinc-900">
                  {totalItems}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400">Giỏ hàng</p>
                <p className="text-sm font-bold text-white">{formatPrice(totalPrice)}</p>
              </div>
            </div>
            <Button
              onClick={() => setIsCartOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold px-4 rounded-xl cursor-pointer"
            >
              Xem giỏ hàng
            </Button>
          </div>
        </div>
      )}

      {/* Cart details modal sheet */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-zinc-800 bg-zinc-900 text-zinc-100 p-5 rounded-2xl w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ShoppingBag className="size-5 text-amber-500" />
              Chi Tiết Giỏ Hàng
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Kiểm tra các món ăn đã chọn và thêm ghi chú riêng cho từng món.
            </DialogDescription>
          </DialogHeader>

          <Separator className="bg-zinc-800 my-1" />

          {/* Cart items list */}
          <div className="space-y-4 my-2 max-h-[40vh] overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.id} className="space-y-2 border-b border-zinc-800 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{item.name}</p>
                    <p className="text-xs text-amber-500 font-semibold">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                  <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg h-8 overflow-hidden shrink-0">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="px-2.5 text-zinc-400 hover:text-white"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="px-1 text-xs font-bold text-white min-w-[1.5rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="px-2.5 text-zinc-400 hover:text-white"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
                {/* Note inputs */}
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Ghi chú (ví dụ: Ít cay, ít ngọt...)"
                    value={item.note}
                    onChange={(e) => updateItemNote(item.id, e.target.value)}
                    className="bg-zinc-950/40 border-zinc-800 text-xs placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/10 h-7 py-1 px-2.5 rounded-lg"
                  />
                  <Button
                    onClick={() => removeFromCart(item.id)}
                    variant="ghost"
                    size="icon-xs"
                    className="text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-900/30 rounded-lg"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-2 bg-zinc-950/30 p-3 rounded-xl border border-zinc-800/50">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Tổng số lượng:</span>
              <span className="font-bold text-white">{totalItems} món</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">Tổng cộng thanh toán:</span>
              <span className="font-extrabold text-amber-500 text-base">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 mt-4">
            <Button
              onClick={handleSendOrder}
              disabled={isSubmittingOrder}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold py-5 rounded-xl cursor-pointer shadow-lg border-0 flex items-center justify-center gap-2"
            >
              {isSubmittingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang gửi order...
                </>
              ) : (
                "Gửi order"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCartOpen(false)}
              className="w-full border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl py-5"
            >
              Tiếp tục chọn món
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
