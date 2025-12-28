import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

// Simple file serving for generated artifacts (images). Restrict to images folder.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("path");
  if (!target) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }
  const imagesRoot = path.join(process.cwd(), "certificate-store", "images");
  const resolved = path.resolve(target);
  if (!resolved.startsWith(imagesRoot)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  try {
    const file = await fs.promises.readFile(resolved);
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
