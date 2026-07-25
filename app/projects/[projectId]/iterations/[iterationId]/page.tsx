import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import {
  getComponent,
  getIteration,
  getProcessDefinition,
  getProject,
  getReportByIteration,
  listIterationSelections,
  listMachines,
  listProcessStages,
} from "@/lib/data";
import { PROCESS_TYPE_LABELS, ProcessType } from "@/lib/types";

export const dynamic = "force-dynamic";

function ThreadNode({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-1 h-3 w-3 rounded-full border-2 border-brand-600 bg-white" />
      <div className="absolute left-[5px] top-4 h-full w-px bg-slate-200" />
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="mt-1 mb-6 text-sm text-slate-600">{children}</div>
    </div>
  );
}

export default async function DigitalThreadPage({
  params,
}: {
  params: { projectId: string; iterationId: string };
}) {
  const iteration = await getIteration(params.iterationId);
  if (!iteration) notFound();
  const [project, component, definition] = await Promise.all([
    getProject(params.projectId),
    getComponent(iteration.component_id),
    getProcessDefinition(iteration.process_definition_id),
  ]);
  if (!project || !component || !definition) notFound();

  const [stages, selections, machines, report] = await Promise.all([
    listProcessStages(definition.id),
    listIterationSelections(iteration.id),
    listMachines(),
    getReportByIteration(iteration.id),
  ]);
  const machineMap = new Map(machines.map((m) => [m.id, m]));
  const selectionMap = new Map(selections.map((s) => [s.process_stage_id, s]));

  return (
    <div>
      <PageHeader
        title="Digital thread"
        subtitle={`Traceable lineage for "${iteration.name}"`}
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Digital thread" },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href={`/projects/${project.id}/iterations/${iteration.id}/flow`} className="btn-secondary">
              Process flow
            </Link>
            <Link href={`/projects/${project.id}/iterations/${iteration.id}/twin`} className="btn-secondary">
              Digital twin
            </Link>
            <Link href={`/projects/${project.id}/iterations/${iteration.id}/report`} className="btn-primary">
              Report
            </Link>
          </div>
        }
      />

      <div className="mx-auto max-w-3xl p-8">
        <ThreadNode title="1. Component & CAD reference">
          <p className="font-medium text-slate-800">{component.name}</p>
          <p className="text-xs text-slate-400">
            CAD file: {component.cad_file_name ?? "None uploaded"}
          </p>
        </ThreadNode>

        <ThreadNode title="2. Material & mechanical parameters">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <span>Material: {component.material.material_name}</span>
            <span>Tensile: {component.material.tensile_strength_mpa} MPa</span>
            <span>Yield: {component.material.yield_strength_mpa} MPa</span>
            <span>Hardness: {component.material.hardness_hb} HB</span>
            <span>
              Dimensions: {component.mechanical.length_mm}x{component.mechanical.width_mm}x
              {component.mechanical.height_mm} mm
            </span>
            <span>Weight: {component.mechanical.weight_kg} kg</span>
            <span>Tolerance: ±{component.mechanical.tolerance_mm} mm</span>
            <span>Surface finish: Ra {component.mechanical.surface_finish_ra_um} µm</span>
          </div>
        </ThreadNode>

        <ThreadNode title="3. Process definition (natural language)">
          <p className="rounded-md bg-slate-50 p-3 text-xs italic text-slate-600">&ldquo;{definition.raw_text}&rdquo;</p>
        </ThreadNode>

        <ThreadNode title="4. Parsed process stages">
          <ol className="list-decimal space-y-1 pl-4 text-xs">
            {stages.map((s) => (
              <li key={s.id}>
                {s.name} <span className="text-slate-400">({PROCESS_TYPE_LABELS[s.stage_type as ProcessType]})</span>
              </li>
            ))}
          </ol>
        </ThreadNode>

        <ThreadNode title="5. Selected machines">
          <ul className="space-y-1 text-xs">
            {selections.map((sel) => {
              const machine = machineMap.get(sel.machine_id);
              const stage = stages.find((s) => s.id === sel.process_stage_id);
              return (
                <li key={sel.id}>
                  Stage {stage?.sequence}: <span className="font-medium">{machine?.name}</span> — {sel.score}% match
                </li>
              );
            })}
          </ul>
        </ThreadNode>

        <ThreadNode title="6. Iteration">
          <p>
            <span className="font-medium">{iteration.name}</span> · status: {iteration.status} · avg score{" "}
            {iteration.avg_score}% · est. cycle time {iteration.est_cycle_time_min} min · est. cost $
            {iteration.est_cost_usd}
          </p>
        </ThreadNode>

        <ThreadNode title="7. Report">
          {report ? (
            <p>
              Report generated {new Date(report.created_at).toLocaleString()} —{" "}
              <Link href={`/projects/${project.id}/iterations/${iteration.id}/report`} className="text-brand-600 hover:underline">
                view report
              </Link>
            </p>
          ) : (
            <p>
              No report generated yet —{" "}
              <Link href={`/projects/${project.id}/iterations/${iteration.id}/report`} className="text-brand-600 hover:underline">
                generate one
              </Link>
            </p>
          )}
        </ThreadNode>
      </div>
    </div>
  );
}
