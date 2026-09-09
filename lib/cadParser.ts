// lib/cadParser.ts
//
// PURPOSE
// Best-effort extraction of technical specifications (material callouts,
// tolerances, surface finish, overall dimensions, and process/operation
// hints) from an uploaded CAD drawing file, so ComponentForm can pre-fill
// its fields and ProcessForm can pre-fill a suggested process description
// instead of the user starting from a blank form every time.
//
// This is intentionally NOT a full CAD kernel and NOT an LLM call — in
// keeping with the rest of the app (see lib/processParser.ts), extraction
// is deterministic, offline, and heuristic. Everything it produces is a
// *suggestion*: every field it fills in the UI stays fully editable, and
// the process page always keeps a "write it yourself" path available.
//
// FORMAT SUPPORT
// - .dxf (ASCII DXF, R12 and later): DXF is an open, documented tag/value
//   text format. We do a real (if partial) parse of the HEADER section
//   (for $EXTMIN/$EXTMAX/$INSUNITS -> overall bounding-box dimensions) and
//   the ENTITIES section (for TEXT/MTEXT/DIMENSION string content, e.g.
//   title-block callouts like "MATERIAL: 6061-T6" or "Ra 1.6"). Binary
//   DXF is not supported (rare in practice).
// - .dwg: DWG is Autodesk's proprietary, compressed binary format. There
//   is no legitimate way to fully decode it without Autodesk's own
//   libraries or a paid conversion service (neither of which is available
//   here). Instead we do a best-effort "string scrape": read the file's
//   version signature from its header, then scan the raw bytes for runs
//   of printable ASCII and UTF-16LE text (title blocks and many text
//   entities are often recoverable this way even though the surrounding
//   geometry data is opaque binary) and run the same keyword/pattern
//   matching over whatever text turns up. This is explicitly marked
//   low-confidence in the result — always surfaced to the user as "verify
//   before use", never auto-applied silently.
// - Anything else (step/stp/iges/stl/pdf/images): unsupported here; the
//   caller keeps its existing "stored as reference only" behavior.

import { MATERIAL_CATALOG, MaterialGrade } from "./data/materialCatalog";
import { TAXONOMY } from "./processParser";

export interface CadExtractionResult {
  supported: boolean;
  format: "dxf" | "dwg" | "unsupported";
  confidence: "high" | "low" | "none";
  notes: string[];
  suggestedMaterialGradeId: string | null;
  suggestedToleranceMm: number | null;
  suggestedSurfaceFinishRaUm: number | null;
  suggestedDimensions: { length_mm: number; width_mm: number; height_mm: number } | null;
  suggestedProcessText: string | null;
  matchedProcessLabels: string[];
  rawTextSample: string[];
}

const EMPTY_RESULT: CadExtractionResult = {
  supported: false,
  format: "unsupported",
  confidence: "none",
  notes: [],
  suggestedMaterialGradeId: null,
  suggestedToleranceMm: null,
  suggestedSurfaceFinishRaUm: null,
  suggestedDimensions: null,
  suggestedProcessText: null,
  matchedProcessLabels: [],
  rawTextSample: [],
};

// ISO 2768-1 grade values, kept in sync with the dropdown in ComponentForm.
const TOLERANCE_GRADE_VALUES = [0.05, 0.1, 0.3, 0.5];
// ISO 1302 Ra N-grade values, kept in sync with the dropdown in ComponentForm.
const ROUGHNESS_GRADE_VALUES = [0.4, 0.8, 1.6, 3.2, 6.3, 12.5];

function nearest(value: number, options: number[]): number {
  return options.reduce((best, opt) => (Math.abs(opt - value) < Math.abs(best - value) ? opt : best));
}

/** Normalizes text for loose alphanumeric matching: uppercase, strip everything but letters/digits. */
function normalize(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// A few extra match tokens per grade beyond the normalized label, to catch
// common shorthand found on real title blocks (e.g. "TI64" for Ti-6Al-4V).
const MATERIAL_ALIASES: Record<string, string[]> = {
  "ti-6al-4v": ["TI64", "TIAL4V4", "GRADE5TITANIUM"],
  "ss-316l": ["316LSTAINLESS", "SS316L"],
  "ss-304": ["304STAINLESS", "SS304"],
  "ss-17-4ph": ["174PHSTAINLESS", "17-4STAINLESS"],
  "plastic-nylon66": ["PA66", "NYLON6/6", "POLYAMIDE66"],
  "plastic-abs": ["ABSPLASTIC"],
  "steel-a36": ["A36STEEL", "MILDSTEELA36"],
  "brass-c360": ["C36000", "FREECUTTINGBRASS"],
};

function matchMaterialGrade(text: string): MaterialGrade | null {
  const norm = normalize(text);
  for (const grade of MATERIAL_CATALOG) {
    const candidates = [normalize(grade.label), normalize(grade.id), ...(MATERIAL_ALIASES[grade.id] ?? [])];
    for (const candidate of candidates) {
      // Guard against matching on very short/ambiguous tokens like "304"
      // appearing inside an unrelated number by requiring at least 3 chars.
      if (candidate.length >= 3 && norm.includes(candidate)) return grade;
    }
  }
  return null;
}

function matchTolerance(text: string): number | null {
  const m = text.match(/±\s*(\d+(?:\.\d+)?)\s*mm/i) ?? text.match(/±\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return nearest(parseFloat(m[1]), TOLERANCE_GRADE_VALUES);
}

function matchSurfaceFinish(text: string): number | null {
  const m = text.match(/\bRa\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:u|µ|micro)?m?\b/i);
  if (!m) return null;
  return nearest(parseFloat(m[1]), ROUGHNESS_GRADE_VALUES);
}

/** Scans text against the same process taxonomy used for NL parsing, in order of first appearance. */
function matchProcessKeywords(text: string): string[] {
  const found: { label: string; index: number }[] = [];
  for (const entry of TAXONOMY) {
    for (const pattern of entry.patterns) {
      const m = text.match(pattern);
      if (m && m.index !== undefined) {
        found.push({ label: entry.label, index: m.index });
        break;
      }
    }
  }
  found.sort((a, b) => a.index - b.index);
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const f of found) {
    if (!seen.has(f.label)) {
      seen.add(f.label);
      ordered.push(f.label);
    }
  }
  return ordered;
}

function buildSuggestedProcessText(labels: string[]): string | null {
  if (labels.length === 0) return null;
  // Turn "Cutting / Sawing" -> "cutting", "CNC Milling" -> "CNC milling", etc.
  // for a readable sentence, mirroring how a user would type it themselves.
  const phrase = labels
    .map((l) => l.split(" / ")[0])
    // Only lowercase the leading word if it isn't itself an acronym (e.g.
    // keep "CNC Milling" as-is, but "Cutting" -> "cutting").
    .map((l) => (/^[A-Z]{2,}/.test(l) ? l : l.charAt(0).toLowerCase() + l.slice(1)))
    .join(", ");
  return `Based on the CAD drawing: ${phrase}.`;
}

// ---------------------------------------------------------------------------
// DXF (ASCII tag/value format)
// ---------------------------------------------------------------------------

interface DxfScan {
  textStrings: string[];
  extMin: [number, number] | null;
  extMax: [number, number] | null;
  insUnitsMm: boolean | null; // true=mm, false=inch, null=unknown
}

function scanDxf(content: string): DxfScan {
  const lines = content.split(/\r\n|\r|\n/);
  const textStrings: string[] = [];
  let extMin: [number, number] | null = null;
  let extMax: [number, number] | null = null;
  let insUnitsMm: boolean | null = null;

  let inHeader = false;
  let inEntities = false;
  let currentEntity: string | null = null;
  let pendingHeaderVar: string | null = null;
  let pendingPoint: Partial<{ 10: number; 20: number }> = {};

  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    const value = lines[i + 1]?.trim() ?? "";
    if (Number.isNaN(code)) continue;

    if (code === 0) {
      if (value === "SECTION") {
        // Section name arrives on the next code-2 pair; peek ahead.
        const nextValue = lines[i + 3]?.trim();
        inHeader = nextValue === "HEADER";
        inEntities = nextValue === "ENTITIES";
        currentEntity = null;
      } else if (value === "ENDSEC") {
        inHeader = false;
        inEntities = false;
      } else if (inEntities) {
        currentEntity = value; // e.g. TEXT, MTEXT, DIMENSION, LWPOLYLINE...
      }
      continue;
    }

    if (inHeader) {
      if (code === 9) {
        pendingHeaderVar = value;
        pendingPoint = {};
      } else if (pendingHeaderVar === "$EXTMIN" || pendingHeaderVar === "$EXTMAX") {
        if (code === 10) pendingPoint[10] = parseFloat(value);
        if (code === 20) pendingPoint[20] = parseFloat(value);
        if (pendingPoint[10] !== undefined && pendingPoint[20] !== undefined) {
          const pt: [number, number] = [pendingPoint[10]!, pendingPoint[20]!];
          if (pendingHeaderVar === "$EXTMIN") extMin = pt;
          else extMax = pt;
          pendingHeaderVar = null;
        }
      } else if (pendingHeaderVar === "$INSUNITS" && code === 70) {
        // 4 = Millimeters, 1 = Inches (DXF group code reference).
        insUnitsMm = value === "4" ? true : value === "1" ? false : null;
        pendingHeaderVar = null;
      }
      continue;
    }

    if (inEntities && currentEntity) {
      if ((currentEntity === "TEXT" || currentEntity === "MTEXT") && (code === 1 || code === 3)) {
        if (value) textStrings.push(value.replace(/\\P/g, " ").replace(/\{|\}/g, ""));
      } else if (currentEntity === "DIMENSION" && code === 1 && value) {
        textStrings.push(value);
      }
    }
  }

  return { textStrings, extMin, extMax, insUnitsMm };
}

function parseDxf(content: string): CadExtractionResult {
  const scan = scanDxf(content);
  const joined = scan.textStrings.join(" \n ");
  const notes: string[] = [];

  let dims: CadExtractionResult["suggestedDimensions"] = null;
  if (scan.extMin && scan.extMax) {
    const unitScale = scan.insUnitsMm === false ? 25.4 : 1; // treat unknown as already-mm
    if (scan.insUnitsMm === null) notes.push("Drawing units ($INSUNITS) not found — assumed millimeters.");
    const lengthMm = Math.abs(scan.extMax[0] - scan.extMin[0]) * unitScale;
    const widthMm = Math.abs(scan.extMax[1] - scan.extMin[1]) * unitScale;
    if (lengthMm > 0 && widthMm > 0) {
      // DXF extents are 2D (plan view) only — height/depth isn't derivable
      // from a single view, so it's left for the user to confirm/enter.
      dims = { length_mm: round1(lengthMm), width_mm: round1(widthMm), height_mm: 0 };
      notes.push("Length/width estimated from drawing extents (2D bounding box) — height must be entered manually.");
    }
  }

  const material = matchMaterialGrade(joined);
  const tolerance = matchTolerance(joined);
  const finish = matchSurfaceFinish(joined);
  const processLabels = matchProcessKeywords(joined);

  if (scan.textStrings.length === 0) {
    notes.push("No TEXT/MTEXT/DIMENSION annotations found in the drawing — nothing to suggest from title-block text.");
  }

  return {
    supported: true,
    format: "dxf",
    confidence: scan.textStrings.length > 0 ? "high" : "low",
    notes,
    suggestedMaterialGradeId: material?.id ?? null,
    suggestedToleranceMm: tolerance,
    suggestedSurfaceFinishRaUm: finish,
    suggestedDimensions: dims,
    suggestedProcessText: buildSuggestedProcessText(processLabels),
    matchedProcessLabels: processLabels,
    rawTextSample: scan.textStrings.slice(0, 25),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// DWG (proprietary binary — heuristic string scrape only)
// ---------------------------------------------------------------------------

function extractPrintableStrings(buffer: Buffer): string[] {
  const results = new Set<string>();

  // ASCII runs (most title-block / text-entity content in older DWG
  // versions is stored close to plain ASCII).
  const ascii = buffer.toString("latin1");
  for (const m of ascii.matchAll(/[ -~]{4,}/g)) {
    const s = m[0].trim();
    if (s.length >= 4) results.add(s);
  }

  // UTF-16LE runs (newer DWG versions store some text this way).
  const utf16 = buffer.toString("utf16le");
  for (const m of utf16.matchAll(/[ -~]{4,}/g)) {
    const s = m[0].trim();
    if (s.length >= 4) results.add(s);
  }

  return Array.from(results);
}

function dwgVersionLabel(buffer: Buffer): string {
  const sig = buffer.subarray(0, 6).toString("ascii");
  const known: Record<string, string> = {
    AC1032: "AutoCAD 2018-2022",
    AC1027: "AutoCAD 2013-2017",
    AC1024: "AutoCAD 2010-2012",
    AC1021: "AutoCAD 2007-2009",
    AC1018: "AutoCAD 2004-2006",
    AC1015: "AutoCAD 2000-2002",
  };
  return known[sig] ?? sig;
}

function parseDwg(buffer: Buffer): CadExtractionResult {
  const versionLabel = dwgVersionLabel(buffer);
  const strings = extractPrintableStrings(buffer);
  const joined = strings.join(" \n ");

  const material = matchMaterialGrade(joined);
  const tolerance = matchTolerance(joined);
  const finish = matchSurfaceFinish(joined);
  const processLabels = matchProcessKeywords(joined);

  const notes = [
    `Detected format: DWG (${versionLabel}). DWG is a proprietary, compressed binary format — full geometry cannot be decoded without Autodesk's own libraries.`,
    "Text below was recovered heuristically by scanning the raw file for readable strings, so it may be incomplete, out of order, or include noise from unrelated binary data.",
    "Every suggested value is a starting point only — please verify it against the actual drawing before saving.",
  ];
  if (strings.length === 0) {
    notes.push("No readable text could be recovered from this file (it may be fully compressed) — please fill in the fields manually.");
  }

  return {
    supported: true,
    format: "dwg",
    confidence: "low",
    notes,
    suggestedMaterialGradeId: material?.id ?? null,
    suggestedToleranceMm: tolerance,
    suggestedSurfaceFinishRaUm: finish,
    // Overall dimensions aren't reliably recoverable from a binary string
    // scrape (no reliable coordinate structure survives), so DWG never
    // suggests length/width/height — only DXF's real extents parsing does.
    suggestedDimensions: null,
    suggestedProcessText: buildSuggestedProcessText(processLabels),
    matchedProcessLabels: processLabels,
    rawTextSample: strings
      .filter((s) => /[A-Za-z]/.test(s))
      .slice(0, 25),
  };
}

/**
 * Entry point: inspects the filename/extension and dispatches to the DXF
 * or DWG extractor. Returns a "not supported" result (rather than
 * throwing) for every other CAD/reference format, so callers can always
 * fall back to today's "stored as reference only" behavior.
 */
export function parseCadFile(buffer: Buffer, filename: string): CadExtractionResult {
  const ext = filename.toLowerCase().split(".").pop();
  try {
    if (ext === "dxf") {
      return parseDxf(buffer.toString("latin1"));
    }
    if (ext === "dwg") {
      return parseDwg(buffer);
    }
  } catch {
    return {
      ...EMPTY_RESULT,
      supported: false,
      notes: ["Could not parse this file — it may be corrupted or in an unsupported DXF/DWG variant. Please enter specifications manually."],
    };
  }
  return EMPTY_RESULT;
}
