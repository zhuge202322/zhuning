import { NextRequest, NextResponse } from "next/server";
import { generateSeoBatch } from "@/lib/ai-seo-service";
import { isAdminResponse, requireAdmin } from "@/lib/admin-guard";
import { parseJsonObject } from "@/lib/api-route";
import { SEO_TARGET_TYPES, type SeoTargetType } from "@/lib/cms-types";
import { errorResponse } from "@/lib/input-validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const rawTargets = parsed.data.targets;
  if (!Array.isArray(rawTargets) || rawTargets.some((item) => !item || typeof item !== "object" || !SEO_TARGET_TYPES.includes((item as { type?: SeoTargetType }).type as SeoTargetType) || typeof (item as { key?: unknown }).key !== "string")) {
    return errorResponse("AI SEO 目标无效");
  }
  try {
    const targets = rawTargets.map((item) => ({ type: (item as { type: SeoTargetType }).type, key: (item as { key: string }).key }));
    return NextResponse.json({ results: await generateSeoBatch(targets, parsed.data.overwrite === true) });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "AI SEO 生成失败");
  }
}
