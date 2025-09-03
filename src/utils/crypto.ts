// src/utils/crypto.ts
import bcrypt from "bcrypt";
import jwt, { SignOptions  } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const SALT_ROUNDS = 10;
const JWT_SECRET= process.env.JWT_SECRET || "dev-secret";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function makeJWT(
  payload: Record<string, unknown>
): string {
  const options: SignOptions = { expiresIn: "1d" };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyJWT<T = any>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}
