"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AlertCircle, ArrowLeft, DollarSign, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invoiceId = searchParams.get("invoiceId") || "";
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      setIsLoading(true);
      api.get(`/api/invoices/${invoiceId}`)
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            setSessionId(res.data.data.sessionId);
          }
        })
        .catch((err) => {
          console.error("Failed to load invoice session info:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [invoiceId]);

  const handleRetry = () => {
    if (sessionId) {
      router.push(`/receptionist/invoices?sessionId=${sessionId}`);
    } else {
      router.push("/receptionist/invoices");
    }
  };

  const handleCashFallback = () => {
    if (sessionId) {
      toast.info("Đang chuyển hướng sang thanh toán tiền mặt...");
      router.push(`/receptionist/invoices?sessionId=${sessionId}`);
    } else {
      router.push("/receptionist/invoices");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center mb-6 text-rose-500 animate-pulse">
          <AlertCircle className="w-12 h-12" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100 font-sans">
          Thanh Toán Thất Bại!
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
          Giao dịch thanh toán qua VNPay của bạn đã bị hủy hoặc không thành công. Vui lòng kiểm tra lại tài khoản hoặc thử phương thức khác.
        </p>

        <div className="w-full space-y-3">
          <button
            onClick={handleRetry}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900 text-white font-medium rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
          >
            <RefreshCw className="w-4 h-4" /> Thử thanh toán lại VNPay
          </button>

          <button
            onClick={handleCashFallback}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-zinc-950 font-bold rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
          >
            <DollarSign className="w-4 h-4" /> Thanh toán bằng tiền mặt
          </button>

          <button
            onClick={() => router.push("/receptionist/invoices")}
            className="w-full py-3 px-4 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách hóa đơn
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center border border-slate-100 dark:border-slate-700">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
          <h1 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100 font-sans">
            Đang tải dữ liệu...
          </h1>
        </div>
      </div>
    }>
      <PaymentFailedContent />
    </Suspense>
  );
}
