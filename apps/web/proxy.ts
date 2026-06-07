import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface DecodedUser {
  id: number | string;
  email: string;
  role: "manager" | "receptionist" | "warehouse" | "customer";
  name?: string;
  exp?: number;
  iat?: number;
}

// Custom JWT decode safe for Next.js Edge runtime / Node runtime proxy
function decodeJwt(token: string): DecodedUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    const decoded = JSON.parse(jsonPayload) as DecodedUser;
    if (decoded && !decoded.role) {
      decoded.role = "customer";
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

function getRoleHomePath(role: string): string {
  switch (role) {
    case "manager":
      return "/manager/dashboard";
    case "receptionist":
      return "/receptionist/tables";
    case "warehouse":
      return "/warehouse/inventory";
    case "customer":
      return "/customer/reservations";
    default:
      return "/login";
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // 1. Handle public/auth routes for already-authenticated users
  if (
    pathname === "/login" ||
    pathname === "/customer/login" ||
    pathname === "/customer/register" ||
    pathname === "/staff/login"
  ) {
    if (token) {
      const user = decodeJwt(token);
      if (user && user.exp && user.exp > Math.floor(Date.now() / 1000)) {
        return NextResponse.redirect(new URL(getRoleHomePath(user.role), request.url));
      }
    }
    return NextResponse.next();
  }

  // 2. Protect routes
  const isCustomerRoute = pathname.startsWith("/customer");
  const isManagerRoute = pathname.startsWith("/manager");
  const isReceptionistRoute = pathname.startsWith("/receptionist");
  const isWarehouseRoute = pathname.startsWith("/warehouse");

  const isProtectedRoute = isCustomerRoute || isManagerRoute || isReceptionistRoute || isWarehouseRoute;

  if (isProtectedRoute) {
    const loginRedirectUrl = isCustomerRoute ? "/customer/login" : "/staff/login";

    if (!token) {
      return NextResponse.redirect(new URL(loginRedirectUrl, request.url));
    }

    const user = decodeJwt(token);

    if (!user || !user.role) {
      const response = NextResponse.redirect(new URL(loginRedirectUrl, request.url));
      response.cookies.delete("token");
      return response;
    }

    // Check expiration
    if (user.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      if (user.exp < currentTime) {
        const response = NextResponse.redirect(new URL(loginRedirectUrl, request.url));
        response.cookies.delete("token");
        return response;
      }
    }

    const role = user.role;

    // Role-based route enforcement
    if (isManagerRoute && role !== "manager") {
      return NextResponse.redirect(new URL(getRoleHomePath(role), request.url));
    }

    if (isReceptionistRoute && role !== "receptionist") {
      return NextResponse.redirect(new URL(getRoleHomePath(role), request.url));
    }

    if (isWarehouseRoute && role !== "warehouse") {
      return NextResponse.redirect(new URL(getRoleHomePath(role), request.url));
    }

    if (isCustomerRoute && role !== "customer") {
      return NextResponse.redirect(new URL(getRoleHomePath(role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/manager/:path*",
    "/receptionist/:path*",
    "/warehouse/:path*",
    "/customer/:path*",
    "/staff/login",
    "/customer/login",
    "/customer/register",
    "/login",
  ],
};
