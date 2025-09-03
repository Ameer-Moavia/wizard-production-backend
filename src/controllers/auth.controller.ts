// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { hashPassword, comparePassword, makeJWT } from "../utils/crypto";
import { generateOtp, generateResetToken } from "../utils/otp";
import { sendEmail } from "../utils/email";

type Role = "ADMIN" | "ORGANIZER" | "PARTICIPANT";

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, role = "PARTICIPANT", name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "name, email, password required" });
    }

    // Already confirmed?
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "Email already in use" });

    // Delete old pending if any
    await prisma.unverifiedUser.deleteMany({ where: { email } });

    // Hash password
    const hashed = await hashPassword(password);

    // Token + expiry
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h

    await prisma.unverifiedUser.create({
      data: { email, name, password: hashed, role, token, expiresAt },
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify?token=${token}`;
    await sendEmail(
      email,
      "Verify your account",
      `Hi ${name},\n\nClick the link to verify:\n${verifyUrl}\n\nExpires in 1h`
    );

    return res.json({ message: "Verification email sent." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
};
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.status(400).json({
        error: "Invalid token",
        status: 400
      });
    }

    const pending = await prisma.unverifiedUser.findUnique({ where: { token } });

    if (!pending) {
      return res.status(404).json({
        error: "Invalid token or user already verified",
        status: 404
      });
    }

    if (pending.expiresAt < new Date()) {
      return res.status(410).json({
        error: "Token expired",
        status: 410
      });
    }
    // Move data into User
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: pending.email,
          name: pending.name,
          password: pending.password,
          role: pending.role,
        },
      });

      if (pending.role === "ORGANIZER") {
        await tx.organizerProfile.create({
          data: {
            userId: user.id,
            name: user.name ?? "Unnamed Organizer",
          },
        });
      }

      if (pending.role === "PARTICIPANT") {
        await tx.participantProfile.create({
          data: {
            userId: user.id,
            name: user.name ?? "Unnamed Participant",
          },
        });
      }

      await tx.unverifiedUser.delete({ where: { id: pending.id } });
    });


    return res.status(201).json({ message: "Email verified. You can now login.", status: 201 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      return res.status(400).json({ error: "email & password required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organizerProfile: true,
        participantProfile: { include: { participations: true } },
      },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await comparePassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = makeJWT({ id: user.id, email: user.email, role: user.role });

    let profileId: number | null = null;
    let companyId: number | null = null;
    if (user.role === "ORGANIZER" && user.organizerProfile) {
      profileId = user.organizerProfile.id;
      companyId = user.organizerProfile.companyId;
    } else if (user.role === "PARTICIPANT" && user.participantProfile) {
      profileId = user.participantProfile.id;
    }
    if (user.role === "ORGANIZER" || user.role === "ADMIN") {
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profileId, // <-- organizerProfile.id or participantProfile.id
          companyId, // <-- for organizers

        },
        token,
      });
    } else if (user.role === "PARTICIPANT") {
      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profileId, // <-- organizerProfile.id or participantProfile.id
          partticipations: user.participantProfile?.participations
        },
        token,
      });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
};


// Send OTP (purpose: LOGIN | SIGNUP | RESET)
// src/controllers/auth.controller.ts
export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { email, purpose } = req.body as {
      email: string;
      purpose: "LOGIN" | "SIGNUP" | "RESET";
    };

    if (!email || !purpose)
      return res.status(400).json({ error: "Email and purpose required", status: 400 });
    if (!["LOGIN", "SIGNUP", "RESET"].includes(purpose))
      return res.status(400).json({ error: "Invalid purpose", status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });

    // 🔹 Purpose specific checks
    if (purpose === "SIGNUP" && user) {
      return res.status(409).json({ error: "User already exists", status: 409 });
    }
    if (purpose === "LOGIN" && !user) {
      return res.status(404).json({ error: "User not found", status: 404 });
    }
    if (purpose === "RESET" && !user) {
      // don’t leak info, same as requestPasswordReset
      return res.status(200).json({ message: "If email exists, OTP will be sent", status: 200 });
    }

    // Generate OTP
    await prisma.oTP.deleteMany({ where: { email } });
    const code = generateOtp();
    const ttl = Number(process.env.OTP_TTL_MINUTES || 10);
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    await prisma.oTP.create({
      data: { email, code, purpose: purpose as any, expiresAt },
    });

    const subject = `Your OTP Code for ${purpose}`;
    const text = `Your OTP is: ${code}. It will expire in ${ttl} minutes.`;
    const html = `<p>Your OTP is <strong>${code}</strong>. Expires in ${ttl} minutes.</p>`;
    await sendEmail(email, subject, text, html);

    return res.json({ message: "OTP sent to email" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
};


// Verify OTP
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, code, purpose, name, role } = req.body as {
      email: string;
      code: string;
      purpose?: "LOGIN" | "SIGNUP" | "RESET";
      name?: string;
      role?: Role
    };

    if (!email || !code) return res.status(400).json({ error: "email & code required" });

    const otp = await prisma.oTP.findFirst({
      where: { email, code, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { id: "desc" }
    });
    if (!otp) return res.status(400).json({ error: "Invalid or expired OTP" });

    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        participantProfile: true,
        organizerProfile: true,
      },
    });

    // --- SIGNUP ---
    if (otp.purpose === "SIGNUP") {
      if (user) {
        return res.status(409).json({ error: "User already exists" });
      }
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          role: role,
          participantProfile: role === "PARTICIPANT"
            ? { create: { name: name || email.split("@")[0] } }
            : undefined,
          organizerProfile: role === "ORGANIZER"
            ? { create: { name: name || email.split("@")[0] } }
            : undefined,
        },
        include: {
          participantProfile: true,
          organizerProfile: true,
        },
      });
    }

    // --- LOGIN ---
    if (otp.purpose === "LOGIN") {
      if (!user) return res.status(404).json({ error: "User not found" });
    }

    // --- RESET ---
    if (otp.purpose === "RESET") {
      if (!user) return res.status(404).json({ error: "User not found" });
      const token = generateResetToken();
      const ttl = Number(process.env.RESET_TTL_MINUTES || 60);
      const expiresAt = new Date(Date.now() + ttl * 60 * 1000);
      await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });
      await prisma.oTP.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
      return res.json({ message: "OTP verified for reset", resetToken: token });
    }

    // Consume OTP
    await prisma.oTP.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

    // Make JWT
    const token = makeJWT({ id: user!.id, email: user!.email, role: user!.role });

    // Build profile + company info like in login
    let profileId: number | null = null;
    let companyId: number | null = null;
    if (user!.role === "ORGANIZER" && user!.organizerProfile) {
      profileId = user!.organizerProfile.id;
      companyId = user!.organizerProfile.companyId;
    } else if (user!.role === "PARTICIPANT" && user!.participantProfile) {
      profileId = user!.participantProfile.id;
    }

    return res.json({
      user: {
        id: user!.id,
        email: user!.email,
        role: user!.role,
        profileId,
        companyId,
        name:user!.name
      },
      token,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
};


export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };
    if (!email) {
      return res.status(400).json({ error: "email required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const token = generateResetToken();
    const ttl = Number(process.env.RESET_TTL_MINUTES || 60);
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const link = `${process.env.FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(token)}`;
    await sendEmail(
      email,
      "Reset your password",
      `Reset link: ${link}`,
      `<a href="${link}">Click To Confirm Email To Change Password</a>`
    );

    return res.json({ message: "Password reset email sent" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body as {
      token: string;
      newPassword: string;
    };
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: "token & newPassword required" });
    }

    const record = await prisma.passwordResetToken.findFirst({
      where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || !user.password) {
      return res.status(404).json({ error: "User not found" });
    }

    // 🔹 Check if new password is same as old one
    const isSame = await comparePassword(newPassword, user.password);
    if (isSame) {
      return res
        .status(400)
        .json({ error: "New password cannot be same as old password" });
    }

    const hashed = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.json({ message: "Password updated successfully" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
};

