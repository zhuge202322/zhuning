import { NextRequest, NextResponse } from "next/server";

import { errorResponse } from "@/lib/input-validation";

type JsonObjectResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; response: NextResponse };

export async function parseJsonObject(req: NextRequest): Promise<JsonObjectResult> {
  try {
    const data: unknown = await req.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, response: errorResponse("Invalid JSON body") };
    }
    return { ok: true, data: data as Record<string, unknown> };
  } catch {
    return { ok: false, response: errorResponse("Invalid JSON body") };
  }
}

export function prismaErrorResponse(error: unknown): NextResponse | null {
  const code = (error as { code?: unknown })?.code;
  if (code === "P2002") return errorResponse("A record with that unique value already exists", 409);
  if (code === "P2025") return errorResponse("Record not found", 404);
  return null;
}

export function internalErrorResponse(scope: string, error: unknown) {
  console.error(`${scope}:`, error);
  return errorResponse("Internal server error", 500);
}
