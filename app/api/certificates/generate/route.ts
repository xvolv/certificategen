import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import fs from "node:fs";
import path from "node:path";
import { ingestStore } from "@/lib/ingestStore";
import QRCode from "qrcode";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

function makeCertificateNumber(): string {
  // Simple unique format: AAU-YYYY-RAND
  const y = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 1e9)
    .toString()
    .padStart(9, "0");
  return `AAU-${y}-${rand}`;
}

export async function POST(req: Request) {
  try {
    const { batchId, templateId, rows: rowsFromClient } = await req.json();
    if (!batchId || !templateId) {
      return NextResponse.json(
        { error: "batchId and templateId required" },
        { status: 400 }
      );
    }

    // Prefer client-provided rows when present; otherwise use ingest store
    let rows = Array.isArray(rowsFromClient)
      ? rowsFromClient
      : ingestStore.get(batchId);
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows found for batch" },
        { status: 400 }
      );
    }

    const templateMetadataPath = path.join(
      process.cwd(),
      "certificate-store",
      "templates",
      `${templateId}.json`
    );

    let template;
    try {
      const metadataContent = await fs.promises.readFile(templateMetadataPath, "utf-8");
      template = JSON.parse(metadataContent);
    } catch (err) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const baseUrl = process.env.APP_URL || "http://localhost:3000";

    const results: any[] = [];

    for (const row of rows) {
      try {
        const certificateNumber = makeCertificateNumber();
        // Idempotency check
        const existing = await prisma.certificate.findUnique({
          where: { certificateNumber },
        });
        if (existing) {
          results.push({ certificateNumber, status: "skipped" });
          continue;
        }

        const verifyUrl = `${baseUrl}/verify/${encodeURIComponent(
          certificateNumber
        )}`;
        // Determine sizes and clamp positions
        const templateBuf = await fs.promises.readFile(template.templateUrl);
        const meta = await sharp(templateBuf).metadata();
        const baseW = meta.width ?? 2000;
        const baseH = meta.height ?? 2000;
        const qrSize = Math.max(
          32,
          Math.min(2048, (template as any).qrSize ?? Math.floor(baseW * 0.15))
        );
        const qrLeft = Math.min(
          Math.max(0, template.qrX),
          Math.max(0, baseW - qrSize)
        );
        const qrTop = Math.min(
          Math.max(0, template.qrY),
          Math.max(0, baseH - qrSize)
        );
        const nameLeft = Math.min(Math.max(0, template.nameX), baseW);
        const nameTop = Math.min(Math.max(0, template.nameY), baseH);
        const qrPng = await QRCode.toBuffer(verifyUrl, { width: qrSize });

        // Build an SVG overlay for text
        const baselineDy = Math.round(template.fontSize * 0.12);
        const svg = Buffer.from(
          `<svg width="${baseW}" height="${baseH}" xmlns="http://www.w3.org/2000/svg">
            <style>
              .name { font-family: '${template.fontFamily}'; font-size: ${template.fontSize
          }px; font-weight: ${(template as any).fontWeight || "600"}; fill: ${(template as any).fontColor || "#000000"
          }; text-anchor: middle; dominant-baseline: central; }
            </style>
            <text x="${nameLeft}" y="${nameTop}" dy="${baselineDy}" class="name" text-anchor="middle" dominant-baseline="central">${escapeHtml(
            row.fullName
          )}</text>
          </svg>`
        );

        // Compose background + qr + text overlays
        const pngOut = await sharp(templateBuf)
          .composite([
            { input: svg, left: 0, top: 0 },
            { input: qrPng, left: qrLeft, top: qrTop },
          ])
          .png()
          .toBuffer();

        // ===== PDF GENERATION DISABLED =====
        // Uncomment below if you need PDF files in the future
        /*
        // Create PDF via pdf-lib with the PNG embedded full-page
        const pdfDoc = await PDFDocument.create();
        const pngImage = await pdfDoc.embedPng(pngOut);
        const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: pngImage.width,
          height: pngImage.height,
        });
        const pdfOut = await pdfDoc.save();
        */

        // Save outputs locally
        const imagesDir = path.join(
          process.cwd(),
          "certificate-store",
          "images"
        );
        // const pdfsDir = path.join(process.cwd(), "certificate-store", "pdfs");
        await fs.promises.mkdir(imagesDir, { recursive: true });
        // await fs.promises.mkdir(pdfsDir, { recursive: true });
        const fileBase = `${certificateNumber}`;
        const imagePath = path.join(imagesDir, `${fileBase}.png`);
        // const pdfPath = path.join(pdfsDir, `${fileBase}.pdf`);
        await fs.promises.writeFile(imagePath, pngOut);
        // await fs.promises.writeFile(pdfPath, pdfOut);

        const created = await prisma.certificate.create({
          data: {
            fullName: row.fullName,
            email: row.email ?? null,
            certificateNumber,
            qrData: verifyUrl,
            imagePath: imagePath,
          },
        });

        results.push({
          certificateNumber,
          status: "created",
          id: created.id,
          fullName: row.fullName,
          imageUrl: imagePath,
          // pdfUrl: pdfPath, // PDF generation disabled
        });
      } catch (err: any) {
        console.error("Certificate generation error for", row.fullName, ":", err);
        results.push({
          fullName: row.fullName,
          status: "error",
          error: err?.message || "Unknown error",
        });
        continue;
      }
    }

    // Clear batch only if this request consumed the ingest store (no client rows)
    if (!Array.isArray(rowsFromClient)) {
      ingestStore.clear(batchId);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string) {
  return str.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!)
  );
}

// No Cloudinary: files are saved locally in certificate-store
