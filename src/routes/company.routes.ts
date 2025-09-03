import { Router } from "express";
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  inviteOrganizer

} from "../controllers/company.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

// Only logged-in users can view companies
router.get("/", requireAuth, getCompanies);
router.get("/:id", requireAuth, getCompanyById);

// Only organizers/admins can create/update/delete
router.post("/", requireAuth, requireRole("ADMIN", "ORGANIZER"), createCompany);
router.put("/:id", requireAuth, requireRole("ADMIN", "ORGANIZER"), updateCompany);
router.delete("/:id", requireAuth, requireRole("ADMIN"), deleteCompany);
router.post("/invite-organizer", requireAuth, requireRole("ADMIN", "ORGANIZER"), inviteOrganizer);
export default router;