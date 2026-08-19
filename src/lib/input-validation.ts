import { NextResponse } from "next/server";
import * as core from "@/lib/input-validation-core.mjs";

export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export const parsePositiveId = core.parsePositiveId as (value: unknown) => number | null;
export const isValidSlug = core.isValidSlug as (value: unknown) => value is string;
export const isAllowedUrl = core.isAllowedUrl as (value: unknown, allowEmpty?: boolean) => value is string;
export const isOneOf = core.isOneOf as <T extends string>(value: unknown, allowed: readonly T[]) => value is T;
export const validateCategoryInput = core.validateCategoryInput as (input: unknown, mode?: "create" | "update") => { ok: boolean; error?: string; value?: Record<string, unknown> };
export const validatePostInput = core.validatePostInput as (input: unknown, mode?: "create" | "update") => { ok: boolean; error?: string; value?: Record<string, unknown> };
export const validateProductInput = core.validateProductInput as (input: unknown, mode?: "create" | "update") => { ok: boolean; error?: string; value?: Record<string, unknown> };
export const validateOrderFields = core.validateOrderFields as (input: unknown) => { ok: boolean; error?: string };
export const validateUploadMetadata = core.validateUploadMetadata as (input: unknown) => { ok: boolean; error?: string };
export const uploadExtensionForMime = core.uploadExtensionForMime as (mimeType: string) => string | null;
