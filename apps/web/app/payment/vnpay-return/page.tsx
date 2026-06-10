'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

// Component con chứa logic useSearchParams và redirect sang backend verify
function VnpayReturnContent() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = searchParams.toString()
    if (params) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      // Chuyển hướng trực tiếp đến API backend để xác thực chữ ký và cập nhật DB.
      // Sau khi verify xong, Backend sẽ redirect ngược lại về /payment/success hoặc /payment/failed trên frontend.
      window.location.href = `${apiUrl}/api/payments/vnpay/return?${params}`
    }
  }, [searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center border border-slate-100 dark:border-slate-700">
        <Loader2 className="h-16 w-16 text-emerald-500 animate-spin mb-6" />
        <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100 font-sans">
          Đang xác thực giao dịch...
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Hệ thống đang kiểm tra kết quả thanh toán từ VNPay. Vui lòng giữ kết nối và không đóng trình duyệt.
        </p>
      </div>
    </div>
  )
}

// Component cha wrap Suspense — bắt buộc cho Next.js 15 production
export default function VnpayReturnPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center border border-slate-100 dark:border-slate-700">
          <Loader2 className="h-16 w-16 text-emerald-500 animate-spin mb-6" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-sans">
            Đang xử lý thanh toán...
          </p>
        </div>
      </div>
    }>
      <VnpayReturnContent />
    </Suspense>
  )
}
