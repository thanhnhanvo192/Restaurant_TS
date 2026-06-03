"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoveLeft, Home, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 relative overflow-hidden px-4">
      {/* Background radial ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-orange-600/5 blur-[100px] pointer-events-none animate-pulse" />

      <div className="w-full max-w-md relative z-10 text-center space-y-8">
        {/* Floating Compass Icon with 404 badge */}
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-[0_0_30px_rgba(245,158,11,0.05)] mb-6 group">
            <Compass className="w-12 h-12 text-amber-500 transition-colors duration-300" />
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 text-xs font-black px-2.5 py-1 rounded-lg shadow-lg">
              404
            </div>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent font-heading mb-3">
            Không Tìm Thấy Trang
          </h1>
          <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">
            Món ăn tinh thần bạn tìm kiếm dường như không nằm trong menu của chúng tôi. Vui lòng kiểm tra lại đường dẫn.
          </p>
        </div>

        {/* Buttons for redirection */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="w-full sm:w-auto border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold cursor-pointer h-11 px-5"
          >
            <MoveLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          <Link href="/login" className="w-full sm:w-auto">
            <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold shadow-lg hover:shadow-orange-500/10 cursor-pointer h-11 px-5">
              <Home className="w-4 h-4 mr-2" />
              Về trang chủ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
