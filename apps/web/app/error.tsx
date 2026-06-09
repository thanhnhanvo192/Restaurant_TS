"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled runtime error captured by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 relative overflow-hidden px-4">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-red-500/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 text-center space-y-8">
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-[0_0_30px_rgba(239,68,68,0.05)] mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 font-heading mb-3">
            Đã Xảy Ra Sự Cố
          </h1>
          <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">
            Hệ thống gặp phải lỗi không mong muốn trong lúc xử lý yêu cầu của bạn.
          </p>

          {error.digest && (
            <div className="mt-4 p-2 bg-zinc-900/50 border border-zinc-800 rounded-lg max-w-full">
              <p className="text-[10px] font-mono text-zinc-500 truncate">
                Mã lỗi (Digest): {error.digest}
              </p>
            </div>
          )}
        </div>

        {/* Buttons for retry / redirection */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold shadow-lg hover:shadow-red-500/10 cursor-pointer h-11 px-5"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Thử lại
          </Button>

          <Link href="/login" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold cursor-pointer h-11 px-5"
            >
              <Home className="w-4 h-4 mr-2" />
              Về trang chủ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
