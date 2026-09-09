import type { SeoTargetType } from "@/lib/cms-types";

export type SeoDraft = {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  ogImage: string;
  robots: "index,follow" | "noindex,follow";
};

export type SeoRecord = SeoDraft & {
  id: number;
  targetType: SeoTargetType;
  targetKey: string;
  updatedAt: string;
};

export type SeoTarget = {
  type: SeoTargetType;
  key: string;
  label: string;
  description: string;
  category: string;
  image: string;
};

export type AiConfigPublic = {
  endpoint: string;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
  keyHint: string;
  updatedAt: string | null;
};

export type AiGenerateInput = {
  targets: Array<{ type: SeoTargetType; key: string }>;
  overwrite?: boolean;
};

export type AiGenerateResult = {
  type: SeoTargetType;
  key: string;
  label: string;
  status: "generated" | "skipped" | "failed";
  draft?: SeoDraft;
  error?: string;
};
