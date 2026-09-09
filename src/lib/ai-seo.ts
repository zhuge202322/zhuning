import type { SeoDraft } from "@/lib/seo-types";
import * as core from "./ai-seo-core.mjs";

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };
type ParseResult = { ok: true; draft: SeoDraft } | { ok: false; error: string };

export const encryptApiKey = core.encryptApiKey as (apiKey: string, secret: string) => string;
export const decryptApiKey = core.decryptApiKey as (payload: string, secret: string) => string;
export const maskApiKey = core.maskApiKey as (apiKey: string) => string;
export const validateAiConfig = core.validateAiConfig as (input: unknown) => ValidationResult<{
  endpoint: string;
  model: string;
  enabled: boolean;
  apiKey: string;
}>;
export const parseAiSeoResponse = core.parseAiSeoResponse as (text: string) => ParseResult;
