import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";

export function authenticate(req: Request, res: Response): any | null {
  const auth = req.headers.authorization;
  if (!auth) { res.status(401).json({ error: "No token" }); return null; }
  try {
    return jwt.verify(auth.split(" ")[1], JWT_SECRET) as any;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
}
