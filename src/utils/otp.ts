// src/utils/otp.ts
export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateResetToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
// This function can be used to generate a random token for password reset or other purposes.