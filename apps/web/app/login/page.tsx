"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Utensils, Loader2, UtensilsCrossed, Users } from "lucide-react";
import { getUser, isAuthenticated } from "@/lib/auth";

export default function LoginPortalPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If already authenticated, redirect to their role home page
    if (isAuthenticated()) {
      const user = getUser();
      if (user) {
        switch (user.role) {
          case "manager":
            router.push("/manager/dashboard");
            break;
          case "receptionist":
            router.push("/receptionist/tables");
            break;
          case "warehouse":
            router.push("/warehouse/inventory");
            break;
          case "customer":
            router.push("/customer/reservations");
            break;
          default:
            setIsLoading(false);
            break;
        }
        return;
      }
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <p className="text-sm text-zinc-400 font-medium">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 relative overflow-hidden px-4">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10 space-y-8">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 shadow-[0_0_25px_rgba(245,158,11,0.3)] mb-2">
            <UtensilsCrossed className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent font-heading">
            Gourmet Restaurant
          </h1>
          <p className="text-sm text-zinc-400 max-w-md">
            Hệ thống quản lý và phục vụ khách hàng cao cấp. Vui lòng chọn cổng đăng nhập phù hợp với bạn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Portal Card */}
          <Link href="/customer/login" className="group block">
            <Card className="h-full border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 backdrop-blur-xl hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.08)] transition-all duration-300 relative overflow-hidden cursor-pointer">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-300">
                  <Utensils className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                  Khách Hàng
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Dành cho thực khách đăng nhập để đặt bàn, gọi món và xem lịch sử đặt hàng.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 text-xs text-amber-500 font-bold flex items-center gap-1 group-hover:translate-x-1.5 transition-transform duration-300">
                Đến trang đăng nhập &rarr;
              </CardContent>
            </Card>
          </Link>

          {/* Staff Portal Card */}
          <Link href="/staff/login" className="group block">
            <Card className="h-full border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 backdrop-blur-xl hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.08)] transition-all duration-300 relative overflow-hidden cursor-pointer">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-2 group-hover:scale-110 group-hover:bg-orange-500/20 transition-all duration-300">
                  <Users className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-bold text-zinc-100 group-hover:text-orange-400 transition-colors">
                  Nhân Viên
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Dành cho Ban Quản lý, Nhân viên Lễ tân và Thủ kho thực hiện nghiệp vụ vận hành nhà hàng.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 text-xs text-orange-500 font-bold flex items-center gap-1 group-hover:translate-x-1.5 transition-transform duration-300">
                Đến trang đăng nhập &rarr;
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
