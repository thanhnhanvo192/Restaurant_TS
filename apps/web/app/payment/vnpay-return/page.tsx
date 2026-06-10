'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

// Component con chứa logic useSearchParams
function VnpayReturnContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading'|'success'|'failed'>('loading')

  useEffect(() => {
    const responseCode = searchParams.get('vnp_ResponseCode')
    const invoiceId = searchParams.get('vnp_TxnRef')?.split('_')[0]

    if (responseCode === '00') {
      setStatus('success')
      setTimeout(() => {
        router.push(`/payment/success?invoiceId=${invoiceId}`)
      }, 1500)
    } else {
      setStatus('failed')
      setTimeout(() => {
        router.push(`/payment/failed?invoiceId=${invoiceId}`)
      }, 1500)
    }
  }, [searchParams, router])

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center border border-slate-100 dark:border-slate-700">
          <Loader2 className="h-16 w-16 text-emerald-500 animate-spin mb-6" />
          <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100 font-sans">
            Đang xử lý thanh toán...
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Vui lòng giữ kết nối và không đóng trình duyệt.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center border border-slate-100 dark:border-slate-700">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 animate-bounce mb-6" />
          <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100 font-sans">
            Thanh toán thành công!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Đang chuyển hướng...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center border border-slate-100 dark:border-slate-700">
        <XCircle className="h-16 w-16 text-rose-500 animate-pulse mb-6" />
        <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100 font-sans">
          Thanh toán thất bại!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Đang chuyển hướng...
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
