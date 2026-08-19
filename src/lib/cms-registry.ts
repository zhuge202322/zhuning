import * as core from "@/lib/cms-registry-core.mjs";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type ValidatedSiteSetting = {
  key: string;
  value: string;
  type: string;
  group: string;
};

export type ValidatedPageSection = {
  pageKey: string;
  sectionKey: string;
  dataJson?: string;
  eyebrow?: string;
  title?: string;
  body?: string;
  buttonLabel?: string;
  buttonHref?: string;
  mediaUrl?: string;
  mediaAlt?: string;
  sortOrder?: number;
  enabled?: boolean;
};

export const siteSettingRegistry = core.siteSettingRegistry as Record<string, { label: string; type: string; group: string }>;
export const pageSectionRegistry = core.pageSectionRegistry as Record<string, { label: string; sections: Record<string, string[]> }>;
export const isSafeCmsUrl = core.isSafeCmsUrl as (value: unknown, options?: { allowEmpty?: boolean }) => boolean;
export const isSafeMediaUrl = core.isSafeMediaUrl as (value: unknown, options?: { allowEmpty?: boolean }) => boolean;
export const validateSiteSettingInput = core.validateSiteSettingInput as (input: unknown) => ValidationResult<ValidatedSiteSetting>;
export const validatePageSectionInput = core.validatePageSectionInput as (input: unknown) => ValidationResult<ValidatedPageSection>;
export const normalizePageOrder = core.normalizePageOrder as (
  pageKey: unknown,
  sectionKeys: unknown,
) => Array<{ sectionKey: string; sortOrder: number }>;
