// src/utils/email.ts
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const host = process.env.SMTP_HOST!;
const port = Number(process.env.SMTP_PORT || 587);
const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const user = process.env.SMTP_USER!;
const pass = process.env.SMTP_PASS!;
const fromName = process.env.SMTP_FROM_NAME || "Wizard";
const fromEmail = process.env.SMTP_FROM_EMAIL || user;

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass }
});

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const from = `"${fromName}" <${fromEmail}>`;
  const info = await transporter.sendMail({ from, to, subject, text, html });
  return info;
}
