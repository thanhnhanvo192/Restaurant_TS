"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, getUser, removeToken, DecodedUser } from "@/lib/auth";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  LayoutGrid, 
  ClipboardList, 
  Receipt, 
  LogOut, 
  User,
  UtensilsCrossed,
  Menu,
  X,
  LayoutDashboard,
  Utensils,
  Users,
  Boxes,
  TrendingUp,
  Calendar
} from "lucide-react";
import { toast } from "sonner";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMount, setIsMount] = useState(false);
  const [staffUser, setStaffUser] = useState<DecodedUser | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMount(true);

    if (!isAuthenticated()) {
      toast.error("Vui lòng đăng nhập tài khoản nhân viên.");
      router.push("/staff/login");
      return;
    }

    const user = getUser();
    if (
      user &&
      (user.role === "receptionist" ||
        user.role === "manager" ||
        user.role === "warehouse")
    ) {
      setStaffUser(user);

      // Initialize Socket connection
      const socket = getSocket();
      if (socket) {
        console.log("[Socket] Initialized inside Staff Layout");
      }
    } else {
      toast.error("Bạn không có quyền truy cập khu vực này.");
      router.push("/staff/login");
    }

    return () => {
      // Disconnect socket when staff logs out or leaves staff area
    };
  }, [router]);

  // Listen to real-time events for receptionist
  useEffect(() => {
    if (!staffUser) return;

    const socket = getSocket();
    if (socket && (staffUser.role === "receptionist" || staffUser.role === "manager")) {
      console.log("[Socket] Subscribing to global staff events inside Staff Layout");

      const handleNewReservation = (data: {
        reservationId: number;
        userName: string;
        tableNumber: string;
        date: string;
        time: string;
        guestCount: number;
      }) => {
        console.log("[Socket] Global new reservation event received:", data);

        // Format Date
        const dateObj = new Date(data.date);
        const formattedDate = dateObj.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        // Format Time
        let formattedTime = data.time;
        if (formattedTime.includes("T")) {
          const parts = formattedTime.split("T");
          formattedTime = parts[1].substring(0, 5);
        } else {
          formattedTime = formattedTime.substring(0, 5);
        }

        toast.info(
          <div className="flex flex-col gap-1.5 p-0.5">
            <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              🔔 ĐẶT BÀN MỚI CHỜ XỬ LÝ!
            </span>
            <span className="text-[11px] text-zinc-300">
              Khách hàng: <strong className="text-white">{data.userName || "Khách Vãng Lai"}</strong>
            </span>
            <span className="text-[11px] text-zinc-400">
              Bàn: <strong className="text-white">{data.tableNumber}</strong> • Khách: <strong className="text-white">{data.guestCount}</strong> • {formattedDate} lúc {formattedTime}
            </span>
            <button
              onClick={() => {
                router.push("/receptionist/reservations");
                toast.dismiss();
              }}
              className="mt-1 self-start px-2.5 py-1 text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 rounded-lg cursor-pointer transition-colors shadow-sm animate-pulse"
            >
              Xem danh sách
            </button>
          </div>,
          {
            duration: 8000,
          }
        );
      };

      socket.on("new-reservation", handleNewReservation);

      return () => {
        socket.off("new-reservation", handleNewReservation);
      };
    }
  }, [staffUser, router]);

  const handleLogout = () => {
    removeToken();
    localStorage.removeItem("user");
    disconnectSocket();
    toast.success("Đã đăng xuất tài khoản nhân viên.");
    router.push("/staff/login");
  };

  if (!isMount || !staffUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <p className="text-sm text-zinc-400 font-medium">Đang xác thực quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // Generate dynamic nav items based on role
  const getNavItems = () => {
    const role = staffUser.role;
    if (role === "receptionist") {
      return [
        {
          name: "Sơ đồ bàn",
          href: "/receptionist/tables",
          icon: LayoutGrid,
        },
        {
          name: "Đặt bàn",
          href: "/receptionist/reservations",
          icon: Calendar,
        },
        {
          name: "Orders",
          href: "/receptionist/orders",
          icon: ClipboardList,
        },
        {
          name: "Hoá đơn",
          href: "/receptionist/invoices",
          icon: Receipt,
        },
      ];
    } else if (role === "warehouse") {
      return [
        {
          name: "Kho",
          href: "/warehouse/inventory",
          icon: Boxes,
        },
      ];
    } else if (role === "manager") {
      return [
        {
          name: "Dashboard",
          href: "/manager/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Bàn ăn",
          href: "/manager/tables",
          icon: LayoutGrid,
        },
        {
          name: "Menu",
          href: "/manager/menu",
          icon: Utensils,
        },
        {
          name: "Nhân viên",
          href: "/manager/staff",
          icon: Users,
        },
        {
          name: "Thống kê",
          href: "/manager/statistics",
          icon: TrendingUp,
        },
      ];
    }
    return [];
  };

  const navItems = getNavItems();
  const getRoleDisplayName = (role: string) => {
    if (role === "receptionist") return "Lễ Tân";
    if (role === "warehouse") return "Thủ Kho";
    if (role === "manager") return "Quản Lý";
    return role;
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Premium Desktop Sidebar + Header layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Desktop */}
        <aside className="hidden md:flex md:w-64 md:flex-col bg-zinc-900 border-r border-zinc-800">
          <div className="flex h-16 items-center px-6 border-b border-zinc-800 gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                GOURMET STAFF
              </span>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex-1 space-y-1.5 px-4 py-6">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-amber-500 animate-pulse" : "text-zinc-400"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info at bottom */}
          <div className="p-4 border-t border-zinc-800 space-y-3 bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="flex w-9 h-9 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-amber-500 font-bold text-sm">
                {staffUser.name ? staffUser.name[0].toUpperCase() : "NV"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{staffUser.name || "Nhân viên"}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="secondary" className="px-1.5 py-0 text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 capitalize">
                    {getRoleDisplayName(staffUser.role)}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full border-zinc-800 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/30 text-zinc-400 text-xs font-bold transition-all h-9 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </aside>


        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Navbar for Mobile */}
          <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md px-4 md:px-8">
            <div className="flex items-center gap-3 md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-850 bg-zinc-900 text-zinc-400 cursor-pointer"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-gradient-to-tr from-amber-500 to-orange-500">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-extrabold tracking-wider text-white">GOURMET</span>
              </div>
            </div>

            {/* Title / Info for desktop layout */}
            <div className="hidden md:flex items-center gap-2.5">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                {pathname.includes("tables") && "Sơ đồ bàn ăn"}
                {pathname.includes("reservations") && "Quản lý đặt bàn"}
                {pathname.includes("orders") && "Hệ thống quản lý Orders"}
                {pathname.includes("invoices") && "Hóa đơn & Thanh toán"}
                {pathname.includes("dashboard") && "Dashboard Quản Lý"}
                {pathname.includes("menu") && "Quản lý Thực đơn"}
                {pathname.includes("staff") && "Quản lý Nhân viên"}
                {pathname.includes("inventory") && "Quản lý Kho hàng"}
              </h2>
            </div>

            {/* Right-aligned mobile quick logout button or status */}
            <div className="flex items-center gap-2">
              <div className="md:hidden flex items-center gap-1 bg-zinc-800/40 border border-zinc-800 px-2 py-1 rounded-lg">
                <User className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] font-bold text-zinc-300 max-w-[80px] truncate">
                  {staffUser.name || "Nhân viên"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="md:hidden flex w-8 h-8 items-center justify-center rounded-lg border border-zinc-800 hover:border-red-950 text-zinc-400 hover:text-red-400 bg-zinc-900 cursor-pointer transition-all"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {/* Mobile Navigation Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-b border-zinc-850 bg-zinc-900 animate-fade-in">
              <nav className="flex flex-col space-y-1 p-4">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        isActive
                          ? "bg-amber-500/10 text-amber-500"
                          : "text-zinc-400 hover:bg-zinc-800/40"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Page contents wrapper */}
          <main className="flex-1 p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
