// src/controllers/user.controller.ts
import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { comparePassword,hashPassword } from "@utils/crypto";

export const listUsers = async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true }, orderBy: { id: "asc" } });
  return res.json(users);
};

export const updateRole = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { role } = req.body as { role: "ADMIN" | "ORGANIZER" | "PARTICIPANT" };
  if (!["ADMIN", "ORGANIZER", "PARTICIPANT"].includes(role)) return res.status(400).json({ error: "Invalid role" });

  const user = await prisma.user.update({ where: { id }, data: { role } });

  if (role === "ADMIN" || role === "ORGANIZER") {
    const exists = await prisma.organizerProfile.findUnique({ where: { userId: id } });
    if (!exists) await prisma.organizerProfile.create({ data: { userId: id, name: user.name ?? user.email } });
  } else if (role === "PARTICIPANT") {
    const exists = await prisma.participantProfile.findUnique({ where: { userId: id } });
    if (!exists) await prisma.participantProfile.create({ data: { userId: id, name: user.name ?? user.email } });
  }

  return res.json({ id: user.id, email: user.email, role: user.role });
};

export const deleteUser = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.user.delete({ where: { id } });
  return res.json({ message: "User deleted",status: 200 });
};
// Update name
export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = req.user!.id; // from auth middleware
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name required" });
    }

    // Get user with relations
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        participantProfile: {
          select: {
            id: true,
            participations: true,
          },
        },
        organizerProfile: {
          select: {
            id: true,
            companyId: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let profileId: number | null = null;
    let companyId: number | null = null;

    if (user.role === "PARTICIPANT") {
      const updatedProfile = await prisma.participantProfile.update({
        where: { userId: id },
        data: { name },
        select: { id: true },
      });
      profileId = updatedProfile.id;

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profileId,
          name:name,
          participations: user.participantProfile?.participations || [],
        },
      });
    }

    if (user.role === "ORGANIZER" || user.role === "ADMIN") {
      const updatedProfile = await prisma.organizerProfile.update({
        where: { userId: id },
        data: { name },
        select: { id: true, companyId: true },
      });

      profileId = updatedProfile.id;
      companyId = updatedProfile.companyId;

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name:name,
          role: user.role,
          profileId,
          companyId,
        },
      });
    }

    return res.status(400).json({ error: "Unsupported role" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
};


// Change password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const id = req.user!.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "oldPassword & newPassword required" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.password) {
      return res.status(404).json({ error: "User not found" });
    }

    const valid = await comparePassword(oldPassword, user.password);
    if (!valid) return res.status(400).json({ error: "Old password incorrect" });

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    return res.json({ message: "Password changed successfully" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
};
