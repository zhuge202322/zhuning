import { NextRequest, NextResponse } from "next/server";
import { isAdminResponse, requireAdmin } from "@/lib/admin-guard";
import { siteSettingRegistry, validateSiteSettingInput } from "@/lib/cms-registry";
import { errorResponse } from "@/lib/input-validation";
import { parseJsonObject, prismaErrorResponse } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/cms";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;

  return NextResponse.json({ settings: await getSiteSettings() });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;

  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body: unknown = parsed.data;
  const inputs = Array.isArray((body as { settings?: unknown[] })?.settings)
    ? (body as { settings: unknown[] }).settings
    : [body];
  const validated = inputs.map((input) => validateSiteSettingInput(input));
  const invalid = validated.find((result) => !result.ok);
  if (invalid && !invalid.ok) return errorResponse(invalid.error);

  const values = validated.map((result) => {
    if (!result.ok) throw new Error(result.error);
    return result.value;
  });
  try {
    const settings = await prisma.$transaction(values.map((value) => prisma.siteSetting.upsert({
      where: { key: value.key },
      update: { value: value.value, type: value.type, group: value.group },
      create: value,
    })));
    return NextResponse.json({ settings });
  } catch (error) {
    return prismaErrorResponse(error) ?? errorResponse("Internal server error", 500);
  }
}

export const POST = PUT;
