import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark relative min-h-screen flex flex-col items-center justify-center bg-zinc-950 overflow-hidden px-4 py-12">
      {/* Premium Decorative Ambient Glows */}
      <div className="absolute top-1/4 -left-20 w-[40rem] h-[40rem] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-[40rem] h-[40rem] bg-orange-600/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Centered card content */}
      <div className="relative w-full max-w-md z-10">
        {children}
      </div>
    </div>
  );
}
