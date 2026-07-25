"use client";

import { useState } from "react";
import { createComponentAction } from "@/app/actions";
import { MATERIAL_CATALOG, MATERIAL_FAMILIES, getMaterialGrade } from "@/lib/data/materialCatalog";

// ISO 2768-1 general tolerance grades, simplified to a single representative
// value per grade rather than the full length-range table. ISO 2768-1
// actually defines a tolerance that varies with the nominal dimension
// range (e.g. grade "m" is +/-0.1mm for 6-30mm but +/-0.2mm for 30-120mm).
// Modeling the full table would require asking for a nominal-dimension
// bucket the user doesn't otherwise need, so this uses one defensible
// representative value per grade (based on the ~30-120mm range, a common
// bracket for machined parts) and documents the simplification here and in
// the UI. The dropdown value is the numeric mm figure carried straight
// into the tolerance_mm form field.
const TOLERANCE_GRADES = [
  { value: 0.05, label: "f — fine (ISO 2768-1, ±0.05 mm typ.)" },
  { value: 0.1, label: "m — medium (ISO 2768-1, ±0.1 mm typ.)" },
  { value: 0.3, label: "c — coarse (ISO 2768-1, ±0.3 mm typ.)" },
  { value: 0.5, label: "v — very coarse (ISO 2768-1, ±0.5 mm typ.)" },
];

// Standard Ra roughness grade numbers per ISO 1302 (N-grade series).
const ROUGHNESS_GRADES = [
  { value: 0.4, label: "N5 — 0.4 µm Ra (fine ground / lapped)" },
  { value: 0.8, label: "N6 — 0.8 µm Ra (fine ground)" },
  { value: 1.6, label: "N7 — 1.6 µm Ra (fine machined)" },
  { value: 3.2, label: "N8 — 3.2 µm Ra (standard machined)" },
  { value: 6.3, label: "N9 — 6.3 µm Ra (medium machined)" },
  { value: 12.5, label: "N10 — 12.5 µm Ra (rough machined)" },
];

export default function ComponentForm({ projectId }: { projectId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [gradeId, setGradeId] = useState<string>("al-6061-t6");
  const initialGrade = getMaterialGrade("al-6061-t6")!;
  const [tensile, setTensile] = useState(initialGrade.tensile_strength_mpa);
  const [yieldStrength, setYieldStrength] = useState(initialGrade.yield_strength_mpa);
  const [hardness, setHardness] = useState<number | null>(initialGrade.hardness_hb);
  const [hardnessNote, setHardnessNote] = useState<string | undefined>(initialGrade.hardness_note);
  const [density, setDensity] = useState(initialGrade.density_g_cm3);

  function handleGradeChange(id: string) {
    setGradeId(id);
    const grade = getMaterialGrade(id);
    if (!grade) return;
    setTensile(grade.tensile_strength_mpa);
    setYieldStrength(grade.yield_strength_mpa);
    setHardness(grade.hardness_hb);
    setHardnessNote(grade.hardness_note);
    setDensity(grade.density_g_cm3);
  }

  const selectedGrade = getMaterialGrade(gradeId);

  return (
    <form
      action={async (formData) => {
        setSubmitting(true);
        await createComponentAction(projectId, formData);
      }}
      className="space-y-6"
    >
      <section className="card card-pad space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">1. Component &amp; CAD reference</h2>
        <div>
          <label className="label" htmlFor="name">
            Component name
          </label>
          <input required id="name" name="name" className="input" placeholder="e.g. Mounting Bracket Rev C" />
        </div>
        <div>
          <label className="label" htmlFor="cad_file">
            CAD drawing reference (file upload)
          </label>
          <input
            id="cad_file"
            name="cad_file"
            type="file"
            accept=".step,.stp,.iges,.igs,.stl,.pdf,.dwg,.dxf,.png,.jpg"
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          <p className="mt-1 text-xs text-slate-400">
            Stored as a reference file only — CAD geometry is not parsed. Enter derived dimensions manually below.
            {fileName && <span className="ml-1 font-medium text-slate-600">Selected: {fileName}</span>}
          </p>
        </div>
      </section>

      <section className="card card-pad space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">2. Material parameters</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label" htmlFor="material_grade">
              Material grade
            </label>
            <select
              id="material_grade"
              className="input"
              value={gradeId}
              onChange={(e) => handleGradeChange(e.target.value)}
            >
              {MATERIAL_FAMILIES.map((family) => (
                <optgroup key={family} label={family}>
                  {MATERIAL_CATALOG.filter((g) => g.family === family).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {/* Free-text name kept in sync for downstream display (reports, cards); hidden since the
                dropdown above is the primary input, but still submitted with the form. */}
            <input type="hidden" name="material_name" value={selectedGrade?.label ?? ""} />
            <p className="mt-1 text-xs text-slate-400">
              Selecting a grade auto-fills typical published property values below — edit them if your actual
              material deviates from nominal spec.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="tensile_strength_mpa">
              Tensile strength (MPa)
            </label>
            <input
              required
              type="number"
              step="any"
              id="tensile_strength_mpa"
              name="tensile_strength_mpa"
              className="input"
              value={tensile}
              onChange={(e) => setTensile(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="yield_strength_mpa">
              Yield strength (MPa)
            </label>
            <input
              required
              type="number"
              step="any"
              id="yield_strength_mpa"
              name="yield_strength_mpa"
              className="input"
              value={yieldStrength}
              onChange={(e) => setYieldStrength(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="hardness_hb">
              Hardness (HB, Brinell)
            </label>
            {hardness === null ? (
              <>
                <input type="hidden" name="hardness_hb" value={0} />
                <div className="input flex items-center bg-slate-50 text-slate-400">Not applicable (plastic)</div>
                <p className="mt-1 text-xs text-slate-400">{hardnessNote}</p>
              </>
            ) : (
              <input
                required
                type="number"
                step="any"
                id="hardness_hb"
                name="hardness_hb"
                className="input"
                value={hardness}
                onChange={(e) => setHardness(Number(e.target.value))}
              />
            )}
          </div>
          <div>
            <label className="label" htmlFor="density_g_cm3">
              Density (g/cm&sup3;)
            </label>
            <input
              required
              type="number"
              step="any"
              id="density_g_cm3"
              name="density_g_cm3"
              className="input"
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      <section className="card card-pad space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">3. Mechanical parameters</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="length_mm">
              Length (mm)
            </label>
            <input required type="number" step="any" id="length_mm" name="length_mm" className="input" defaultValue={220} />
          </div>
          <div>
            <label className="label" htmlFor="width_mm">
              Width (mm)
            </label>
            <input required type="number" step="any" id="width_mm" name="width_mm" className="input" defaultValue={120} />
          </div>
          <div>
            <label className="label" htmlFor="height_mm">
              Height (mm)
            </label>
            <input required type="number" step="any" id="height_mm" name="height_mm" className="input" defaultValue={40} />
          </div>
          <div>
            <label className="label" htmlFor="weight_kg">
              Weight (kg)
            </label>
            <input required type="number" step="any" id="weight_kg" name="weight_kg" className="input" defaultValue={1.8} />
          </div>
          <div>
            <label className="label" htmlFor="tolerance_mm">
              Tightest tolerance — ISO 2768-1 grade
            </label>
            <select id="tolerance_mm" name="tolerance_mm" className="input" defaultValue={0.1}>
              {TOLERANCE_GRADES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Simplified: ISO 2768-1 grades actually vary by nominal dimension range — this uses one
              representative value per grade (~30-120mm bracket) rather than the full lookup table.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="surface_finish_ra_um">
              Surface finish — Ra grade (ISO 1302)
            </label>
            <select id="surface_finish_ra_um" name="surface_finish_ra_um" className="input" defaultValue={1.6}>
              {ROUGHNESS_GRADES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving..." : "Save component & continue to process definition"}
        </button>
      </div>
    </form>
  );
}
