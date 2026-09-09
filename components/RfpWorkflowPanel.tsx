"use client";

import { useTransition } from "react";
import {
  advanceRfpStageAction,
  submitProductionCapacityAction,
  uploadRfpDocumentAction,
} from "@/app/actions";
import { RFP_STAGE_LABELS, RFP_STAGE_OWNER, canAdvanceFromStage, nextStage } from "@/lib/rfpWorkflow";
import { ROLE_LABELS } from "@/lib/rbac";
import {
  ProcurementSuggestion,
  ProductionCapacityInput,
  Project,
  Role,
  RfpDocument,
} from "@/lib/types";

const DOC_KIND_LABELS: Record<RfpDocument["kind"], string> = {
  cad: "CAD file",
  rfp_doc: "RFP paperwork",
  proposal_reference: "Historical proposal reference",
  autoform_result: "AutoForm result export",
  other: "Other",
};

export default function RfpWorkflowPanel({
  project,
  role,
  productionCapacity,
  documents,
  procurementSuggestions,
}: {
  project: Project;
  role: Role | null;
  productionCapacity: ProductionCapacityInput | null;
  documents: RfpDocument[];
  procurementSuggestions: ProcurementSuggestion[];
}) {
  const [pending, startTransition] = useTransition();
  const upcoming = nextStage(project.rfp_stage);
  const canAdvance = canAdvanceFromStage(role, project.rfp_stage) && upcoming;
  const owner = RFP_STAGE_OWNER[project.rfp_stage];

  return (
    <div className="space-y-6">
      {/* ---------------- Stage banner ---------------- */}
      <section className="card card-pad">
        <div className="flex items-center justify-between">
          <div>
            <span className="badge bg-brand-100 text-brand-700">{RFP_STAGE_LABELS[project.rfp_stage]}</span>
            {owner && <span className="ml-2 text-xs text-slate-400">waiting on {ROLE_LABELS[owner]}</span>}
          </div>
          {canAdvance && (
            <form
              action={(fd) => startTransition(() => advanceRfpStageAction(project.id, fd))}
              className="flex items-center gap-2"
            >
              <input name="note" placeholder="Optional note for the next team" className="input py-1 text-xs" />
              <button type="submit" disabled={pending} className="btn-primary py-1.5 text-xs">
                {pending ? "Moving..." : `Mark done → ${RFP_STAGE_LABELS[upcoming!]}`}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ---------------- Production capacity (production role's stage) ---------------- */}
      {(role === "production" || role === "admin") && (
        <section className="card card-pad">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Production capacity</h2>
          <form
            action={(fd) => startTransition(() => submitProductionCapacityAction(project.id, fd))}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <div>
              <label className="label">Available lines</label>
              <input name="available_lines" type="number" className="input" defaultValue={productionCapacity?.available_lines ?? ""} />
            </div>
            <div>
              <label className="label">Shifts/day</label>
              <input name="shifts_per_day" type="number" className="input" defaultValue={productionCapacity?.shifts_per_day ?? ""} />
            </div>
            <div>
              <label className="label">Hours/shift</label>
              <input name="hours_per_shift" type="number" step="any" className="input" defaultValue={productionCapacity?.hours_per_shift ?? ""} />
            </div>
            <div>
              <label className="label">OEE %</label>
              <input name="oee_pct" type="number" step="any" className="input" defaultValue={productionCapacity?.oee_pct ?? ""} />
            </div>
            <div className="col-span-2 sm:col-span-4">
              <label className="label">Notes</label>
              <input name="notes" className="input" defaultValue={productionCapacity?.notes ?? ""} />
            </div>
            <div className="col-span-2 sm:col-span-4 flex justify-end">
              <button type="submit" disabled={pending} className="btn-primary">
                {pending ? "Saving..." : "Save capacity data"}
              </button>
            </div>
          </form>
          {productionCapacity?.submitted_at && (
            <p className="mt-2 text-xs text-slate-400">Last submitted {new Date(productionCapacity.submitted_at).toLocaleString()}</p>
          )}
        </section>
      )}

      {/* ---------------- Procurement gaps ---------------- */}
      {procurementSuggestions.length > 0 && (
        <section className="card card-pad">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Equipment gaps flagged for procurement</h2>
          <ul className="space-y-3">
            {procurementSuggestions.map((p) => (
              <li key={p.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {p.rationale}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------------- Documents ---------------- */}
      <section className="card card-pad">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Documents (CAD, RFP paperwork, historical proposals, AutoForm results)</h2>
        <form
          action={(fd) => startTransition(() => uploadRfpDocumentAction(project.id, fd))}
          className="mb-4 flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="label">Kind</label>
            <select name="kind" className="input" defaultValue="rfp_doc">
              {Object.entries(DOC_KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">File</label>
            <input name="file" type="file" className="block w-full text-sm" />
          </div>
          <button type="submit" disabled={pending} className="btn-secondary">
            {pending ? "Uploading..." : "Upload"}
          </button>
        </form>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700">{d.file_name}</span>
                <span className="badge bg-slate-100 text-slate-600">{DOC_KIND_LABELS[d.kind]}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-400">
          AutoForm result exports are uploaded here manually for now — pulling directly from a shared results folder
          needs connection details from your team before that can be automated.
        </p>
      </section>
    </div>
  );
}
