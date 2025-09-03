import { Request, Response, NextFunction } from "express";
import { verifyJWT } from "../utils/crypto.js";

export type AuthUser = { id: number; email: string; role: "ADMIN" | "ORGANIZER" | "PARTICIPANT" };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        status: 401,
        message: "Missing token",
      });
    }

    const decoded = verifyJWT<AuthUser>(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      status: 401,
      message: "Invalid or expired token",
    });
  }
}

export function requireRole(...roles: AuthUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 401,
        message: "Unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 403,
        message: "Forbidden – insufficient permissions",
      });
    }

    next();
  };
}
