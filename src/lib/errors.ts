import type { ApiError } from "@/api/types";

export class AppError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AppError";
  }

  static fromApiError(apiError: ApiError): AppError {
    return new AppError(apiError.error.code, apiError.error.message);
  }

  static fromUnknown(err: unknown): AppError {
    if (err instanceof AppError) return err;
    if (err instanceof Error) return new AppError("UNKNOWN", err.message);
    return new AppError("UNKNOWN", "Ett oväntat fel inträffade.");
  }
}

export function logError(context: string, error: unknown): void {
  const appError = AppError.fromUnknown(error);
  console.error(`[${context}] ${appError.code}: ${appError.message}`);
}
