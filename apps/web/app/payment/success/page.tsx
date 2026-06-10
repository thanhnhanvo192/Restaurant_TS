"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Home, Receipt } from "lucide-react";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invoiceId = searchParams.get("invoiceId") || "";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mb-6 text-emerald-500 animate-bounce">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100 font-sans">
          Thanh Toán Thành Công!
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Hóa đơn của bạn đã được thanh toán thành công thông qua cổng VNPay. Cảm ơn quý khách đã dùng bữa tại nhà hàng!
        </p>

        {invoiceId && (
          <div className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 mb-8 flex items-center justify-between text-sm">
            <span className="text-slate-400 font-medium">Mã hóa đơn:</span>
            <span className="text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-500" /> #{invoiceId}
            </span>
          </div>
        )}

        <button
          onClick={() => router.push("/")}
          className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-medium rounded-xl transition duration-200 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4" /> Về trang chủ
        </button>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center border border-slate-100 dark:border-slate-700">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <h1 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100 font-sans">
            Đang tải kết quả...
          </h1>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
