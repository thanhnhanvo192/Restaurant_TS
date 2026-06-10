"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalItems: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl shadow-sm mt-4">
      {/* Items Range Info */}
      <div className="text-xs text-zinc-400">
        Hiển thị <strong className="text-zinc-200">{startItem}–{endItem}</strong> trong tổng số <strong className="text-zinc-200">{totalItems}</strong> mục
      </div>

      {/* Navigation Controls */}
      <div className="flex flex-wrap items-center gap-1.5 justify-center">
        {/* First Page */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="border-zinc-800 hover:bg-zinc-800 text-zinc-400 h-8 w-8 rounded-lg cursor-pointer"
          title="Trang đầu"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Prev Page */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="border-zinc-800 hover:bg-zinc-800 text-zinc-400 h-8 w-8 rounded-lg cursor-pointer"
          title="Trang trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page Numbers */}
        {getPageNumbers().map((pageNum, idx) => {
          if (pageNum === "...") {
            return (
              <span key={`ellipsis-${idx}`} className="text-zinc-650 px-1 text-xs select-none">
                ...
              </span>
            );
          }

          const pageNumNum = pageNum as number;
          const isActive = pageNumNum === currentPage;

          return (
            <Button
              key={`page-${pageNumNum}`}
              onClick={() => onPageChange(pageNumNum)}
              className={`h-8 w-8 text-xs font-bold rounded-lg cursor-pointer border ${
                isActive
                  ? "bg-amber-500 hover:bg-amber-600 text-zinc-950 border-transparent"
                  : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition"
              }`}
            >
              {pageNumNum}
            </Button>
          );
        })}

        {/* Next Page */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="border-zinc-800 hover:bg-zinc-800 text-zinc-400 h-8 w-8 rounded-lg cursor-pointer"
          title="Trang sau"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last Page */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="border-zinc-800 hover:bg-zinc-800 text-zinc-400 h-8 w-8 rounded-lg cursor-pointer"
          title="Trang cuối"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Page Size Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400 whitespace-nowrap">Mỗi trang:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="bg-zinc-950 border border-zinc-800 rounded-xl p-1 px-2.5 text-zinc-350 text-xs h-8 outline-none focus:border-amber-500 transition cursor-pointer"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
}
