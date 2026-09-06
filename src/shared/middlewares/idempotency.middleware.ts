import { NextFunction, Request, Response } from "express";
import { IdempotencyUtils } from "../utils/idempotency";

export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const idempotencyKey =
    (req.headers["x-idempotency-key"] as string) || req.body?.idempotencyKey;

  if (!idempotencyKey) {
    const newKey = IdempotencyUtils.generateKey();

    req.headers["x-idempotency-key"] = newKey;

    if (req.body) {
      req.body.idempotencyKey = newKey;
    }
  } else if (!IdempotencyUtils.isValidKey(idempotencyKey)) {
    res.status(400).json({ success: false, error: "Invalid idempotency key" });
    return;
  }

  // it attaches the idempotency key to the request object downstream handlers
  // (controllers, services, etc.) can access it and read it as req.idempotencyKey

  (req as any).idempotencyKey =
    req.headers["x-idempotency-key"] || req.body?.idempotencyKey;

  next();
}
