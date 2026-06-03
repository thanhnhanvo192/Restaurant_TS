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

// Form validation schema for registration
const registerSchema = z
  .object({
    name: z.string().min(1, "Họ và tên không được để trống"),
    email: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((val) => !val || z.string().email().safeParse(val).success, {
        message: "Email không đúng định dạng",
      }),
    phone: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((val) => !val || /^[0-9]{10,15}$/.test(val.replace(/\s+/g, "")), {
        message: "Số điện thoại phải từ 10 đến 15 chữ số",
      }),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string().min(1, "Xác nhận mật khẩu không được để trống"),
  })
  .refine((data) => data.email || data.phone, {
    message: "Bạn phải nhập ít nhất Email hoặc Số điện thoại để đăng ký",
    path: ["email"], // attach error to email field
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema as unknown as Parameters<typeof zodResolver>[0]) as unknown as Resolver<RegisterFormValues>,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.post("/api/auth/customer/register", {
        name: values.name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        password: values.password,
      });

      if (response.data && response.data.success) {
        const customerData = response.data.data;
        const token = customerData.token;

        // Auto login on successful registration
        setToken(token);
        localStorage.setItem("user", JSON.stringify({
          id: customerData.id,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          role: "customer",
        }));

        // Redirect to customer menu page
        router.push("/customer/menu");
      } else {
        setErrorMsg("Đăng ký thất bại. Vui lòng thử lại.");
      }
    } catch (error: any) {
      console.error("Customer register error:", error);
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
        <div className="flex flex-col items-center gap-2 mb-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-white"
            >
              <path d="M3 19h18" />
              <path d="M5 19a7 7 0 0 1 14 0" />
              <path d="M12 5V3" />
              <path d="M11 3h2" />
            </svg>
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-white font-heading">
            Tạo tài khoản mới
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400 text-center px-4">
            Đăng ký nhanh chóng để khám phá các dịch vụ ẩm thực hấp dẫn
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel className="text-zinc-300 text-xs" htmlFor="name">
              Họ và tên <span className="text-amber-500">*</span>
            </FieldLabel>
            <Input
              id="name"
              type="text"
              placeholder="Nguyễn Văn A"
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20"
              disabled={isLoading}
              {...register("name")}
            />
            {errors.name && (
              <FieldError className="text-xs text-red-400 mt-1">
                {errors.name.message}
              </FieldError>
            )}
          </Field>

          {/* Special note for email/phone requirement */}
          {errors.email?.type === "custom" && (
            <div className="p-2 rounded bg-amber-950/30 border border-amber-900/50 text-amber-400 text-xs text-center">
              {errors.email.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <FieldLabel className="text-zinc-300 text-xs" htmlFor="email">
                Email
              </FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20"
                disabled={isLoading}
                {...register("email")}
              />
              {errors.email && errors.email.type !== "custom" && (
                <FieldError className="text-xs text-red-400 mt-1">
                  {errors.email.message}
                </FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel className="text-zinc-300 text-xs" htmlFor="phone">
                Số điện thoại
              </FieldLabel>
              <Input
                id="phone"
                type="text"
                placeholder="090xxxxxxx"
                className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20"
                disabled={isLoading}
                {...register("phone")}
              />
              {errors.phone && (
                <FieldError className="text-xs text-red-400 mt-1">
                  {errors.phone.message}
                </FieldError>
              )}
            </Field>
          </div>

          <Field>
            <FieldLabel className="text-zinc-300 text-xs" htmlFor="password">
              Mật khẩu <span className="text-amber-500">*</span>
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

          <Field>
            <FieldLabel className="text-zinc-300 text-xs" htmlFor="confirmPassword">
              Xác nhận mật khẩu <span className="text-amber-500">*</span>
            </FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20"
              disabled={isLoading}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <FieldError className="text-xs text-red-400 mt-1">
                {errors.confirmPassword.message}
              </FieldError>
            )}
          </Field>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-xs text-center">
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
                Đang tạo tài khoản...
              </>
            ) : (
              "Đăng ký"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-zinc-800/50 bg-zinc-950/20 py-3 text-xs text-zinc-400">
        Đã có tài khoản?{" "}
        <Link
          href="/customer/login"
          className="text-amber-500 hover:text-amber-400 ml-1 font-medium underline-offset-4 hover:underline transition-colors"
        >
          Đăng nhập ngay
        </Link>
      </CardFooter>
    </Card>
  );
}
