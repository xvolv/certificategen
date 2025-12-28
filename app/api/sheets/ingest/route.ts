import { NextResponse } from "next/server";
import { ingestStore, type IngestRow } from "@/lib/ingestStore";
import { parse as parseCsvSync } from "csv-parse/sync";

function parseSpreadsheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m?.[1] ?? null;
}

function parseGid(url: string): string {
  try {
    const u = new URL(url);
    const qGid = u.searchParams.get("gid");
    const hashGid = u.hash.match(/gid=(\d+)/)?.[1];
    return qGid ?? hashGid ?? "0";
  } catch {
    const hashGid = url.match(/gid=(\d+)/)?.[1];
    return hashGid ?? "0";
  }
}

function parseCsv(text: string): string[][] {
  // Remove BOM if present
  const cleaned = text.replace(/^\uFEFF/, "");
  const records: string[][] = parseCsvSync(cleaned, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  });
  return records;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  try {
    const { sheetUrl } = await req.json();
    if (!sheetUrl || typeof sheetUrl !== "string") {
      return NextResponse.json({ error: "sheetUrl required" }, { status: 400 });
    }
    const spreadsheetId = parseSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Invalid Google Sheets URL" },
        { status: 400 }
      );
    }
    const gid = parseGid(sheetUrl);

    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const resp = await fetch(exportUrl, { cache: "no-store" });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: `CSV export error: ${text}` },
        { status: 502 }
      );
    }
    const csv = await resp.text();
    const values = parseCsv(csv);
    if (values.length === 0) {
      return NextResponse.json({ error: "No rows found" }, { status: 400 });
    }

    const header = values[0].map((h) => h.trim().replace(/^\uFEFF/, ""));
    const findIdx = (aliases: string[]) =>
      header.findIndex((h) =>
        aliases.some((a) => h.toLowerCase() === a.toLowerCase())
      );
    const nameIdx = findIdx(["Full Name", "Name"]);
    const firstIdx = findIdx(["First Name", "First"]);
    const lastIdx = findIdx(["Last Name", "Last", "Surname"]);
    const emailIdx = findIdx(["Email Address", "Email"]);
    if (nameIdx < 0 && (firstIdx < 0 || lastIdx < 0)) {
      return NextResponse.json(
        { error: "Missing 'Full Name' or 'First Name'+'Last Name' columns" },
        { status: 400 }
      );
    }

    const rows: IngestRow[] = values
      .slice(1)
      .map((row) => {
        const fullName =
          nameIdx >= 0
            ? normalizeName(row[nameIdx] ?? "")
            : normalizeName(`${row[firstIdx] ?? ""} ${row[lastIdx] ?? ""}`);
        const emailRaw = emailIdx >= 0 ? row[emailIdx] ?? "" : "";
        const email = emailRaw.trim() || undefined;
        return { fullName, email };
      })
      .filter((r) => r.fullName.length > 0);

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows" }, { status: 400 });
    }

    const batchId = crypto.randomUUID();
    ingestStore.set(batchId, rows);

    return NextResponse.json({
      batchId,
      total: rows.length,
      preview: rows.slice(0, 10),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
