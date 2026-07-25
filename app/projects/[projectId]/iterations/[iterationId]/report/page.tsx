import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ReportActions, { ReportData } from "@/components/ReportActions";
import {
  getComponent,
  getIteration,
  getProcessDefinition,
  getProject,
  listIterationSelections,
  listMachines,
  listProcessStages,
} from "@/lib/data";
import { PROCESS_TYPE_LABELS, ProcessType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: { projectId: string; iterationId: string } }) {
  const iteration = await getIteration(params.iterationId);
  if (!iteration) notFound();
  const [project, component, definition] = await Promise.all([
    getProject(params.projectId),
    getComponent(iteration.component_id),
    getProcessDefinition(iteration.process_definition_id),
  ]);
  if (!project || !component || !definition) notFound();

  const [stages, selections, machines] = await Promise.all([
    listProcessStages(definition.id),
    listIterationSelections(iteration.id),
    listMachines(),
  ]);
  const machineMap = new Map(machines.map((m) => [m.id, m]));
  const selectionMap = new Map(selections.map((s) => [s.process_stage_id, s]));

  const stageRows = stages.map((s) => {
    const sel = selectionMap.get(s.id);
    const machine = sel ? machineMap.get(sel.machine_id) : undefined;
    return {
      sequence: s.sequence,
      name: s.name,
      type: PROCESS_TYPE_LABELS[s.stage_type as ProcessType],
      machine: machine?.name ?? "Unassigned",
      score: sel?.score ?? 0,
    };
  });

  const recommendation =
    iteration.avg_score >= 80
      ? "This configuration shows strong applicability across all stages and is recommended for line implementation."
      : iteration.avg_score >= 60
      ? "This configuration is viable but has stages with moderate applicability — review flagged machines before committing capital."
      : "This configuration has significant applicability gaps. Consider revising component parameters, tolerances, or evaluating alternate machines before proceeding.";

  const reportData: ReportData = {
    projectName: project.name,
    componentName: component.name,
    iterationName: iteration.name,
    material: {
      "Material": component.material.material_name,
      "Tensile strength": `${component.material.tensile_strength_mpa} MPa`,
      "Yield strength": `${component.material.yield_strength_mpa} MPa`,
      "Hardness": `${component.material.hardness_hb} HB`,
      "Density": `${component.material.density_g_cm3} g/cm3`,
    },
    mechanical: {
      "Dimensions": `${component.mechanical.length_mm} x ${component.mechanical.width_mm} x ${component.mechanical.height_mm} mm`,
      "Weight": `${component.mechanical.weight_kg} kg`,
      "Tolerance": `+/- ${component.mechanical.tolerance_mm} mm`,
      "Surface finish": `Ra ${component.mechanical.surface_finish_ra_um} um`,
    },
    processText: definition.raw_text,
    stages: stageRows,
    avgScore: iteration.avg_score,
    estCycleTimeMin: iteration.est_cycle_time_min,
    estCostUsd: iteration.est_cost_usd,
    recommendation,
  };

  return (
    <div>
      <PageHeader
        title="Report"
        subtitle={`${component.name} — Iteration "${iteration.name}"`}
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Report" },
        ]}
        actions={<ReportActions report={reportData} />}
      />

      <div className="mx-auto max-w-3xl p-8 print:p-0">
        <div className="card card-pad print:border-0 print:shadow-none">
          <h1 className="text-2xl font-bold text-slate-900">MfgPlan Manufacturing Line Plan Report</h1>
          <p className="text-sm text-slate-500">Generated {new Date().toLocaleString()}</p>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="label">Project</div>
              <div>{project.name}</div>
            </div>
            <div>
              <div className="label">Component</div>
              <div>{component.name}</div>
            </div>
          </div>

          <h2 className="mt-6 text-base font-semibold text-slate-800">Material parameters</h2>
          <table className="table-base mt-2 w-full">
            <tbody className="divide-y divide-slate-100">
              {Object.entries(reportData.material).map(([k, v]) => (
                <tr key={k}>
                  <td className="font-medium text-slate-500">{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="mt-6 text-base font-semibold text-slate-800">Mechanical parameters</h2>
          <table className="table-base mt-2 w-full">
            <tbody className="divide-y divide-slate-100">
              {Object.entries(reportData.mechanical).map(([k, v]) => (
                <tr key={k}>
                  <td className="font-medium text-slate-500">{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="mt-6 text-base font-semibold text-slate-800">Process definition</h2>
          <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm italic text-slate-600">&ldquo;{definition.raw_text}&rdquo;</p>

          <h2 className="mt-6 text-base font-semibold text-slate-800">Process stages & selected machines</h2>
          <table className="table-base mt-2 w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Stage</th>
                <th>Process type</th>
                <th>Machine</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stageRows.map((s) => (
                <tr key={s.sequence}>
                  <td>{s.sequence}</td>
                  <td>{s.name}</td>
                  <td>{s.type}</td>
                  <td>{s.machine}</td>
                  <td>{s.score}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="mt-6 text-base font-semibold text-slate-800">Summary</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li>Average applicability score: <strong>{iteration.avg_score}%</strong></li>
            <li>Estimated total cycle time: <strong>{iteration.est_cycle_time_min} min/part</strong></li>
            <li>Estimated total cost: <strong>${iteration.est_cost_usd}/part</strong></li>
          </ul>

          <h2 className="mt-6 text-base font-semibold text-slate-800">Recommendation</h2>
          <p className="mt-2 text-sm text-slate-700">{recommendation}</p>
        </div>
      </div>
    </div>
  );
}
