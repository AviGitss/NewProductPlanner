import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PlanningStepper from "@/components/PlanningStepper";
import { updateLineConfigAction } from "@/app/actions";
import {
  getComponent,
  getIteration,
  getProject,
  listIterationSelections,
  listMachines,
  listProcessStages,
} from "@/lib/data";
import { computeLineCapacity, StationInput } from "@/lib/lineCapacity";
import { PROCESS_TYPE_LABELS, ProcessType } from "@/lib/types";

export const dynamic = "force-dynamic";

const LAYOUT_SUGGESTIONS = [
  "Straight / In-line",
  "U-shaped cell",
  "Parallel / Batch lines",
  "S-shaped",
  "Cellular",
];

export default async function LineLayoutPage({
  params,
}: {
  params: { projectId: string; iterationId: string };
}) {
  const iteration = await getIteration(params.iterationId);
  if (!iteration) notFound();
  const [project, component] = await Promise.all([
    getProject(params.projectId),
    getComponent(iteration.component_id),
  ]);
  if (!project || !component) notFound();

  const [stages, selections, allMachines] = await Promise.all([
    listProcessStages(iteration.process_definition_id),
    listIterationSelections(iteration.id),
    listMachines(),
  ]);

  const machineMap = new Map(allMachines.map((m) => [m.id, m]));
  const selectionMap = new Map(selections.map((s) => [s.process_stage_id, s]));

  // Assemble the ordered station list (stage + selected machine) that
  // lib/lineCapacity.ts's pure functions operate on. Stages without a
  // selected machine (e.g. no catalog candidate was ever available) are
  // skipped — there's no capacity math to do for an unassigned station.
  const stations: StationInput[] = stages
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .flatMap((stage) => {
      const selection = selectionMap.get(stage.id);
      const machine = selection ? machineMap.get(selection.machine_id) : undefined;
      if (!machine) return [];
      return [
        {
          stageId: stage.id,
          stageName: stage.name,
          stageType: stage.stage_type as ProcessType,
          machine,
        },
      ];
    });

  const unassignedCount = stages.length - stations.length;

  const summary = computeLineCapacity(stations, iteration.buffer_minutes, iteration.variant_count);

  const updateAction = updateLineConfigAction.bind(null, iteration.id, project.id);

  return (
    <div>
      <PageHeader
        title="Line Layout & Capacity Planning"
        subtitle={`${component.name} — Iteration "${iteration.name}"`}
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Line & KPIs" },
        ]}
      />
      <PlanningStepper currentStep="line" />

      <div className="space-y-6 p-8">
        <section className="card card-pad">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Line configuration</h2>
          <form action={updateAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
            <div>
              <label className="label" htmlFor="layout_type">
                Layout type
              </label>
              <input
                id="layout_type"
                name="layout_type"
                list="layout-type-suggestions"
                defaultValue={iteration.layout_type ?? ""}
                placeholder="e.g. Straight / In-line"
                className="input"
              />
              <datalist id="layout-type-suggestions">
                {LAYOUT_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <p className="mt-1 text-[11px] text-slate-400">Free text — suggestions shown, not restricted to them.</p>
            </div>
            <div>
              <label className="label" htmlFor="buffer_minutes">
                Buffer minutes
              </label>
              <input
                id="buffer_minutes"
                name="buffer_minutes"
                type="number"
                step={0.5}
                min={0.5}
                defaultValue={iteration.buffer_minutes}
                className="input"
              />
              <p className="mt-1 text-[11px] text-slate-400">Minutes of stock each inter-station buffer is sized to absorb.</p>
            </div>
            <div>
              <label className="label" htmlFor="variant_count">
                Part variants / SKUs sharing this line (multipart WIP scaling)
              </label>
              <input
                id="variant_count"
                name="variant_count"
                type="number"
                step={1}
                min={1}
                defaultValue={iteration.variant_count}
                className="input"
              />
            </div>
            <div className="sm:col-span-3">
              <button type="submit" className="btn-primary">
                Recalculate
              </button>
            </div>
          </form>
        </section>

        {stations.length === 0 ? (
          <div className="card card-pad text-center text-sm text-slate-500">
            No stations with a selected machine yet — assign machines on the recommendations page first.
          </div>
        ) : (
          <>
            {unassignedCount > 0 && (
              <div className="card card-pad text-xs text-amber-700 bg-amber-50">
                {unassignedCount} stage{unassignedCount === 1 ? "" : "s"} without a selected machine were excluded
                from this analysis.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card card-pad">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Line throughput</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {summary.linePartsPerMin.toFixed(2)} <span className="text-sm font-normal text-slate-400">parts/min</span>
                </div>
              </div>
              <div className="card card-pad">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bottleneck station</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{summary.bottleneckStageName}</div>
              </div>
              <div className="card card-pad">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total HC requirement</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalHcRequirement}</div>
              </div>
              <div className="card card-pad">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total WIP units</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalWipUnits}</div>
              </div>
            </div>

            <div className="card overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Station</th>
                    <th>Machine</th>
                    <th>Parts/min</th>
                    <th>Cycle time (min)</th>
                    <th>HC required</th>
                    <th>Inbound WIP</th>
                    <th>Outbound WIP</th>
                    <th>Starvation risk</th>
                    <th>Suggested fix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.stations.map((s) => (
                    <tr key={s.stageId}>
                      <td>
                        <div className="font-medium text-slate-800">{s.stageName}</div>
                        <div className="text-xs text-slate-400">{PROCESS_TYPE_LABELS[s.stageType]}</div>
                      </td>
                      <td>{s.machineName}</td>
                      <td>{s.partsPerMin.toFixed(3)}</td>
                      <td>{s.cycleTimeMin.toFixed(1)}</td>
                      <td>{s.hcRequirement}</td>
                      <td>{s.inboundWipUnits}</td>
                      <td>{s.outboundWipUnits}</td>
                      <td>
                        {s.starved ? (
                          <span className="badge bg-red-100 text-red-800">Starved</span>
                        ) : (
                          <span className="badge bg-emerald-100 text-emerald-800">OK</span>
                        )}
                      </td>
                      <td className="max-w-xs text-xs text-slate-600">{s.starvationSuggestion ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
