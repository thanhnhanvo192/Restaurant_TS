"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

// Form validation schema accepting email OR phone number
const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Email hoặc số điện thoại không được để trống")
    .refine(
      (val) => {
        const isEmail = z.string().email().safeParse(val).success;
        const isPhone = /^[0-9]{10,15}$/.test(val.replace(/\s+/g, ""));
        return isEmail || isPhone;
      },
      {
        message: "Vui lòng nhập email hợp lệ hoặc số điện thoại từ 10 chữ số",
      }
    ),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/customer/reservations";
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema as unknown as Parameters<typeof zodResolver>[0]) as unknown as Resolver<LoginFormValues>,
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);

    const isEmail = values.identifier.includes("@");
    const payload = {
      email: isEmail ? values.identifier : "",
      phone: !isEmail ? values.identifier : "",
      password: values.password,
    };

    try {
      const response = await api.post("/api/auth/customer/login", payload);

      if (response.data && response.data.success) {
        const customerData = response.data.data;
        const token = customerData.token;

        // Save token and user details to localStorage
        setToken(token);
        localStorage.setItem("user", JSON.stringify({
          id: customerData.id,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          role: "customer",
        }));

        // Redirect to redirect query target (or fallback)
        router.push(redirect);
      } else {
        setErrorMsg("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      }
    } catch (error: any) {
      console.error("Customer login error:", error);
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
        {/* Beautiful Cloche/Cover Dish SVG Logo */}
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
            Gourmet Restaurant
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Đăng nhập để đặt bàn & gọi món trực tuyến
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel className="text-zinc-300 text-xs" htmlFor="identifier">
              Email hoặc Số điện thoại
            </FieldLabel>
            <Input
              id="identifier"
              type="text"
              placeholder="khachhang@example.com hoặc 090xxxxxxx"
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20"
              disabled={isLoading}
              {...register("identifier")}
            />
            {errors.identifier && (
              <FieldError className="text-xs text-red-400 mt-1">
                {errors.identifier.message}
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

      <CardFooter className="flex flex-col gap-2 border-t border-zinc-800/50 bg-zinc-950/20 py-3 text-xs text-zinc-400">
        <div className="flex justify-center w-full">
          Chưa có tài khoản?{" "}
          <Link
            href={redirect !== "/customer/reservations" ? `/customer/register?redirect=${encodeURIComponent(redirect)}` : "/customer/register"}
            className="text-amber-500 hover:text-amber-400 ml-1 font-medium underline-offset-4 hover:underline transition-colors"
          >
            Đăng ký ngay
          </Link>
        </div>
        <div className="flex justify-center border-t border-zinc-900/60 pt-2 w-full">
          Bạn là nhân viên?{" "}
          <Link
            href="/staff/login"
            className="text-amber-500 hover:text-amber-400 ml-1 font-semibold underline-offset-4 hover:underline transition-colors"
          >
            Đăng nhập hệ thống nhân viên
          </Link>
        </div>
        <div className="flex justify-center border-t border-zinc-900/60 pt-2 w-full">
          <Link
            href="/"
            className="text-zinc-500 hover:text-zinc-300 font-semibold underline-offset-4 hover:underline transition-colors"
          >
            ← Quay lại trang chủ
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={
      <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-xl text-zinc-100 shadow-2xl relative overflow-hidden flex items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </Card>
    }>
      <CustomerLoginForm />
    </Suspense>
  );
}
