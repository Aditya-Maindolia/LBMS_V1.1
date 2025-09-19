export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  memberId?: string;
  memberName?: string;
  email?: string;
  redirectUrl?: string;
}

// ✅ Fix the loginTime type
export interface AuthUser {
  memberId: string;
  memberName: string;
  email: string;
  token: string;
  loginTime: Date | string; // ✅ Allow both Date and string for flexibility
}

export interface PasswordResetRequest {
  email: string;
}

export interface AccountLockInfo {
  email: string;
  attempts: number;
  lockedUntil?: Date;
  isLocked: boolean;
}

// ✅ Add interfaces for better type safety
export interface LoginCredentials {
  email: string;
  password: string;
}
