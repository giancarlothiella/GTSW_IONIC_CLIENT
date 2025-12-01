// Authentication models
export interface User {
  email: string;
  name: string;
  picture?: string;
  profileFileName?: string;
  authProfileCode?: string;
  dbMode?: string;
  token?: string;
  expireMinutes?: number;
  expireDate?: string;
  languageId?: string;
  loginType?: string;
  homePath?: string;
  webAdmin?: boolean;
  webDevel?: boolean;
  prjId?: string;
  prjConnections?: any[];
}

// TOTP 2FA interfaces
export interface Totp2FA {
  totp2FAToken: string;              // Temporary token during 2FA verification
  totp2FAenabled: boolean;            // Is 2FA enabled for this user
  totp2FAsaved: boolean;              // Is the device already registered
  totp2FAQRCode: string;              // QR code (image data) for setup
  totpEmail: string;                  // User email for TOTP
  totp2FAAppCode: string;             // Application/account code
  data: User;                         // Full user authentication data
}

export interface TotpForm {
  totp2FAToken: string;               // The 6-digit TOTP code entered by user
}

export interface LoginResponse {
  valid: boolean;
  message?: string;
  totp2FAenabled?: boolean;
  totp2FAToken?: string;
  totp2FAsaved?: boolean;
  totp2FAQRCode?: string;
  totp2FAAppCode?: string;
  data?: User;
}

export interface TotpVerifyRequest {
  totp2FAToken: string;
  email: string;
}

export interface TotpResetRequest {
  email: string;
  resetSecret: string;
}
