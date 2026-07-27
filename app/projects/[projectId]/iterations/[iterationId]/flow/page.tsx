import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PlanningStepper from "@/components/PlanningStepper";
import { FlowStage } from "@/components/ProcessFlowDiagram";
import ProcessFlowDiagramClient from "@/components/ProcessFlowDiagramClient";
import {
  getComponent,
  getIteration,
  getProcessDefinition,
  getProject,
  listIterationSelections,
  listMachines,
  listProcessStages,
} from "@/lib/data";
import { ProcessType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FlowPage({ params }: { params: { projectId: string; iterationId: string } }) {
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

  const flowStages: FlowStage[] = stages.map((s) => {
    const sel = selectionMap.get(s.id);
    return {
      id: s.id,
      sequence: s.sequence,
      name: s.name,
      stage_type: s.stage_type as ProcessType,
      machineName: sel ? machineMap.get(sel.machine_id)?.name ?? null : null,
      score: sel ? sel.score : null,
    };
  });

  return (
    <div>
      <PageHeader
        title="Process flow visualization"
        subtitle={`${component.name} — Iteration "${iteration.name}"`}
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Process flow" },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href={`/projects/${project.id}/iterations/${iteration.id}/recommendations`} className="btn-secondary">
              Back to recommendations
            </Link>
            <Link href={`/projects/${project.id}/iterations/${iteration.id}/line`} className="btn-primary">
              Line & KPIs
            </Link>
          </div>
        }
      />
      <PlanningStepper
        currentStep="flow"
        hrefs={{
          component: `/projects/${project.id}/components/${component.id}/process`,
          process: `/projects/${project.id}/components/${component.id}/process`,
          recommendations: `/projects/${project.id}/iterations/${iteration.id}/recommendations`,
          flow: `/projects/${project.id}/iterations/${iteration.id}/flow`,
          line: `/projects/${project.id}/iterations/${iteration.id}/line`,
          twin: `/projects/${project.id}/iterations/${iteration.id}/twin`,
          report: `/projects/${project.id}/iterations/${iteration.id}/report`,
        }}
      />
      <div className="p-8">
        <ProcessFlowDiagramClient stages={flowStages} projectId={project.id} iterationId={iteration.id} />
      </div>
    </div>
  );
}
