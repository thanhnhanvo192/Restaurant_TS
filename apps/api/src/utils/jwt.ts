import jwt from "jsonwebtoken";

/**
 * JWT Payload khi token được sign cho staff
 * Chứa các thông tin identify staff + role
 */
export interface StaffTokenPayload {
  id: number;
  email: string;
  role: "manager" | "receptionist" | "warehouse";
}

/**
 * JWT Payload khi token được sign cho customer (user)
 * Chứa các thông tin identify user
 */
export interface UserTokenPayload {
  id: number;
  email?: string;
}

/**
 * Sign JWT token cho staff
 * @param staff - Staff data cần encode
 * @returns JWT token string
 * @throws Error nếu JWT_SECRET không được set
 */
export async function signToken(staff: StaffTokenPayload): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  const token = jwt.sign(staff, secret, {
    expiresIn: "7d",
    algorithm: "HS256",
  });

  return token;
}

/**
 * Verify và decode JWT token
 * @param token - JWT token string
 * @returns Decoded payload nếu valid
 * @throws Error nếu token invalid, expired, hoặc JWT_SECRET không được set
 */
export async function verifyToken(token: string): Promise<StaffTokenPayload> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });

    // Type guard: ensure decoded là object với đúng structure
    if (typeof decoded !== "object" || decoded === null) {
      throw new Error("Invalid token payload");
    }

    const role = (decoded as any).role;
    if (role === "customer") {
      throw new Error("Invalid staff token: role is customer");
    }

    const payload: StaffTokenPayload = {
      id: decoded.id as number,
      email: decoded.email as string,
      role: role as StaffTokenPayload["role"],
    };

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    throw error;
  }
}

/**
 * Sign JWT token cho user (customer)
 * @param user - User data cần encode
 * @returns JWT token string
 * @throws Error nếu JWT_SECRET không được set
 */
export async function signUserToken(user: UserTokenPayload): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  const token = jwt.sign({ ...user, role: "customer" }, secret, {
    expiresIn: "30d",
    algorithm: "HS256",
  });

  return token;
}

/**
 * Verify và decode JWT token cho user (customer)
 * @param token - JWT token string
 * @returns Decoded payload nếu valid
 * @throws Error nếu token invalid, expired, hoặc JWT_SECRET không được set
 */
export async function verifyUserToken(
  token: string,
): Promise<UserTokenPayload> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });

    // Type guard: ensure decoded là object với đúng structure
    if (typeof decoded !== "object" || decoded === null) {
      throw new Error("Invalid token payload");
    }

    const role = (decoded as any).role;
    if (role !== "customer") {
      throw new Error("Invalid customer token: role is not customer");
    }

    const payload: UserTokenPayload = {
      id: decoded.id as number,
      email: decoded.email as string | undefined,
    };

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    throw error;
  }
}
