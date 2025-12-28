import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import fs from "node:fs";
import path from "node:path";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const nameX = Number(form.get("nameX"));
    const nameY = Number(form.get("nameY"));
    const qrX = Number(form.get("qrX"));
    const qrY = Number(form.get("qrY"));
    const qrSizeRaw = form.get("qrSize");
    const qrSize = Math.max(64, Math.min(1024, Number(qrSizeRaw ?? 200)));
    const fontSize = Number(form.get("fontSize"));
    const fontFamilyRaw = form.get("fontFamily");
    const fontFamily = fontFamilyRaw ? String(fontFamilyRaw) : "Inter";
    const fontWeightRaw = form.get("fontWeight");
    const fontWeight = fontWeightRaw ? String(fontWeightRaw) : "600";
    const fontColorRaw = form.get("fontColor");
    const fontColor = fontColorRaw ? String(fontColorRaw) : "#000000";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    const isPng =
      (file.type && file.type.toLowerCase() === "image/png") ||
      (typeof (file as any).name === "string" &&
        (file as any).name.toLowerCase().endsWith(".png"));
    if (!isPng) {
      return NextResponse.json(
        { error: "Only PNG templates are supported" },
        { status: 400 }
      );
    }

    // Save locally under certificate-store/templates
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storeRoot = path.join(
      process.cwd(),
      "certificate-store",
      "templates"
    );
    await fs.promises.mkdir(storeRoot, { recursive: true });
    const safeName = (file as any).name?.toString?.() ?? `template.png`;
    const base = `${Date.now()}-${safeName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const fullPath = path.join(storeRoot, base);
    await fs.promises.writeFile(fullPath, buffer);

    const template = await prisma.template.create({
      data: {
        templateUrl: fullPath,
        nameX,
        nameY,
        qrX,
        qrY,
        qrSize,
        fontSize,
        fontFamily,
        fontWeight,
        fontColor,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
