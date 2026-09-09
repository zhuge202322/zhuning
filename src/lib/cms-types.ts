export const SITE_SETTING_GROUPS = ["brand", "support", "company", "social", "seo"] as const;

export const SITE_SETTING_KEYS = [
  "site.name",
  "site.logo",
  "support.email",
  "support.phone",
  "support.whatsapp",
  "company.address",
  "social.instagram",
  "social.facebook",
  "social.tiktok",
  "social.youtube",
  "seo.siteTitle",
  "seo.defaultDescription",
  "seo.defaultKeywords",
  "seo.siteUrl",
  "seo.defaultOgImage",
  "seo.twitterHandle",
] as const;

export const PAGE_KEYS = [
  "home",
  "about",
  "customization",
  "certifications",
  "after-sales",
  "privacy",
  "returns",
  "product-detail",
] as const;

export const PAGE_SECTION_KEYS = {
  home: ["hero", "proof", "categories", "catalogue", "spotlight", "company", "customization", "certifications", "inquiry"],
  about: ["hero", "stats", "story", "history", "capabilities", "presentation", "gallery", "contact"],
  customization: ["hero", "brief", "process", "reference", "process-media", "assurance", "contact"],
  certifications: ["hero", "summary", "evidence", "library", "contact"],
  "after-sales": ["hero", "commitment", "product-review", "production", "shipping", "resolution", "evidence"],
  privacy: ["hero", "commitment", "information", "usage", "protection", "choices"],
  returns: ["hero", "commitment", "window", "exchanges", "exclusions", "refunds"],
  "product-detail": ["summary", "care", "editorial", "related"],
} as const satisfies Record<(typeof PAGE_KEYS)[number], readonly string[]>;

export const MEDIA_TYPES = ["image", "video", "document"] as const;
export const ORDER_TYPES = ["INQUIRY", "FORMAL"] as const;
export const SEO_TARGET_TYPES = ["SITE", "PAGE", "PRODUCT", "CATEGORY", "POST"] as const;
export const ORDER_STATUSES = [
  "PENDING_INQUIRY",
  "CONTACTED",
  "QUOTED",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const ORDER_STATUS_TRANSITIONS = {
  PENDING_INQUIRY: ["CONTACTED", "CANCELLED"],
  CONTACTED: ["QUOTED", "CANCELLED"],
  QUOTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
} as const satisfies Record<(typeof ORDER_STATUSES)[number], readonly (typeof ORDER_STATUSES)[number][]>;

export type SiteSettingGroup = (typeof SITE_SETTING_GROUPS)[number];
export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number];
export type PageKey = (typeof PAGE_KEYS)[number];
export type PageSectionKey<TPage extends PageKey> = (typeof PAGE_SECTION_KEYS)[TPage][number];
export type MediaType = (typeof MEDIA_TYPES)[number];
export type OrderType = (typeof ORDER_TYPES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type SeoTargetType = (typeof SEO_TARGET_TYPES)[number];

export type MediaMetadata = {
  originalName: string;
  fileName: string;
  url: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  durationMs?: number;
  alt: string;
};
