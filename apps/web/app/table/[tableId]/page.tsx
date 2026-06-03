import React from "react";
import { TableLandingClient } from "./TableLandingClient";

interface PageProps {
  params: Promise<{ tableId: string }>;
}

async function getTableData(tableId: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${apiUrl}/api/tables/${tableId}/session`, {
      cache: "no-store",
    });
    
    if (!res.ok) {
      if (res.status === 404) {
        return { error: "Không tìm thấy bàn này trong hệ thống." };
      }
      return { error: "Không thể lấy thông tin bàn. Vui lòng thử lại sau." };
    }

    const result = await res.json();
    if (result.success && result.data) {
      return { data: result.data };
    }
    return { error: result.error || "Có lỗi xảy ra" };
  } catch (error) {
    console.error("Error fetching table session:", error);
    return { error: "Không thể kết nối đến máy chủ." };
  }
}

export default async function TablePage({ params }: PageProps) {
  const { tableId } = await params;
  const { data, error } = await getTableData(tableId);

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-950/40 border border-red-900/50 text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-white mb-2">
            Lỗi Check-in
          </h2>
          <p className="text-sm text-zinc-400 mb-6">{error || "Bàn không khả dụng"}</p>
          <a
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-800 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Về Trang Chủ
          </a>
        </div>
      </div>
    );
  }

  return (
    <TableLandingClient
      tableId={tableId}
      table={data.table}
      session={data.session}
    />
  );
}
