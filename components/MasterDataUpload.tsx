"use client";

import { useState } from "react";
import { uploadMasterEquipmentAction, uploadMasterMaterialsAction } from "@/app/actions";

// Minimal CSV parser: handles a header row + comma-separated values, with
// basic double-quote support for fields containing commas. Not a full CSV
// spec implementation (e.g. no escaped-quote-within-quoted-field support)
// but sufficient for the simple equipment/material spec sheets this is
// meant for — same "good enough, transparent, no black box" spirit as the
// rest of the app's parsers.
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const splitLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === "," && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };
  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const values = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] ?? ""));
    return row;
  });
}

export default function MasterDataUpload() {
  const [equipStatus, setEquipStatus] = useState<string | null>(null);
  const [matStatus, setMatStatus] = useState<string | null>(null);

  async function handleEquipmentFile(file: File) {
    const rows = parseCsv(await file.text());
    const parsed = rows
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name,
        process_type: r.process_type || "milling",
        specs: Object.fromEntries(Object.entries(r).filter(([k]) => !["name", "process_type"].includes(k))),
      }));
    if (parsed.length === 0) {
      setEquipStatus("No valid rows found — expected columns: name, process_type, plus any spec columns.");
      return;
    }
    await uploadMasterEquipmentAction(parsed);
    setEquipStatus(`Uploaded ${parsed.length} equipment row(s).`);
  }

  async function handleMaterialFile(file: File) {
    const rows = parseCsv(await file.text());
    const num = (v: string) => (v && !isNaN(Number(v)) ? Number(v) : null);
    const parsed = rows
      .filter((r) => r.grade_name)
      .map((r) => ({
        grade_name: r.grade_name,
        family: r.family || null,
        tensile_strength_mpa: num(r.tensile_strength_mpa),
        yield_strength_mpa: num(r.yield_strength_mpa),
        hardness_hb: num(r.hardness_hb),
        density_g_cm3: num(r.density_g_cm3),
        typical_lead_time_days: num(r.typical_lead_time_days),
        notes: r.notes || null,
      }));
    if (parsed.length === 0) {
      setMatStatus("No valid rows found — expected columns: grade_name, family, tensile_strength_mpa, yield_strength_mpa, hardness_hb, density_g_cm3, typical_lead_time_days, notes.");
      return;
    }
    await uploadMasterMaterialsAction(parsed);
    setMatStatus(`Uploaded ${parsed.length} material row(s).`);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="card card-pad">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Master equipment list</h2>
        <p className="mb-3 text-xs text-slate-400">
          CSV columns: <code>name, process_type</code>, plus any spec columns you want (e.g. <code>tolerance_mm</code>,{" "}
          <code>envelope_mm</code>, <code>capacity_per_hr</code>). Uploaded rows add to — they don&rsquo;t replace — the
          catalog used for machine scoring.
        </p>
        <input
          type="file"
          accept=".csv"
          className="block w-full text-sm"
          onChange={(e) => e.target.files?.[0] && handleEquipmentFile(e.target.files[0])}
        />
        {equipStatus && <p className="mt-2 text-xs text-brand-700">{equipStatus}</p>}
      </section>

      <section className="card card-pad">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Master material list</h2>
        <p className="mb-3 text-xs text-slate-400">
          CSV columns: <code>grade_name, family, tensile_strength_mpa, yield_strength_mpa, hardness_hb,
          density_g_cm3, typical_lead_time_days, notes</code>.
        </p>
        <input
          type="file"
          accept=".csv"
          className="block w-full text-sm"
          onChange={(e) => e.target.files?.[0] && handleMaterialFile(e.target.files[0])}
        />
        {matStatus && <p className="mt-2 text-xs text-brand-700">{matStatus}</p>}
      </section>
    </div>
  );
}
