"use client";

import { useState } from "react";
import { createComponentAction } from "@/app/actions";

export default function ComponentForm({ projectId }: { projectId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

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
            <label className="label" htmlFor="material_name">
              Material name
            </label>
            <input
              required
              id="material_name"
              name="material_name"
              className="input"
              placeholder="e.g. Aluminum 6061-T6"
            />
          </div>
          <div>
            <label className="label" htmlFor="tensile_strength_mpa">
              Tensile strength (MPa)
            </label>
            <input required type="number" step="any" id="tensile_strength_mpa" name="tensile_strength_mpa" className="input" defaultValue={310} />
          </div>
          <div>
            <label className="label" htmlFor="yield_strength_mpa">
              Yield strength (MPa)
            </label>
            <input required type="number" step="any" id="yield_strength_mpa" name="yield_strength_mpa" className="input" defaultValue={276} />
          </div>
          <div>
            <label className="label" htmlFor="hardness_hb">
              Hardness (HB, Brinell)
            </label>
            <input required type="number" step="any" id="hardness_hb" name="hardness_hb" className="input" defaultValue={95} />
          </div>
          <div>
            <label className="label" htmlFor="density_g_cm3">
              Density (g/cm&sup3;)
            </label>
            <input required type="number" step="any" id="density_g_cm3" name="density_g_cm3" className="input" defaultValue={2.7} />
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
              Tightest tolerance (&plusmn;mm)
            </label>
            <input required type="number" step="any" id="tolerance_mm" name="tolerance_mm" className="input" defaultValue={0.05} />
          </div>
          <div>
            <label className="label" htmlFor="surface_finish_ra_um">
              Surface finish Ra (&micro;m)
            </label>
            <input
              required
              type="number"
              step="any"
              id="surface_finish_ra_um"
              name="surface_finish_ra_um"
              className="input"
              defaultValue={1.6}
            />
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
