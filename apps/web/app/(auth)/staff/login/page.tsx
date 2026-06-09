"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Loader2 } from "lucide-react";

// Form validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email không được để trống")
    .email("Email không đúng định dạng"),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function StaffLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema as unknown as Parameters<typeof zodResolver>[0]) as unknown as Resolver<LoginFormValues>,
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.post("/api/auth/staff/login", {
        email: values.email,
        password: values.password,
      });

      if (response.data && response.data.success) {
        const staffData = response.data.data;
        const token = staffData.token;
        const role = staffData.role;

        // Save token and user details to localStorage
        setToken(token);
        localStorage.setItem("user", JSON.stringify({
          id: staffData.id,
          name: staffData.name,
          email: staffData.email,
          role: staffData.role,
        }));

        // Redirect based on role
        if (role === "manager") {
          router.push("/manager/dashboard");
        } else if (role === "receptionist") {
          router.push("/receptionist/tables");
        } else if (role === "warehouse") {
          router.push("/warehouse/inventory");
        } else {
          setErrorMsg("Vai trò của tài khoản này không được hỗ trợ trong trang quản lý.");
        }
      } else {
        setErrorMsg("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      }
    } catch (error: any) {
      console.error("Staff login error:", error);
      if (error.response && error.response.data && error.response.data.error) {
        setErrorMsg(error.response.data.error);
      } else {
        setErrorMsg("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-xl text-zinc-100 shadow-2xl relative overflow-hidden">
      {/* Decorative top ambient border glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

      <CardHeader className="flex flex-col items-center pb-2">
        {/* Beautiful Animated Cloche/Cover Dish SVG Logo */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6 text-white"
            >
              <path d="M3 19h18" />
              <path d="M5 19a7 7 0 0 1 14 0" />
              <path d="M12 5V3" />
              <path d="M11 3h2" />
            </svg>
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-zinc-100 font-heading">
            Gourmet Staff
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Hệ thống Quản lý Vận hành & Nhà hàng
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel className="text-zinc-300 text-xs" htmlFor="email">
              Địa chỉ Email
            </FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="nhanvien@gourmet.com"
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20"
              disabled={isLoading}
              {...register("email")}
            />
            {errors.email && (
              <FieldError className="text-xs text-red-400 mt-1">
                {errors.email.message}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel className="text-zinc-300 text-xs" htmlFor="password">
              Mật khẩu
            </FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20"
              disabled={isLoading}
              {...register("password")}
            />
            {errors.password && (
              <FieldError className="text-xs text-red-400 mt-1">
                {errors.password.message}
              </FieldError>
            )}
          </Field>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-xs text-center animate-shake">
              {errorMsg}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-semibold shadow-lg hover:shadow-orange-500/10 transition-all duration-200 mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Đang đăng nhập...
              </>
            ) : (
              "Đăng nhập"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-zinc-800/50 bg-zinc-950/20 py-3.5 text-xs text-zinc-400">
        Bạn là khách hàng?{" "}
        <Link
          href="/customer/login"
          className="text-amber-500 hover:text-amber-400 ml-1 font-semibold underline-offset-4 hover:underline transition-colors"
        >
          Quay lại trang đăng nhập khách hàng
        </Link>
      </CardFooter>
    </Card>
  );
}
