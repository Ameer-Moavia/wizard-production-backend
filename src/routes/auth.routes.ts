import { Router } from "express";
import {
  signup, login, sendOtp, verifyOtp, requestPasswordReset, resetPassword,verifyEmail
} from "../controllers/auth.controller";

const router = Router();
router.get("/verify", verifyEmail);
router.post("/signup", signup);
router.post("/login", login);

router.post("/otp/send", sendOtp);
router.post("/otp/verify", verifyOtp);

router.post("/password/request-reset", requestPasswordReset);
router.post("/password/reset", resetPassword);

export default router;
