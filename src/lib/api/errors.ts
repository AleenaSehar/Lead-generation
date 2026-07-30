import { Prisma } from "@/generated/prisma/client";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function normalizeApiError(error: unknown) {
  if (error instanceof ApiError) return error;

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return new ApiError(409, "DUPLICATE_LEAD", "A lead with that email already exists.");
  }

  console.error("Unhandled API error", error);
  return new ApiError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
}
