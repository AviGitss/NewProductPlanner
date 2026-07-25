import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import RefreshTwinButton from "@/components/RefreshTwinButton";
import {
  getComponent,
  getIteration,
  getProject,
  listIterationSelections,
  listMachines,
  listProcessStages,
  listTwinSnapshots,
  generateTwinSnapshots,
} from "@/lib/data";
import { TwinStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<TwinStatus, string> = {
  running: "bg-emerald-100 text-emerald-800",
  idle: "bg-slate-100 text-slate-600",
  maintenance: "bg-amber-100 text-amber-800",
  fault: "bg-red-100 text-red-800",
};

export default async function DigitalTwinPage({
  params,
}: {
  params: { projectId: string; iterationId: string };
}) {
  const iteration = await getIteration(params.iterationId);
  if (!iteration) notFound();
  const [project, component] = await Promise.all([getProject(params.projectId), getComponent(iteration.component_id)]);
  if (!project || !component) notFound();

  const selections = await listIterationSelections(iteration.id);
  let snapshots = await listTwinSnapshots(iteration.id);
  if (snapshots.length === 0 && selections.length > 0) {
    snapshots = await generateTwinSnapshots(iteration.id, selections);
  }

  const [machines, stages] = await Promise.all([
    listMachines(),
    listProcessStages(iteration.process_definition_id),
  ]);
  const machineMap = new Map(machines.map((m) => [m.id, m]));
  const stageMap = new Map(stages.map((s) => [s.id, s]));

  // Show most recent snapshot per stage only.
  const latestByStage = new Map<string, (typeof snapshots)[number]>();
  for (const snap of snapshots) {
    const existing = latestByStage.get(snap.process_stage_id);
    if (!existing || snap.captured_at > existing.captured_at) latestByStage.set(snap.process_stage_id, snap);
  }
  const rows = Array.from(latestByStage.values()).sort((a, b) => {
    const sa = stageMap.get(a.process_stage_id)?.sequence ?? 0;
    const sb = stageMap.get(b.process_stage_id)?.sequence ?? 0;
    return sa - sb;
  });

  return (
    <div>
      <PageHeader
        title="Digital twin dashboard"
        subtitle={`${component.name} — Iteration "${iteration.name}"`}
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Digital twin" },
        ]}
        actions={<RefreshTwinButton iterationId={iteration.id} projectId={project.id} />}
      />
      <div className="p-8">
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <strong>Simulated data:</strong> utilization, cycle time, status, and last maintenance below are randomized
          mock telemetry for demonstration purposes — no live machine connection exists.
        </div>

        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead className="bg-slate-50">
              <tr>
                <th>Stage</th>
                <th>Machine</th>
                <th>Status</th>
                <th>Utilization</th>
                <th>Cycle time</th>
                <th>Last maintenance</th>
                <th>Captured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((snap) => {
                const machine = machineMap.get(snap.machine_id);
                const stage = stageMap.get(snap.process_stage_id);
                return (
                  <tr key={snap.id}>
                    <td>
                      {stage?.sequence}. {stage?.name}
                    </td>
                    <td>{machine?.name}</td>
                    <td>
                      <span className={`badge ${STATUS_STYLES[snap.status as TwinStatus]} capitalize`}>{snap.status}</span>
                    </td>
                    <td>{snap.utilization_pct}%</td>
                    <td>{snap.cycle_time_min} min</td>
                    <td>{new Date(snap.last_maintenance).toLocaleDateString()}</td>
                    <td>{new Date(snap.captured_at).toLocaleTimeString()}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No telemetry yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
