import type { Prisma } from "@prisma/client";
import { collectLocalMediaUrls as collectCore, inspectLocalMediaUrls as inspectCore } from "@/lib/media-asset-validation-core.mjs";

export class MissingMediaAssetError extends Error {
  constructor(readonly urls: string[]) {
    super("Unknown local media asset");
  }
}

export const collectLocalMediaUrls = collectCore as (input: unknown) => string[];
export const inspectLocalMediaUrls = inspectCore as (input: unknown) => { urls: string[]; invalid: string[]; legacyBases: string[] };

export async function assertLocalMediaAssetsExist(
  client: Prisma.TransactionClient,
  input: unknown,
  options: { allowedLegacyUrls?: Iterable<string> } = {},
) {
  const inspected = inspectLocalMediaUrls(input);
  const allowedLegacyUrls = new Set(options.allowedLegacyUrls || []);
  const invalid = inspected.invalid.filter((url) => !allowedLegacyUrls.has(url));
  if (invalid.length) throw new MissingMediaAssetError(invalid);
  const urls = inspected.urls;
  if (!urls.length) return;
  const assets = await client.mediaAsset.findMany({ where: { url: { in: urls }, status: "ACTIVE" }, select: { url: true } });
  const found = new Set(assets.map((asset) => asset.url));
  const missing = urls.filter((url) => !found.has(url));
  if (missing.length) throw new MissingMediaAssetError(missing);
}
