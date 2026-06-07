"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Armchair, HelpCircle, Utensils, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface Table {
  id: number;
  tableNumber: string;
  capacity: number;
  location?: string | null;
  status: "available" | "reserved" | "occupied" | "cleaning";
}

interface TableSession {
  id: number;
  status: "open" | "closed";
}

interface TableLandingClientProps {
  tableId: string;
  table: Table;
  session: TableSession | null;
}

export function TableLandingClient({ tableId, table, session }: TableLandingClientProps) {
  const router = useRouter();
  const [isMount, setIsMount] = useState(false);
  const [storedSessionId, setStoredSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsMount(true);
    if (typeof window !== "undefined") {
      setStoredSessionId(sessionStorage.getItem("sessionId"));
    }
  }, []);

  const handleJoinTable = async () => {
    setIsSubmitting(true);
    try {
      const response = await api.post(`/api/tables/${tableId}/session`, {});
      if (response.data && response.data.success) {
        const sessionData = response.data.data;
        
        // Save session details to sessionStorage
        sessionStorage.setItem("sessionId", String(sessionData.id));
        sessionStorage.setItem("tableId", String(tableId));
        sessionStorage.setItem("tableNumber", table.tableNumber);

        toast.success(`Đã ngồi vào bàn ${table.tableNumber} thành công!`);
        router.push(`/table/${tableId}/menu`);
      } else {
        toast.error(response.data.error || "Không thể ngồi vào bàn");
      }
    } catch (error: any) {
      console.error("Check-in session error:", error);
      const errMsg = error.response?.data?.error || "Đã xảy ra lỗi khi check-in.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToMenu = () => {
    router.push(`/table/${tableId}/menu`);
  };

  if (!isMount) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-100">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Check if current user owns the active session of this table
  const hasActiveSession = session && storedSessionId === String(session.id);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 text-zinc-100 selection:bg-amber-500 selection:text-zinc-950">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-500/10 blur-[100px]" />
      <div className="absolute bottom-1/4 left-1/3 -z-10 h-72 w-72 rounded-full bg-orange-500/5 blur-[120px]" />

      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Glow Top Line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        <CardHeader className="flex flex-col items-center pb-2 text-center mt-4">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-950 border border-zinc-700 shadow-inner mb-3">
            <Armchair className="w-10 h-10 text-amber-500" />
            <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-zinc-950 animate-pulse">
              {table.capacity}
            </div>
          </div>
          <CardTitle className="text-4xl font-extrabold tracking-tight text-white font-heading">
            BÀN {table.tableNumber}
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm mt-1">
            {table.location ? `Khu vực: ${table.location}` : "Khu vực sảnh chính"} • Sức chứa: {table.capacity} khách
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center py-6">
          {table.status === "available" && (
            <div className="text-center space-y-3">
              <Badge variant="outline" className="bg-emerald-950/20 text-emerald-400 border-emerald-500/30 px-3 py-1 text-xs">
                <CheckCircle className="w-3 h-3 mr-1 inline-block" /> Bàn Trống (Sẵn sàng)
              </Badge>
              <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
                Chào mừng quý khách! Bàn này hiện đang trống. Quý khách có thể tự check-in và bắt đầu gọi món.
              </p>
            </div>
          )}

          {table.status === "occupied" && (
            <div className="text-center space-y-3">
              <Badge variant="outline" className="bg-amber-950/20 text-amber-400 border-amber-500/30 px-3 py-1 text-xs">
                <Utensils className="w-3 h-3 mr-1 inline-block" /> Bàn Đang Có Khách
              </Badge>
              <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
                {hasActiveSession 
                  ? "Bạn hiện đang sử dụng bàn này. Bạn có thể tiếp tục xem thực đơn và gọi thêm món." 
                  : "Bàn này đang được sử dụng bởi khách hàng khác. Quý khách vui lòng chọn bàn khác hoặc liên hệ nhân viên."}
              </p>
            </div>
          )}

          {table.status === "reserved" && (
            <div className="text-center space-y-3">
              <Badge variant="outline" className="bg-blue-950/20 text-blue-400 border-blue-500/30 px-3 py-1 text-xs">
                <Clock className="w-3 h-3 mr-1 inline-block" /> Bàn Đã Được Đặt Trước
              </Badge>
              <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
                Bàn đã được đặt trước cho khung giờ này. Quý khách vui lòng liên hệ lễ tân để kiểm tra thông tin check-in.
              </p>
            </div>
          )}

          {table.status === "cleaning" && (
            <div className="text-center space-y-3">
              <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700 px-3 py-1 text-xs">
                <Loader2 className="w-3 h-3 mr-1 inline-block animate-spin" /> Bàn Đang Dọn Dẹp
              </Badge>
              <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
                Nhân viên đang dọn dẹp và chuẩn bị bàn. Bàn sẽ sẵn sàng phục vụ trong vài phút nữa.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pb-8 px-6">
          {table.status === "available" && (
            <Button
              onClick={handleJoinTable}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold py-5 rounded-xl shadow-lg shadow-amber-500/10 border-0 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang ghi nhận...
                </>
              ) : (
                <>
                  Ngồi vào bàn {table.tableNumber}
                </>
              )}
            </Button>
          )}

          {table.status === "occupied" && hasActiveSession && (
            <Button
              onClick={handleGoToMenu}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold py-5 rounded-xl shadow-lg border-0 cursor-pointer transition-all duration-200"
            >
              Xem thực đơn & Order thêm
            </Button>
          )}

          {table.status === "occupied" && !hasActiveSession && (
            <Button
              disabled
              className="w-full bg-zinc-800 text-zinc-500 border border-zinc-700 py-5 rounded-xl cursor-not-allowed"
            >
              Bàn đang bận
            </Button>
          )}

          {(table.status === "reserved" || table.status === "cleaning") && (
            <Button
              disabled
              className="w-full bg-zinc-800 text-zinc-500 border border-zinc-700 py-5 rounded-xl cursor-not-allowed"
            >
              Không thể sử dụng bàn
            </Button>
          )}

          <Link
            href={`/customer/login?redirect=/table/${tableId}`}
            className="text-xs text-zinc-500 hover:text-amber-500 transition-colors mt-3 underline underline-offset-4"
          >
            Đăng nhập tài khoản khách hàng
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
