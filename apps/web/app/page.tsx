"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAuthenticated, getUser, removeToken } from "@/lib/auth";
import { disconnectSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Utensils,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Star,
  Award,
  Sparkles,
  ChevronRight,
  LogOut,
  User,
  Coffee,
  Heart,
  Loader2,
  Menu as MenuIcon,
  X,
  Compass,
  Smile
} from "lucide-react";
import { toast } from "sonner";

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  status: string;
  sortOrder: number;
}

interface MenuCategory {
  id: number;
  name: string;
  sortOrder: number;
  menuItems: MenuItem[];
}

export default function RestaurantAboutPage() {
  const router = useRouter();
  
  // Menu states
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  // User auth states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
    const user = getUser();
    if (user) {
      setUserName(user.name || user.email || "Khách Hàng");
    }
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    setIsLoadingMenu(true);
    try {
      const res = await api.get("/api/menu");
      if (res.data && res.data.success) {
        const data = res.data.data || [];
        setCategories(data);
        if (data.length > 0) {
          setActiveCategoryId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Fetch menu error:", err);
      toast.error("Không thể tải thực đơn nhà hàng.");
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const handleBookTable = () => {
    if (isAuthenticated()) {
      router.push("/customer/reservations");
    } else {
      toast.info("Vui lòng đăng nhập để tiến hành đặt bàn.");
      router.push("/customer/login?redirect=/customer/reservations");
    }
  };

  const handleLogout = () => {
    removeToken();
    disconnectSocket();
    setIsLoggedIn(false);
    setUserName("");
    toast.success("Đăng xuất thành công.");
  };

  // Get active category's items
  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const activeItems = activeCategory ? activeCategory.menuItems : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-zinc-950 font-sans antialiased">
      {/* 1. Header/Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-9 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Utensils className="size-5 text-zinc-950" />
          </div>
          <span className="text-lg font-bold tracking-wider text-white font-heading uppercase">
            Gourmet Restaurant
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <a href="#about" className="hover:text-amber-500 transition-colors">Giới thiệu</a>
          <a href="#menu" className="hover:text-amber-500 transition-colors">Thực đơn</a>
          <a href="#features" className="hover:text-amber-500 transition-colors">Dịch vụ</a>
          <a href="#contact" className="hover:text-amber-500 transition-colors">Liên hệ</a>
        </nav>

        {/* Desktop Auth and Action */}
        <div className="hidden md:flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/customer/reservations")}
                className="flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:text-white transition-all cursor-pointer"
              >
                <User className="size-3.5 text-amber-500" />
                <span className="max-w-[100px] truncate font-semibold">{userName}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-900 hover:border-red-900/30 text-zinc-450 hover:text-red-400 bg-zinc-900/40 hover:bg-red-950/10 cursor-pointer transition-all"
                title="Đăng xuất"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                onClick={() => router.push("/customer/login")}
                className="text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-semibold px-4 h-9 cursor-pointer"
              >
                Đăng nhập
              </Button>
              <Button
                onClick={() => router.push("/customer/register")}
                className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-100 text-xs font-semibold px-4 h-9 cursor-pointer"
              >
                Đăng ký
              </Button>
            </div>
          )}
          <Button
            onClick={handleBookTable}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold text-xs px-5 h-9 rounded-lg shadow-lg shadow-amber-500/5 border-0 cursor-pointer"
          >
            <Calendar className="size-3.5 mr-1.5" /> Đặt bàn
          </Button>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 bg-zinc-900/40 cursor-pointer hover:bg-zinc-900"
        >
          {isMobileMenuOpen ? <X className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </header>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden sticky top-[69px] z-40 w-full bg-zinc-950/95 border-b border-zinc-900 px-6 py-5 flex flex-col gap-5 animate-fade-in backdrop-blur-md">
          <nav className="flex flex-col gap-4 text-sm font-medium text-zinc-400">
            <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-amber-500 transition-colors">Giới thiệu</a>
            <a href="#menu" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-amber-500 transition-colors">Thực đơn</a>
            <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-amber-500 transition-colors">Dịch vụ</a>
            <a href="#contact" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-amber-500 transition-colors">Liên hệ</a>
          </nav>

          <div className="border-t border-zinc-900 pt-4 flex flex-col gap-3">
            {isLoggedIn ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <User className="size-4 text-amber-500" />
                  <span className="font-semibold">{userName}</span>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 cursor-pointer bg-red-950/10 border border-red-900/30 px-3 py-1.5 rounded-lg"
                >
                  <LogOut className="size-3.5" /> Đăng xuất
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push("/customer/login");
                    setIsMobileMenuOpen(false);
                  }}
                  className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs h-9 cursor-pointer"
                >
                  Đăng nhập
                </Button>
                <Button
                  onClick={() => {
                    router.push("/customer/register");
                    setIsMobileMenuOpen(false);
                  }}
                  className="bg-zinc-900 text-white text-xs h-9 cursor-pointer border border-zinc-800"
                >
                  Đăng ký
                </Button>
              </div>
            )}
            <Button
              onClick={() => {
                handleBookTable();
                setIsMobileMenuOpen(false);
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold text-xs h-10 rounded-lg cursor-pointer border-0"
            >
              <Calendar className="size-4 mr-1.5" /> Đặt bàn ngay
            </Button>
          </div>
        </div>
      )}

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 md:pt-28 md:pb-36 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 border-b border-zinc-900">
        {/* Subtle decorative background circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-550/10 border border-amber-500/20 rounded-full text-amber-400 text-[10px] font-bold tracking-widest uppercase">
            <Sparkles className="size-3.5 text-amber-500" />
            Trải nghiệm ẩm thực thượng hạng
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight font-heading">
            TINH HOA ẨM THỰC <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              GOURMET
            </span>
          </h1>
          
          <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Thưởng thức thực đơn tinh tế được lấy cảm hứng từ tinh hoa ẩm thực truyền thống 
            kết hợp với phong cách chế biến hiện đại. Không gian sang trọng, dịch vụ tận tâm 
            chờ đón quý khách.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Button
              onClick={handleBookTable}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-extrabold text-sm px-8 py-6 rounded-xl shadow-xl shadow-amber-500/10 border-0 cursor-pointer flex items-center justify-center gap-2"
            >
              Đặt bàn ngay <ChevronRight className="size-4" />
            </Button>
            <a href="#menu" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-semibold text-sm px-8 py-6 rounded-xl cursor-pointer"
              >
                Xem thực đơn
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* 3. About Section */}
      <section id="about" className="py-24 px-6 max-w-5xl mx-auto space-y-16">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase">Về chúng tôi</h2>
          <h3 className="text-2xl md:text-3xl font-bold text-white font-heading">CÂU CHUYỆN GOURMET</h3>
          <div className="w-12 h-1 bg-amber-500 mx-auto rounded mt-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-white leading-snug">
              Kiến tạo những khoảnh khắc ẩm thực khó quên
            </h4>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Thành lập từ năm 2020, Gourmet Restaurant tự hào là điểm đến lý tưởng cho những ai 
              yêu mến ẩm thực thượng hạng. Chúng tôi tin rằng mỗi bữa ăn không chỉ đơn thuần là việc 
              thưởng thức hương vị, mà là một hành trình cảm xúc trọn vẹn kết hợp giữa vị giác, 
              thính giác và thị giác.
            </p>
            <p className="text-zinc-450 text-sm leading-relaxed">
              Tất cả các nguyên liệu tại nhà hàng đều được tuyển chọn kỹ lưỡng mỗi ngày từ những nguồn 
              cung cấp hữu cơ uy tín nhất, đảm bảo độ tươi ngon nguyên bản và an toàn tuyệt đối 
              cho sức khỏe của quý khách.
            </p>

            <div className="grid grid-cols-3 gap-4 pt-4 text-center">
              <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                <span className="text-xl font-extrabold text-amber-500 block">50+</span>
                <span className="text-[10px] text-zinc-550 uppercase font-semibold">Món ăn</span>
              </div>
              <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                <span className="text-xl font-extrabold text-amber-500 block">10+</span>
                <span className="text-[10px] text-zinc-550 uppercase font-semibold">Đầu bếp</span>
              </div>
              <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                <span className="text-xl font-extrabold text-amber-500 block">15K+</span>
                <span className="text-[10px] text-zinc-550 uppercase font-semibold">Khách hàng</span>
              </div>
            </div>
          </div>

          {/* Elegant features list card layout */}
          <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-850 p-6 rounded-2xl space-y-6">
            <div className="flex gap-4">
              <div className="size-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Award className="size-5 text-amber-500" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-white">Chất lượng hảo hạng</h5>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Nguyên liệu nhập khẩu cao cấp cùng quy trình chế biến chuẩn 5 sao bảo đảm chất lượng 
                  đồng đều trên từng món ăn.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="size-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="size-5 text-amber-500" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-white">Thời gian phục vụ</h5>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Mở cửa từ 09:00 - 22:00 tất cả các ngày trong tuần (bao gồm cả ngày Lễ & Tết).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="size-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                <MapPin className="size-5 text-amber-500" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-white">Vị trí đắc địa</h5>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Tọa lạc tại trung tâm thành phố với bãi đỗ xe ô tô rộng rãi, không gian lãng mạn 
                  có tầm nhìn hướng ra phố biển.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Menu Section */}
      <section id="menu" className="py-24 bg-zinc-900/20 border-y border-zinc-900 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase">Thực đơn</h2>
            <h3 className="text-2xl md:text-3xl font-bold text-white font-heading">MÓN NGON ĐANG PHỤC VỤ</h3>
            <div className="w-12 h-1 bg-amber-500 mx-auto rounded mt-2" />
          </div>

          {isLoadingMenu ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="size-8 animate-spin text-amber-500" />
              <p className="text-xs text-zinc-500">Đang tải danh sách món ăn từ nhà bếp...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10 text-zinc-500">
              <Utensils className="size-8 mx-auto opacity-30 text-amber-500 mb-2" />
              <p className="text-xs">Hiện tại thực đơn đang được cập nhật. Vui lòng quay lại sau.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Category Tab Buttons */}
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategoryId(category.id)}
                    className={`px-4 py-2 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                      activeCategoryId === category.id
                        ? "bg-amber-500 border-amber-500 text-zinc-950 font-extrabold shadow-md shadow-amber-500/5"
                        : "bg-zinc-950/40 border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-700"
                    }`}
                  >
                    {category.name} ({category.menuItems?.length || 0})
                  </button>
                ))}
              </div>

              {/* Menu Items Grid */}
              {activeItems.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs bg-zinc-900/10 border border-zinc-850 rounded-xl">
                  Danh mục này hiện chưa có món ăn khả dụng.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeItems.map((item) => (
                    <Card
                      key={item.id}
                      className="group overflow-hidden border-zinc-900 hover:border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/30 transition-all duration-300 rounded-xl relative flex flex-col h-full"
                    >
                      {/* Image / Icon container */}
                      <div className="overflow-hidden relative group">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-48 bg-zinc-900/60 flex flex-col items-center justify-center text-zinc-600 transition-colors">
                            <Utensils className="size-10 text-amber-500/20 mb-2" />
                            <span className="text-[10px] text-zinc-500 italic">Gourmet Taste</span>
                          </div>
                        )}
                        {/* Price Badge over image */}
                        <div className="absolute bottom-3 right-3 bg-zinc-950/80 backdrop-blur-md text-amber-400 font-extrabold text-[11px] px-2.5 py-1 rounded-lg border border-zinc-850">
                          {Number(item.price).toLocaleString("vi-VN")} đ
                        </div>
                      </div>

                      {/* Content */}
                      <CardContent className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                            {item.name}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-zinc-450 leading-relaxed line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="pt-3 border-t border-zinc-900/40 flex items-center justify-between mt-auto">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-500/70 uppercase">
                            <Sparkles className="size-3" /> Chuẩn Gourmet
                          </span>
                          <span className="text-[10px] text-green-400 bg-green-500/5 px-2 py-0.5 rounded border border-green-500/10 font-semibold">
                            Đang phục vụ
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 5. Features Section */}
      <section id="features" className="py-24 px-6 max-w-5xl mx-auto space-y-16">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase">Tiện ích</h2>
          <h3 className="text-2xl md:text-3xl font-bold text-white font-heading">DỊCH VỤ ĐẶC BIỆT</h3>
          <div className="w-12 h-1 bg-amber-500 mx-auto rounded mt-2" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-zinc-900/30 border border-zinc-850 rounded-2xl space-y-4 hover:border-zinc-800 transition-colors">
            <div className="size-10 bg-amber-550/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
              <Calendar className="size-5 text-amber-500" />
            </div>
            <h4 className="text-sm font-bold text-white">Đặt bàn nhanh chóng</h4>
            <p className="text-xs text-zinc-450 leading-relaxed">
              Hệ thống đặt bàn trực tuyến thông minh giúp bạn giữ chỗ chỉ trong vài thao tác, nhận xác nhận tức thời.
            </p>
          </div>

          <div className="p-6 bg-zinc-900/30 border border-zinc-850 rounded-2xl space-y-4 hover:border-zinc-800 transition-colors">
            <div className="size-10 bg-amber-550/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
              <Compass className="size-5 text-amber-500" />
            </div>
            <h4 className="text-sm font-bold text-white">Vị trí tùy chọn</h4>
            <p className="text-xs text-zinc-450 leading-relaxed">
              Bạn có thể dễ dàng yêu cầu chọn vị trí như bàn gần cửa sổ, không gian ngoài trời, hay phòng riêng ấm cúng.
            </p>
          </div>

          <div className="p-6 bg-zinc-900/30 border border-zinc-850 rounded-2xl space-y-4 hover:border-zinc-800 transition-colors col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="size-10 bg-amber-550/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
              <Smile className="size-5 text-amber-500" />
            </div>
            <h4 className="text-sm font-bold text-white">Phục vụ chu đáo</h4>
            <p className="text-xs text-zinc-450 leading-relaxed">
              Đội ngũ nhân viên chuyên nghiệp, tận tâm, được đào tạo theo tiêu chuẩn dịch vụ cao cấp nhất của ngành ẩm thực.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Footer Section */}
      <footer id="contact" className="mt-auto border-t border-zinc-900 bg-zinc-950 py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-xs">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-7 bg-amber-500 rounded flex items-center justify-center">
                <Utensils className="size-4 text-zinc-950" />
              </div>
              <span className="text-sm font-extrabold text-white tracking-widest uppercase">
                GOURMET
              </span>
            </div>
            <p className="text-zinc-500 leading-relaxed">
              Mỗi món ăn là một tác phẩm nghệ thuật, mang lại cho bạn những trải nghiệm cảm xúc độc đáo nhất.
            </p>
            <div className="text-zinc-600">
              © {new Date().getFullYear()} Gourmet Restaurant. All rights reserved.
            </div>
          </div>

          {/* Col 2: Business Hours */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Giờ mở cửa</h4>
            <div className="w-6 h-0.5 bg-amber-500 rounded" />
            <ul className="space-y-2 text-zinc-450">
              <li className="flex justify-between">
                <span>Thứ 2 - Thứ 6:</span>
                <span className="text-white font-semibold">09:00 - 22:00</span>
              </li>
              <li className="flex justify-between">
                <span>Thứ Bảy & CN:</span>
                <span className="text-white font-semibold">09:00 - 23:00</span>
              </li>
              <li className="flex justify-between">
                <span>Lễ & Tết:</span>
                <span className="text-amber-500 font-bold">Mở cửa bình thường</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact & Address */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Thông tin liên hệ</h4>
            <div className="w-6 h-0.5 bg-amber-500 rounded" />
            <ul className="space-y-2.5 text-zinc-450">
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-amber-500 shrink-0" />
                <span>123 Đường Hải Phòng, Hải Châu, Đà Nẵng</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-amber-500 shrink-0" />
                <span className="text-white font-semibold">0905 123 456</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="size-4 text-amber-500 shrink-0" />
                <span>Hỗ trợ đặt tiệc & sự kiện lớn qua hotline</span>
              </li>
            </ul>
          </div>

        </div>
      </footer>
    </div>
  );
}
