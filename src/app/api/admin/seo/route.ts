import { NextRequest, NextResponse } from "next/server";
import { isAdminResponse, requireAdmin } from "@/lib/admin-guard";
import { parseJsonObject } from "@/lib/api-route";
import { SEO_TARGET_TYPES, type SeoTargetType } from "@/lib/cms-types";
import { errorResponse } from "@/lib/input-validation";
import { getSeoMeta, getSeoTarget, getSeoTargets, saveSeoMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

function targetType(value: string | null): SeoTargetType | null {
  return SEO_TARGET_TYPES.includes(value as SeoTargetType) ? value as SeoTargetType : null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const type = targetType(req.nextUrl.searchParams.get("type"));
  if (!type) return errorResponse("SEO 内容类型无效");
  const key = req.nextUrl.searchParams.get("key")?.trim();
  if (!key) return NextResponse.json({ targets: await getSeoTargets(type, req.nextUrl.searchParams.get("search") || "") });
  const target = await getSeoTarget(type, key);
  if (!target) return errorResponse("SEO 目标不存在", 404);
  return NextResponse.json({ target, seo: await getSeoMeta(type, key) });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  try {
    return NextResponse.json({ seo: await saveSeoMeta(parsed.data) });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "SEO 保存失败");
  }
}
