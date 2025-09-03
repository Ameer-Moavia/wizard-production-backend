import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { sendEmail } from "@utils/email";

// Create company
export const createCompany = async (req: Request, res: Response) => {
  try {
    const { name, description, ownerId } = req.body;

    if (!name || !ownerId) {
      return res.status(400).json({ status: 400, message: "Name and ownerId are required" });
    }

   const company = await prisma.company.create({
  data: {
    name,
    description,
    ownerId, // OrganizerProfile.id (the owner)
    organizers: {
      connect: { id: ownerId }, // also attach the owner as an organizer
    },
  },
  include: {
    owner: true,
    organizers: true,
  },
});

    return res.status(201).json({ status: 201, message: "Company created successfully", data: company });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: 500, message: "Internal server error" });
  }
};
export const inviteOrganizer = async (req: Request, res: Response) => {
  try {
    const { companyId, email } = req.body;

    if (!companyId || !email) {
      return res.status(400).json({ error: "companyId and email required" });
    }

    // 1️⃣ Generate random password
    const plainPassword = randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 2️⃣ Create User + OrganizerProfile in transaction
    const [newUser, organizerProfile] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "ORGANIZER",
        },
      }),
      prisma.organizerProfile.create({
        data: {
          name: email.split("@")[0], 
          user: { connect: { email } },
        },
      }),
    ]);

    // 3️⃣ Connect organizer to company
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        organizers: {
          connect: { id: organizerProfile.id },
        },
      },
      include: { organizers: true },
    });

    // 4️⃣ Send email with credentials
    await sendInvitationEmail(email, plainPassword);

    return res.status(201).json({
      message: "Organizer invited successfully",
      status: 201,
      company: updatedCompany, // return only for dev, remove in prod
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
};
// Get all companies
export const getCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      include: { owner: true, organizers: true, events: true },
    });

    return res.status(200).json({ status: 200, message: "Companies fetched successfully", data: companies });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

// Get single company
export const getCompanyById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ status: 400, message: "Invalid company ID" });

    const company = await prisma.company.findUnique({
      where: { id },
      include: { owner: true, organizers: {include:{
        user: true
      }},events:{ include: {
        attachments: true,   // 👈 fetch attachments with each event
        participants: {include:{
          participant: true
        }},  // (optional) if you also want participants
        organizer: true,
      } }},
    });

    if (!company) return res.status(404).json({ status: 404, message: "Company not found" });

    return res.status(200).json({ status: 200, message: "Company fetched successfully", data: company });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

// Update company
export const updateCompany = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;

    const company = await prisma.company.update({
      where: { id },
      data: { name, description },
    });

    return res.status(200).json({ status: 200, message: "Company updated successfully", data: company });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

// Delete company
export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.company.delete({ where: { id } });

    return res.status(200).json({ status: 200, message: "Company deleted successfully" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: 500, message: "Internal server error" });
  }
};
// src/utils/email.ts
export async function sendInvitationEmail(email: string, password: string) {
  const subject = "You're invited as an Organizer";
  const text = `Hi,

You have been invited as an Organizer.

Here are your credentials:

Email: ${email}
Password: ${password}

Please login and change your password.`;

  const html = `<p>Hi,</p>
<p>You have been invited as an <strong>Organizer</strong>.</p>
<p>Here are your credentials:</p>
<ul>
  <li>Email: ${email}</li>
  <li>Password: ${password}</li>
</ul>
<p>Please login and change your password.</p>`;

  return sendEmail(email, subject, text, html);
}
