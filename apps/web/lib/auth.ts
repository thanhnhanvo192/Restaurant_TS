export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
    // Sync token to cookie for Next.js middleware (7 days)
    document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax; Secure`;
  }
}

export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
  }
}

export interface DecodedUser {
  id: number | string;
  email: string;
  role: 'manager' | 'receptionist' | 'warehouse' | 'customer';
  name?: string;
  exp?: number;
  iat?: number;
}

export function getUser(): DecodedUser | null {
  const token = getToken();
  if (!token) return null;

  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    if (typeof window === 'undefined') return null;
    
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as DecodedUser;
  } catch (error) {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const user = getUser();
  if (!user) return false;
  
  // Check if token is expired
  if (user.exp) {
    const currentTime = Math.floor(Date.now() / 1000);
    if (user.exp < currentTime) {
      removeToken(); // Token is expired, remove it
      return false;
    }
  }
  
  return true;
}

export function getRole(): 'manager' | 'receptionist' | 'warehouse' | 'customer' | null {
  const user = getUser();
  return user ? user.role : null;
}
