import { NextRequest, NextResponse } from "next/server";
import { getAiConfigPublic, saveAiConfig } from "@/lib/ai-seo-service";
import { isAdminResponse, requireAdmin } from "@/lib/admin-guard";
import { parseJsonObject } from "@/lib/api-route";
import { errorResponse } from "@/lib/input-validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  return NextResponse.json({ config: await getAiConfigPublic() });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  try {
    return NextResponse.json({ config: await saveAiConfig(parsed.data) });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "AI 配置保存失败");
  }
}
