"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PreviewRow = { fullName: string; email?: string };
type PlacementSnapshot = {
  nameX: number;
  nameY: number;
  qrX: number;
  qrY: number;
  fontSize: number;
  qrSize: number;
  fontFamily: string;
  fontWeight: string;
  fontColor: string;
  sampleName: string;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/60 bg-white/60 p-5 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function Home() {
  // Data Source
  const [sheetUrl, setSheetUrl] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [allRows, setAllRows] = useState<PreviewRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  // Template
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [nameX, setNameX] = useState(300);
  const [nameY, setNameY] = useState(300);
  const [qrX, setQrX] = useState(100);
  const [qrY, setQrY] = useState(100);
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontWeight, setFontWeight] = useState("600");
  const [fontColor, setFontColor] = useState("#000000");
  const [sampleName, setSampleName] = useState("Jane Doe");
  const [qrSize, setQrSize] = useState(200);
  const [savedPlacement, setSavedPlacement] =
    useState<PlacementSnapshot | null>(null);
  const [lastPreview, setLastPreview] = useState<{
    imageUrl: string;
    certificateNumber: string;
    fullName: string;
  } | null>(null);
  const [statusOne, setStatusOne] = useState<{
    state: "idle" | "loading" | "done" | "error";
    message?: string;
  }>({ state: "idle" });
  const [statusTen, setStatusTen] = useState<{
    state: "idle" | "loading" | "done" | "error";
    created?: number;
    errors?: number;
    message?: string;
  }>({ state: "idle" });
  const [statusAll, setStatusAll] = useState<{
    state: "idle" | "loading" | "done" | "error";
    created?: number;
    errors?: number;
    message?: string;
  }>({ state: "idle" });
  const [customMessage, setCustomMessage] = useState(
    "We are pleased to present you with your certificate from Addis Ababa University Technology club workshop team!"
  );
  const [emailStatus, setEmailStatus] = useState<{
    state: "idle" | "loading" | "done" | "error";
    sent?: number;
    failed?: number;
    message?: string;
  }>({ state: "idle" });
  const [emailLogs, setEmailLogs] = useState<Array<{
    fullName: string;
    email?: string;
    status: "sent" | "skipped" | "failed" | "error";
    reason?: string;
    error?: string;
  }>>([]);
  const [emailFilter, setEmailFilter] = useState<"all" | "sent" | "skipped" | "failed">("all");

  // Live preview helpers
  const objectUrl = useMemo(
    () => (templateFile ? URL.createObjectURL(templateFile) : null),
    [templateFile]
  );
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fullContainerRef = useRef<HTMLDivElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [placeMode, setPlaceMode] = useState<"name" | "qr">("name");
  const [dragging, setDragging] = useState<"name" | "qr" | null>(null);
  const [showFull, setShowFull] = useState(false);
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);
  useEffect(() => {
    if (preview && preview.length > 0) {
      setSampleName(preview[0].fullName || "");
    }
  }, [preview]);
  useEffect(() => {
    if (objectUrl) setShowFull(true);
  }, [objectUrl]);

  function mapToDisplay(x: number, y: number) {
    const container = fullContainerRef.current;
    if (!container || !naturalSize) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const scale = Math.min(
      rect.width / naturalSize.w,
      rect.height / naturalSize.h
    );
    const dispW = naturalSize.w * scale;
    const dispH = naturalSize.h * scale;
    const offsetX = (rect.width - dispW) / 2;
    const offsetY = (rect.height - dispH) / 2;
    return {
      x: Math.round(offsetX + x * scale),
      y: Math.round(offsetY + y * scale),
    };
  }
  function displayToPixel(displayX: number, displayY: number) {
    const container = fullContainerRef.current;
    if (!container || !naturalSize) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const scale = Math.min(
      rect.width / naturalSize.w,
      rect.height / naturalSize.h
    );
    const dispW = naturalSize.w * scale;
    const dispH = naturalSize.h * scale;
    const offsetX = (rect.width - dispW) / 2;
    const offsetY = (rect.height - dispH) / 2;
    const pxX = Math.round((displayX - offsetX) / scale);
    const pxY = Math.round((displayY - offsetY) / scale);
    return { x: Math.max(0, pxX), y: Math.max(0, pxY) };
  }

  function getDisplayScale() {
    const container = fullContainerRef.current;
    if (!container || !naturalSize) return 1;
    const rect = container.getBoundingClientRect();
    return Math.min(rect.width / naturalSize.w, rect.height / naturalSize.h);
  }

  useEffect(() => {
    if (!showFull) return;
    const handler = (e: KeyboardEvent) => {
      if (!naturalSize) return;
      const step = e.shiftKey ? 10 : 2;
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowUp") dy = -step;
      if (e.key === "ArrowDown") dy = step;
      if (e.key === "ArrowLeft") dx = -step;
      if (e.key === "ArrowRight") dx = step;
      if (!dx && !dy) return;
      e.preventDefault();
      const clamp = (val: number, max: number) =>
        Math.max(0, Math.min(val, max));
      if (placeMode === "name") {
        setNameX((x) => clamp(x + dx, naturalSize.w));
        setNameY((y) => clamp(y + dy, naturalSize.h));
      } else {
        const qrMax = Math.max(0, naturalSize.w - qrSize);
        const qrMaxY = Math.max(0, naturalSize.h - qrSize);
        setQrX((x) => clamp(x + dx, qrMax));
        setQrY((y) => clamp(y + dy, qrMaxY));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showFull, placeMode, naturalSize, qrSize]);

  const [log, setLog] = useState<string[]>([]);

  async function ingestSheet() {
    setLog((l) => [...l, "Reading Google Sheet..."]);
    const res = await fetch("/api/sheets/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLog((l) => [...l, `Error: ${data.error}`]);
      return;
    }
    setBatchId(data.batchId);
    setPreview(data.preview ?? []);
    setAllRows(data.rows ?? []);
    setTotal(data.total ?? 0);
    setLog((l) => [...l, `Loaded ${data.total} rows`]);
  }

  async function uploadTemplate() {
    if (!templateFile) {
      setLog((l) => [...l, "Select a template file first"]);
      return;
    }
    if (!naturalSize) {
      setLog((l) => [...l, "Template hasn't loaded yet. Please wait."]);
      return;
    }
    const fd = new FormData();
    fd.append("file", templateFile);
    fd.append("nameX", String(nameX));
    fd.append("nameY", String(nameY));
    fd.append("qrX", String(qrX));
    fd.append("qrY", String(qrY));
    fd.append("fontSize", String(fontSize));
    fd.append("qrSize", String(qrSize));
    fd.append("fontFamily", fontFamily);
    fd.append("fontWeight", fontWeight);
    fd.append("fontColor", fontColor);

    setLog((l) => [...l, "Uploading template..."]);
    const res = await fetch("/api/templates", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setLog((l) => [...l, `Error: ${data.error}`]);
      return;
    }
    setTemplateId(data.template.id);
    setSavedPlacement({
      nameX,
      nameY,
      qrX,
      qrY,
      fontSize,
      qrSize,
      fontFamily,
      fontWeight,
      fontColor,
      sampleName,
    });
    setLog((l) => [...l, `Template saved: ${data.template.id}`]);
  }
  async function generateCertificates(limit?: number) {
    if (!batchId || !templateId) {
      setLog((l) => [...l, "Ingest sheet and upload template first"]);
      if (limit)
        setStatusTen({ state: "error", message: "Load sheet & template" });
      else setStatusAll({ state: "error", message: "Load sheet & template" });
      return;
    }

    const rowsToProcess = limit ? allRows.slice(0, limit) : allRows;

    if (limit) setStatusTen({ state: "loading" });
    else {
      setStatusAll({
        state: "loading",
        created: 0,
        errors: 0,
        message: "Starting chunked generation...",
      });
    }

    setLog((l) => [
      ...l,
      `Generating ${rowsToProcess.length} certificates in chunks...`,
    ]);

    const chunkSize = 10;
    const totalProcessed: any[] = [];
    let totalCreated = 0;
    let totalErrorCount = 0;

    for (let i = 0; i < rowsToProcess.length; i += chunkSize) {
      const chunk = rowsToProcess.slice(i, i + chunkSize);
      const chunkNum = Math.floor(i / chunkSize) + 1;
      const totalChunks = Math.ceil(rowsToProcess.length / chunkSize);

      if (!limit) {
        setStatusAll((s) => ({
          ...s,
          message: `Processing chunk ${chunkNum}/${totalChunks}...`,
        }));
      }

      setLog((l) => [...l, `Processing chunk ${chunkNum}/${totalChunks}...`]);

      try {
        const res = await fetch("/api/certificates/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId,
            templateId,
            rows: chunk,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Chunk generation failed");
        }

        const results = data.results ?? [];
        totalProcessed.push(...results);

        const chunkCreated = results.filter(
          (r: any) => r.status === "created"
        ).length;
        const chunkErrors = results.filter((r: any) => r.status === "error");

        totalCreated += chunkCreated;
        totalErrorCount += chunkErrors.length;

        // Show preview of the first generated certificate in the FIRST chunk
        if (i === 0) {
          const firstCreated = results.find((r: any) => r.status === "created");
          if (firstCreated) {
            setLastPreview({
              imageUrl: firstCreated.imageUrl,
              certificateNumber: firstCreated.certificateNumber,
              fullName: firstCreated.fullName || "Unknown",
            });
            setLog((l) => [...l, `Preview: ${firstCreated.certificateNumber}`]);
          }
        }

        if (chunkErrors.length) {
          for (const err of chunkErrors) {
            setLog((l) => [...l, `Row '${err.fullName}': ${err.error}`]);
          }
        }

        // Update progress UI
        if (limit) {
          setStatusTen({
            state: i + chunkSize >= rowsToProcess.length ? "done" : "loading",
            created: totalCreated,
            errors: totalErrorCount,
          });
        } else {
          setStatusAll({
            state: i + chunkSize >= rowsToProcess.length ? "done" : "loading",
            created: totalCreated,
            errors: totalErrorCount,
            message:
              i + chunkSize >= rowsToProcess.length
                ? `Finished all chunks.`
                : `Progress: ${Math.min(i + chunkSize, rowsToProcess.length)}/${rowsToProcess.length}`,
          });
        }
      } catch (err: any) {
        setLog((l) => [...l, `Error in chunk ${chunkNum}: ${err.message}`]);
        if (limit) {
          setStatusTen({ state: "error", message: err.message });
        } else {
          setStatusAll((s) => ({
            ...s,
            state: "error",
            message: `Stopped at chunk ${chunkNum}: ${err.message}`,
          }));
        }
        return; // Stop processing further chunks on error
      }
    }

    setLog((l) => [
      ...l,
      `Batch finished. Total: ${totalCreated} success, ${totalErrorCount} errors.`,
    ]);
  }

  async function generateOne() {
    if (!templateId) {
      setLog((l) => [...l, "Upload template first"]);
      setStatusOne({ state: "error", message: "Upload template first" });
      return;
    }
    if (preview.length === 0) {
      setLog((l) => [...l, "Load sheet to pick a row"]);
      setStatusOne({ state: "error", message: "Load sheet to pick a row" });
      return;
    }
    const singleRow = preview[0];
    setStatusOne({
      state: "loading",
      message: `Generating preview for ${singleRow.fullName}...`,
    });
    setLog((l) => [...l, `Generating preview for ${singleRow.fullName}...`]);
    const res = await fetch("/api/certificates/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchId: batchId ?? "preview-batch",
        templateId,
        rows: [singleRow],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLog((l) => [...l, `Error: ${data.error}`]);
      setStatusOne({ state: "error", message: String(data.error || "Error") });
      return;
    }
    const result = (data.results ?? [])[0];
    if (result?.status === "created") {
      setLastPreview({
        imageUrl: result.imageUrl,
        certificateNumber: result.certificateNumber,
        fullName: singleRow.fullName,
      });
      setLog((l) => [...l, `Preview ready: ${result.certificateNumber}`]);
      setStatusOne({ state: "done", message: "Preview complete" });
    } else {
      setLog((l) => [...l, "Preview generation failed"]);
      setStatusOne({ state: "error", message: "Preview generation failed" });
    }
  }

  async function sendEmails() {
    if (!batchId || preview.length === 0) {
      setLog((l) => [...l, "No certificates to send emails for"]);
      setEmailStatus({ state: "error", message: "No certificates loaded" });
      return;
    }

    setEmailStatus({ state: "loading" });
    setLog((l) => [...l, "Fetching certificates from database..."]);

    // Fetch all certificates for this batch
    const res = await fetch("/api/certificates/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId }),
    });

    if (!res.ok) {
      setLog((l) => [...l, "Error fetching certificates"]);
      setEmailStatus({ state: "error", message: "Failed to fetch certificates" });
      return;
    }

    const data = await res.json();
    const certificateIds = (data.certificates || []).map((c: any) => c.id);

    if (certificateIds.length === 0) {
      setLog((l) => [...l, "No certificates found to send"]);
      setEmailStatus({ state: "error", message: "No certificates found" });
      return;
    }

    setLog((l) => [...l, `Sending emails to ${certificateIds.length} recipients...`]);

    const emailRes = await fetch("/api/certificates/send-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificateIds, customMessage }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      setLog((l) => [...l, `Error: ${emailData.error}`]);
      setEmailStatus({ state: "error", message: String(emailData.error) });
      return;
    }

    const summary = emailData.summary || {};
    const results = emailData.results || [];

    // Populate email logs
    setEmailLogs(results.map((r: any) => ({
      fullName: r.fullName,
      email: r.email,
      status: r.status,
      reason: r.reason,
      error: r.error,
    })));

    setLog((l) => [
      ...l,
      `Emails sent: ${summary.sent || 0} successful, ${summary.failed || 0} failed, ${summary.skipped || 0} skipped`,
    ]);
    setEmailStatus({
      state: "done",
      sent: summary.sent,
      failed: summary.failed,
    });
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
      <div className="w-full px-6 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              AAU Certificates Admin
            </h1>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Section title="Data Source">
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Paste Google Sheets URL"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
            />
            <button
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              onClick={ingestSheet}
            >
              Load Sheet
            </button>
            {total !== null && (
              <div className="text-sm text-zinc-700 dark:text-zinc-300">
                Total rows detected: {total}
              </div>
            )}
            {preview.length > 0 && (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-white/70 p-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <span>Loaded rows</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                    {preview.length}
                  </span>
                </div>
                <div className="max-h-48 overflow-auto">
                  <ul className="space-y-2 text-sm">
                    {preview.map((r, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-zinc-100 bg-white px-3 py-2 shadow-[0_1px_1px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900/80"
                      >
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {r.fullName}
                        </div>
                        {r.email && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {r.email}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Section>

          <Section title="Certificate Template (PNG)">
            <div className="space-y-2">
              <input
                type="file"
                accept="image/png"
                onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
              />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Upload a PNG certificate template for best results. PDF templates
                are not supported.
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
                Edits are applied only after selecting "Use This Template" in the
                editor.
              </p>
              {/* Full-screen positioning opens automatically when a template is chosen */}
              {objectUrl && (
                <button
                  className="mt-2 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                  onClick={() => setShowFull(true)}
                >
                  Edit Positioning (Full Screen)
                </button>
              )}
              {templateId && (
                <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  Template uploaded. Open the editor to adjust placements and
                  font.
                </div>
              )}
            </div>
            {/* Removed small preview; full-screen positioning is the primary view */}
          </Section>

          {showFull && objectUrl && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
              <div className="absolute left-0 right-0 top-0 flex items-center justify-between bg-black/50 px-4 py-3 text-white">
                <div className="flex items-center gap-3 text-sm">
                  <span>Drag markers to position</span>
                  <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
                    <span className="px-2 text-xs opacity-80">Position:</span>
                    <button
                      className={`rounded-full px-3 py-1 text-xs ${placeMode === "name"
                        ? "bg-white text-black"
                        : "bg-transparent hover:bg-white/20"
                        }`}
                      onClick={() => setPlaceMode("name")}
                      title="Position Name"
                    >
                      Name
                    </button>
                    <button
                      className={`rounded-full px-3 py-1 text-xs ${placeMode === "qr"
                        ? "bg-white text-black"
                        : "bg-transparent hover:bg-white/20"
                        }`}
                      onClick={() => setPlaceMode("qr")}
                      title="Position QR"
                    >
                      QR
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-xs opacity-80">Font size</span>
                    <input
                      className="h-1.5 w-40 cursor-pointer appearance-none rounded bg-white/30 accent-white"
                      type="range"
                      min={16}
                      max={120}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                    />
                    <span className="text-xs opacity-80 w-8 text-right">
                      {fontSize}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-xs opacity-80">QR size</span>
                    <input
                      className="h-1.5 w-40 cursor-pointer appearance-none rounded bg-white/30 accent-white"
                      type="range"
                      min={64}
                      max={600}
                      value={qrSize}
                      onChange={(e) => setQrSize(Number(e.target.value))}
                    />
                    <span className="text-xs opacity-80 w-10 text-right">
                      {qrSize}
                    </span>
                  </div>
                  <label className="hidden sm:flex items-center gap-2 text-xs opacity-80">
                    Weight
                    <select
                      className="rounded bg-white/20 px-2 py-1 text-xs text-white hover:bg-white/30"
                      value={fontWeight}
                      onChange={(e) => setFontWeight(e.target.value)}
                    >
                      <option value="400" className="text-black">
                        Normal
                      </option>
                      <option value="600" className="text-black">
                        Semi-bold
                      </option>
                      <option value="700" className="text-black">
                        Bold
                      </option>
                    </select>
                  </label>
                  <label className="hidden sm:flex items-center gap-2 text-xs opacity-80">
                    Color
                    <input
                      type="color"
                      className="h-7 w-10 cursor-pointer rounded border border-white/40 bg-white/10"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                    />
                  </label>
                  <button
                    className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700"
                    onClick={async () => {
                      await uploadTemplate();
                      setShowFull(false);
                    }}
                  >
                    Use This Template
                  </button>
                  <button
                    className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
                    onClick={() => setShowFull(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="absolute inset-0 top-12 p-4">
                <div
                  ref={fullContainerRef}
                  className="relative h-full w-full overflow-hidden rounded-lg border border-white/20"
                  onMouseMove={(e) => {
                    if (!dragging) return;
                    const pos = displayToPixel(e.clientX, e.clientY);
                    if (dragging === "name") {
                      setNameX(pos.x);
                      setNameY(pos.y);
                    } else {
                      setQrX(pos.x);
                      setQrY(pos.y);
                    }
                  }}
                  onMouseUp={() => setDragging(null)}
                  onMouseLeave={() => setDragging(null)}
                  onClick={(e) => {
                    const container = fullContainerRef.current;
                    if (!container || !naturalSize) return;
                    const rect = container.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const clickY = e.clientY - rect.top;
                    const scale = Math.min(
                      rect.width / naturalSize.w,
                      rect.height / naturalSize.h
                    );
                    const dispW = naturalSize.w * scale;
                    const dispH = naturalSize.h * scale;
                    const offsetX = (rect.width - dispW) / 2;
                    const offsetY = (rect.height - dispH) / 2;
                    const pxX = Math.round((clickX - offsetX) / scale);
                    const pxY = Math.round((clickY - offsetY) / scale);
                    if (placeMode === "name") {
                      setNameX(Math.max(0, pxX));
                      setNameY(Math.max(0, pxY));
                    } else {
                      setQrX(Math.max(0, pxX));
                      setQrY(Math.max(0, pxY));
                    }
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={objectUrl}
                    alt="Template Full Preview"
                    className="h-full w-full object-contain"
                    onLoad={(e) => {
                      setNaturalSize({
                        w: e.currentTarget.naturalWidth,
                        h: e.currentTarget.naturalHeight,
                      });
                    }}
                  />
                  <div className="absolute inset-0">
                    {(() => {
                      const namePos = mapToDisplay(nameX, nameY);
                      const qrPos = mapToDisplay(qrX, qrY);
                      const scale = getDisplayScale();
                      const baselineDy = Math.round(fontSize * 0.12) * scale;
                      const qrDisp = Math.max(8, qrSize * scale);
                      return (
                        <>
                          <div
                            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move rounded px-1 text-xs font-semibold leading-none whitespace-nowrap drop-shadow ${placeMode === "name" ? "scale-105" : "opacity-90"
                              }`}
                            style={{
                              left: namePos.x,
                              top: namePos.y + baselineDy,
                              fontSize: `${fontSize * scale}px`,
                              fontFamily,
                              fontWeight,
                              color: fontColor,
                            }}
                            onMouseDown={() => {
                              setPlaceMode("name");
                              setDragging("name");
                            }}
                          >
                            {sampleName}
                          </div>
                          <div
                            className={`absolute cursor-move rounded border-2 border-indigo-500/80 bg-indigo-500/20 text-[10px] text-white ${placeMode === "qr" ? "ring-2 ring-white" : ""
                              }`}
                            style={{
                              left: qrPos.x,
                              top: qrPos.y,
                              width: qrDisp,
                              height: qrDisp,
                            }}
                            onMouseDown={() => {
                              setPlaceMode("qr");
                              setDragging("qr");
                            }}
                            title="QR position and size"
                          />
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Section title="Generate Certificates">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Creates PNG + PDF and stores them locally.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                onClick={generateOne}
              >
                Generate One (preview)
              </button>
              <button
                className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                onClick={() => generateCertificates(10)}
              >
                Generate 10 at a time
              </button>
              <button
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                onClick={() => generateCertificates()}
              >
                Generate All
              </button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 bg-white/80 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/70">
                <div className="font-semibold text-zinc-700 dark:text-zinc-200">
                  Preview
                </div>
                {statusOne.state === "idle" && (
                  <div className="text-zinc-500 dark:text-zinc-400">Idle</div>
                )}
                {statusOne.state === "loading" && (
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-indigo-700 border-t-transparent dark:border-indigo-300"></span>
                    <span>{statusOne.message ?? "Generating preview..."}</span>
                  </div>
                )}
                {statusOne.state === "done" && (
                  <div className="text-emerald-700 dark:text-emerald-300">
                    Complete
                  </div>
                )}
                {statusOne.state === "error" && (
                  <div className="text-red-600 dark:text-red-400">
                    {statusOne.message ?? "Error"}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white/80 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/70">
                <div className="font-semibold text-zinc-700 dark:text-zinc-200">
                  Batch x10
                </div>
                {statusTen.state === "idle" && (
                  <div className="text-zinc-500 dark:text-zinc-400">Idle</div>
                )}
                {statusTen.state === "loading" && (
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-700 border-t-transparent dark:border-amber-300"></span>
                    <span>Generating 10...</span>
                  </div>
                )}
                {statusTen.state === "done" && (
                  <div className="text-emerald-700 dark:text-emerald-300">
                    Complete ({statusTen.created ?? 0} created
                    {typeof statusTen.errors === "number" && statusTen.errors > 0
                      ? `, ${statusTen.errors} errors`
                      : ""}
                    )
                  </div>
                )}
                {statusTen.state === "error" && (
                  <div className="text-red-600 dark:text-red-400">
                    {statusTen.message ?? "Error"}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white/80 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/70">
                <div className="font-semibold text-zinc-700 dark:text-zinc-200">
                  All
                </div>
                {statusAll.state === "idle" && (
                  <div className="text-zinc-500 dark:text-zinc-400">Idle</div>
                )}
                {statusAll.state === "loading" && (
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent dark:border-emerald-300"></span>
                    <span>Generating all...</span>
                  </div>
                )}
                {statusAll.state === "done" && (
                  <div className="text-emerald-700 dark:text-emerald-300">
                    Complete ({statusAll.created ?? 0} created
                    {typeof statusAll.errors === "number" && statusAll.errors > 0
                      ? `, ${statusAll.errors} errors`
                      : ""}
                    )
                  </div>
                )}
                {statusAll.state === "error" && (
                  <div className="text-red-600 dark:text-red-400">
                    {statusAll.message ?? "Error"}
                  </div>
                )}
              </div>
            </div>

            {lastPreview && (
              <div className="mt-4 rounded-xl border border-zinc-200 bg-white/80 p-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Last preview
                    </div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {lastPreview.fullName}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {lastPreview.certificateNumber}
                    </div>
                  </div>
                  <a
                    className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                    href={`/api/files?path=${encodeURIComponent(
                      lastPreview.imageUrl
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open image
                  </a>
                </div>
                <div className="mt-2 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <img
                    src={`/api/files?path=${encodeURIComponent(
                      lastPreview.imageUrl
                    )}`}
                    alt="Generated preview"
                    className="w-full max-h-80 object-contain"
                  />
                </div>
              </div>
            )}
          </Section>
        </div>

        <div className="w-full px-6 py-8 border-y border-zinc-200 bg-zinc-100/30 dark:border-zinc-800 dark:bg-zinc-900/20">
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Send Emails">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Send generated certificates to recipients via email with a custom message.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Custom Message
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                    rows={4}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Enter a custom congratulations message..."
                  />
                </div>
                <button
                  className="w-full inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                  onClick={sendEmails}
                  disabled={emailStatus.state === "loading"}
                >
                  {emailStatus.state === "loading" ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      Sending...
                    </>
                  ) : (
                    "📧 Send Emails to All"
                  )}
                </button>
                <div className="rounded-lg border border-zinc-200 bg-white/80 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/70">
                  <div className="font-semibold text-zinc-700 dark:text-zinc-200">
                    Email Status
                  </div>
                  {emailStatus.state === "idle" && (
                    <div className="text-zinc-500 dark:text-zinc-400">Ready to send</div>
                  )}
                  {emailStatus.state === "loading" && (
                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                      <span>Sending in progress...</span>
                    </div>
                  )}
                  {emailStatus.state === "done" && (
                    <div className="text-emerald-700 dark:text-emerald-300">
                      ✅ Sent: {emailStatus.sent || 0} | Failed: {emailStatus.failed || 0}
                    </div>
                  )}
                  {emailStatus.state === "error" && (
                    <div className="text-red-600 dark:text-red-400">
                      {emailStatus.message || "Error"}
                    </div>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Email Logs">
              <div className="flex flex-col h-full">
                <div className="mb-4 flex flex-wrap gap-2">
                  {(["all", "sent", "skipped", "failed"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setEmailFilter(f)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition ${emailFilter === f
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="flex-1 rounded-lg border border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/70">
                  {emailLogs.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                      No logs yet. Send emails to see results.
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-auto p-2 space-y-2">
                      {emailLogs
                        .filter(l => emailFilter === "all" || l.status === (emailFilter as any))
                        .map((log, idx) => (
                          <div
                            key={idx}
                            className={`flex items-start justify-between rounded-lg border px-3 py-2 text-xs ${log.status === "sent"
                              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
                              : log.status === "skipped"
                                ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
                                : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                              }`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {log.fullName}
                              </div>
                              {log.email && (
                                <div className="text-zinc-600 dark:text-zinc-400">
                                  {log.email}
                                </div>
                              )}
                              {(log.reason || log.error) && (
                                <div className="mt-1 text-zinc-400 dark:text-zinc-500 italic">
                                  {log.reason || log.error}
                                </div>
                              )}
                            </div>
                            <div
                              className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${log.status === "sent"
                                ? "bg-emerald-600 text-white"
                                : log.status === "skipped"
                                  ? "bg-amber-600 text-white"
                                  : "bg-red-600 text-white"
                                }`}
                            >
                              {log.status.toUpperCase()}
                            </div>
                          </div>
                        ))}
                      {emailLogs.filter(l => emailFilter === "all" || l.status === (emailFilter as any)).length === 0 && (
                        <div className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                          No {emailFilter} logs found.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Section>
          </div>
        </div>

        <div className="w-full px-6 py-8">
          <Section title="Activity">
            <div className=" rounded-xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
              <div className="max-h-80 overflow-auto">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {log.length === 0 && (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      No activity yet.
                    </div>
                  )}
                  {log.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-white px-3 py-2 text-sm shadow-[0_1px_1px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-zinc-800 dark:text-zinc-100">
                        {entry}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
