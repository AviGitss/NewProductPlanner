"use client";

import { useState } from "react";
import ScoreBadge from "./ScoreBadge";
import { Machine, ScoreBreakdown } from "@/lib/types";
import { updateStageSelectionAction } from "@/app/actions";

function fmtEnvelope(m: Machine) {
  const env = m.specs.work_envelope_mm ?? m.specs.build_volume_mm;
  if (!env) return "—";
  return `${env.x} x ${env.y} x ${env.z} mm`;
}

export default function MachineCard({
  machine,
  score,
  breakdown,
  selected,
  iterationId,
  projectId,
  stageId,
  sequence,
}: {
  machine: Machine;
  score: number;
  breakdown: ScoreBreakdown[];
  selected: boolean;
  iterationId: string;
  projectId: string;
  stageId: string;
  sequence: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div className={`card card-pad ${selected ? "border-brand-400 ring-1 ring-brand-300" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">{machine.name}</h3>
          <p className="text-xs text-slate-400">{machine.manufacturer}</p>
        </div>
        <ScoreBadge score={score} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
        <dt className="text-slate-400">Power</dt>
        <dd>{machine.specs.power_kw ? `${machine.specs.power_kw} kW` : "—"}</dd>
        <dt className="text-slate-400">Work envelope</dt>
        <dd>{fmtEnvelope(machine)}</dd>
        <dt className="text-slate-400">Tolerance capability</dt>
        <dd>{machine.specs.tolerance_capability_mm ? `±${machine.specs.tolerance_capability_mm} mm` : "—"}</dd>
        <dt className="text-slate-400">Max part weight</dt>
        <dd>{machine.specs.max_part_weight_kg ? `${machine.specs.max_part_weight_kg} kg` : "—"}</dd>
        <dt className="text-slate-400">Throughput</dt>
        <dd>{machine.specs.throughput_parts_per_hour ? `${machine.specs.throughput_parts_per_hour} pph` : "—"}</dd>
        <dt className="text-slate-400">Surface finish</dt>
        <dd>{machine.specs.surface_finish_capability_ra_um ? `Ra ${machine.specs.surface_finish_capability_ra_um} µm` : "—"}</dd>
        <dt className="text-slate-400">Cost tier</dt>
        <dd className="capitalize">{machine.cost_tier}</dd>
        <dt className="text-slate-400">Hourly rate</dt>
        <dd>${machine.est_hourly_rate_usd}/hr</dd>
      </dl>

      <button type="button" className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700" onClick={() => setOpen(!open)}>
        {open ? "Hide scoring breakdown" : "Show scoring breakdown"}
      </button>

      {open && (
        <table className="mt-2 w-full text-xs">
          <tbody>
            {breakdown.map((b) => (
              <tr key={b.label} className="border-t border-slate-100">
                <td className="py-1 pr-2 text-slate-500">
                  {b.label} <span className="text-slate-300">({b.weight.toFixed(1)}%)</span>
                </td>
                <td className="py-1 pr-2 text-right font-medium">{b.score}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {machine.specs.notes && <p className="mt-2 text-xs italic text-slate-400">{machine.specs.notes}</p>}

      <form
        action={async (formData) => {
          setPending(true);
          await updateStageSelectionAction(iterationId, projectId, formData);
          setPending(false);
        }}
        className="mt-3"
      >
        <input type="hidden" name="stage_id" value={stageId} />
        <input type="hidden" name="machine_id" value={machine.id} />
        <input type="hidden" name="score" value={score} />
        <input type="hidden" name="sequence" value={sequence} />
        <button type="submit" disabled={selected || pending} className={selected ? "btn-secondary w-full" : "btn-primary w-full"}>
          {selected ? "Selected for this stage" : pending ? "Selecting..." : "Select this machine"}
        </button>
      </form>
    </div>
  );
}
