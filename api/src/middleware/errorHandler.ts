import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../httpError.js";
import type { ApiErrorBody } from "../types.js";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
      error: {
        code: "VALIDATION_ERROR",
        message: err.errors.map((e) => e.message).join("; "),
      },
    };
    res.status(400).json(body);
    return;
  }

  const body: ApiErrorBody = {
    error: {
      code: "INTERNAL_ERROR",
      message: "Ocurrió un error inesperado.",
    },
  };
  res.status(500).json(body);
}
