import { NextRequest, NextResponse } from "next/server";
import { isAdminResponse, requireAdmin } from "@/lib/admin-guard";
import { normalizePageOrder, pageSectionRegistry, validatePageSectionInput } from "@/lib/cms-registry";
import { errorResponse } from "@/lib/input-validation";
import { parseJsonObject, prismaErrorResponse } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { getPageSections } from "@/lib/cms";
import { assertLocalMediaAssetsExist, MissingMediaAssetError } from "@/lib/media-asset-validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;

  const pageKey = req.nextUrl.searchParams.get("pageKey") ?? "home";
  const page = pageSectionRegistry[pageKey];
  if (!page) return errorResponse("Unknown page", 404);
  const sections = await getPageSections(pageKey);
  return NextResponse.json({ pageKey, pageLabel: page.label, pages: Object.entries(pageSectionRegistry).map(([key, value]) => ({ key, label: value.label })), sections });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;

  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  if (body.action === "savePage") {
    if (typeof body.pageKey !== "string" || !Array.isArray(body.sections)) return errorResponse("Invalid page save");
    if (body.sections.some((section) => (
      !section || typeof section !== "object" || (section as Record<string, unknown>).pageKey !== body.pageKey
    ))) return errorResponse("Section page does not match pageKey");
    let order: Array<{ sectionKey: string; sortOrder: number }>;
    try {
      order = normalizePageOrder(body.pageKey, body.sections.map((section) => (
        section && typeof section === "object" ? (section as Record<string, unknown>).sectionKey : null
      )));
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Invalid page save");
    }
    const validated = body.sections.map((section) => validatePageSectionInput(section));
    const invalid = validated.find((result) => !result.ok);
    if (invalid && !invalid.ok) return errorResponse(invalid.error);
    const values = validated.map((result, index) => {
      if (!result.ok) throw new Error(result.error);
      return { ...result.value, sortOrder: order[index].sortOrder };
    });
    try {
      await prisma.$transaction(async (tx) => {
        await assertLocalMediaAssetsExist(tx, values);
        await Promise.all(values.map(({ pageKey, sectionKey, ...data }) => tx.pageSection.upsert({
          where: { pageKey_sectionKey: { pageKey, sectionKey } },
          update: data,
          create: { pageKey, sectionKey, ...data },
        })));
      });
      return NextResponse.json({ ok: true, sections: await getPageSections(body.pageKey) });
    } catch (error) {
      if (error instanceof MissingMediaAssetError) return errorResponse(error.message);
      return prismaErrorResponse(error) ?? errorResponse("服务器内部错误", 500);
    }
  }

  if (body.action === "reorder") {
    try {
      const order = normalizePageOrder(body.pageKey, body.sectionKeys);
      await prisma.$transaction(order.map(({ sectionKey, sortOrder }) => prisma.pageSection.upsert({
        where: { pageKey_sectionKey: { pageKey: body.pageKey as string, sectionKey } },
        update: { sortOrder },
        create: { pageKey: body.pageKey as string, sectionKey, sortOrder },
      })));
      return NextResponse.json({ ok: true });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Invalid section order");
    }
  }

  const result = validatePageSectionInput(body);
  if (!result.ok) return errorResponse(result.error);
  const { pageKey, sectionKey, ...data } = result.value;
  try {
    const section = await prisma.$transaction(async (tx) => {
      await assertLocalMediaAssetsExist(tx, result.value);
      return tx.pageSection.upsert({
        where: { pageKey_sectionKey: { pageKey, sectionKey } },
        update: data,
        create: { ...data, pageKey, sectionKey },
      });
    });
    return NextResponse.json({ section });
  } catch (error: unknown) {
    if (error instanceof MissingMediaAssetError) return errorResponse(error.message);
      return prismaErrorResponse(error) ?? errorResponse("服务器内部错误", 500);
  }
}

export const POST = PUT;
