"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function VNPayReturnContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    if (params) {
      // Redirect trực tiếp browser sang API backend để verify chữ ký và cập nhật DB.
      // Sau đó backend sẽ redirect về /payment/success hoặc /payment/failed trên frontend.
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      window.location.href = `${apiUrl}/api/payments/vnpay/return?${params}`;
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center border border-slate-100 dark:border-slate-700">
        <Loader2 className="h-16 w-16 text-emerald-500 animate-spin mb-6" />
        <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100 font-sans">
          Đang xác thực giao dịch
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Hệ thống đang kiểm tra kết quả thanh toán từ VNPay. Vui lòng giữ kết nối và không đóng trình duyệt.
        </p>
      </div>
    </div>
  );
}

export default function VNPayReturnPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center border border-slate-100 dark:border-slate-700">
          <Loader2 className="h-16 w-16 text-emerald-500 animate-spin mb-6" />
          <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100 font-sans">
            Đang tải dữ liệu...
          </h1>
        </div>
      </div>
    }>
      <VNPayReturnContent />
    </Suspense>
  );
}
