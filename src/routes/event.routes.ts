import { Router } from "express";
import {
  createEvent, updateEvent, deleteEvent, listEvents, getEvent,
  joinEvent, approveParticipant, listParticipants, markExpiredEvents
} from "../controllers/event.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import upload from "../middleware/upload";

const router = Router();

// Public
router.get("/", listEvents);
router.get("/:id", getEvent);

// Admin/Organizer
router.patch("/mark-expired", markExpiredEvents);
router.post("/", requireAuth, requireRole("ADMIN", "ORGANIZER"), upload.array("files", 6), createEvent);
router.patch("/:id", requireAuth, requireRole("ADMIN", "ORGANIZER"), upload.array("files", 6), updateEvent);
router.delete("/:id", requireAuth, requireRole("ADMIN", "ORGANIZER"), deleteEvent);
router.get("/:id/participants", requireAuth, requireRole("ADMIN", "ORGANIZER"), listParticipants);
router.post("/:id/participants/:pid/approve", requireAuth, requireRole("ADMIN", "ORGANIZER"), approveParticipant);
// src/routes/event.routes.ts



// Participant
router.post("/:id/join", requireAuth, joinEvent);

export default router;