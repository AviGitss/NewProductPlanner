import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import {
  getComponent,
  getProject,
  listIterationSelections,
  listIterations,
  listMachines,
  listProcessStages,
} from "@/lib/data";
import { PROCESS_TYPE_LABELS, ProcessType } from "@/lib/types";

export const dynamic = "force-dynamic";

// Very simple resource-requirement heuristic: one operator per stage whose
// machine is not "assembly"/"packaging" (which may need two for
// manual handling), plus a flat floor-space estimate derived from each
// machine's work envelope footprint (x * y), summed across stages.
function estimateResources(stageTypes: ProcessType[], footprintsM2: number[]) {
  const laborHeadcount = stageTypes.reduce((sum, t) => sum + (t === "assembly" || t === "packaging" ? 2 : 1), 0);
  const floorSpaceM2 = Math.round(footprintsM2.reduce((a, b) => a + b, 0) * 1.4 * 10) / 10; // +40% for aisles/access
  return { laborHeadcount, floorSpaceM2 };
}

export default async function RecommendedFlowPage({ params }: { params: { projectId: string } }) {
  const project = await getProject(params.projectId);
  if (!project) notFound();

  const iterations = await listIterations(project.id);
  if (iterations.length === 0) {
    return (
      <div>
        <PageHeader title="Recommended flow" crumbs={[{ label: "Projects", href: "/dashboard" }, { label: project.name, href: `/projects/${project.id}` }]} />
        <div className="p-8 text-sm text-slate-500">
          No iterations yet. Add a component and generate machine recommendations to see the recommended flow.
        </div>
      </div>
    );
  }

  const best = iterations.reduce((a, b) => (b.avg_score > a.avg_score ? b : a));
  const component = await getComponent(best.component_id);
  const [selections, stages, machines] = await Promise.all([
    listIterationSelections(best.id),
    listProcessStages(best.process_definition_id),
    listMachines(),
  ]);
  const machineMap = new Map(machines.map((m) => [m.id, m]));
  const stageMap = new Map(stages.map((s) => [s.id, s]));

  const ordered = selections.slice().sort((a, b) => a.sequence - b.sequence);
  const stageTypes = ordered.map((s) => (stageMap.get(s.process_stage_id)?.stage_type as ProcessType) ?? "assembly");
  const footprints = ordered.map((s) => {
    const m = machineMap.get(s.machine_id);
    const env = m?.specs.work_envelope_mm ?? m?.specs.build_volume_mm;
    return env ? (env.x / 1000) * (env.y / 1000) : 4;
  });
  const resources = estimateResources(stageTypes, footprints);

  return (
    <div>
      <PageHeader
        title="Recommended flow"
        subtitle={`Best-scoring configuration for ${component?.name ?? "this project"}`}
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Recommended flow" },
        ]}
        actions={
          <Link href={`/projects/${project.id}/iterations/${best.id}`} className="btn-secondary">
            View iteration
          </Link>
        }
      />

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-4 gap-4">
          <div className="card card-pad text-center">
            <div className="text-2xl font-bold text-brand-600">{best.avg_score}%</div>
            <div className="text-xs text-slate-500">Aggregate applicability score</div>
          </div>
          <div className="card card-pad text-center">
            <div className="text-2xl font-bold text-slate-800">{best.est_cycle_time_min} min</div>
            <div className="text-xs text-slate-500">Est. total cycle time / part</div>
          </div>
          <div className="card card-pad text-center">
            <div className="text-2xl font-bold text-slate-800">${best.est_cost_usd}</div>
            <div className="text-xs text-slate-500">Est. total cost / part</div>
          </div>
          <div className="card card-pad text-center">
            <div className="text-2xl font-bold text-slate-800">{iterations.length}</div>
            <div className="text-xs text-slate-500">Iterations evaluated</div>
          </div>
        </div>

        <section className="card card-pad">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Recommended equipment list & process sequence</h2>
          <table className="table-base w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Stage</th>
                <th>Process type</th>
                <th>Machine</th>
                <th>Manufacturer</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ordered.map((sel) => {
                const stage = stageMap.get(sel.process_stage_id);
                const machine = machineMap.get(sel.machine_id);
                return (
                  <tr key={sel.id}>
                    <td>{sel.sequence}</td>
                    <td>{stage?.name}</td>
                    <td>{stage ? PROCESS_TYPE_LABELS[stage.stage_type as ProcessType] : "—"}</td>
                    <td className="font-medium">{machine?.name}</td>
                    <td>{machine?.manufacturer}</td>
                    <td>{sel.score}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="card card-pad">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Resource requirements (estimated)</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="label">Labor headcount</div>
              <div className="text-lg font-semibold">{resources.laborHeadcount} operators</div>
              <p className="text-xs text-slate-400">1 operator/stage, 2 for assembly &amp; packaging stages (stub heuristic)</p>
            </div>
            <div>
              <div className="label">Floor space</div>
              <div className="text-lg font-semibold">{resources.floorSpaceM2} m&sup2;</div>
              <p className="text-xs text-slate-400">Sum of machine footprints + 40% for aisles/access (stub heuristic)</p>
            </div>
            <div>
              <div className="label">Estimated cost per part</div>
              <div className="text-lg font-semibold">${best.est_cost_usd}</div>
              <p className="text-xs text-slate-400">Sum of stage cycle time x machine hourly rate</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
