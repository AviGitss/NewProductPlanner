import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PlanningStepper from "@/components/PlanningStepper";
import MachineCard from "@/components/MachineCard";
import {
  getComponent,
  getIteration,
  getProcessDefinition,
  getProject,
  listIterationSelections,
  listMachines,
  listProcessStages,
  listStageRecommendations,
} from "@/lib/data";
import { PROCESS_TYPE_LABELS, ProcessType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage({
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

  const [stages, selections, allMachines] = await Promise.all([
    listProcessStages(definition.id),
    listIterationSelections(iteration.id),
    listMachines(),
  ]);
  const machineMap = new Map(allMachines.map((m) => [m.id, m]));
  const selectionMap = new Map(selections.map((s) => [s.process_stage_id, s]));

  const stageRecs = await Promise.all(stages.map((s) => listStageRecommendations(s.id)));

  return (
    <div>
      <PageHeader
        title="Machine recommendations"
        subtitle={`${component.name} — Iteration "${iteration.name}"`}
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Recommendations" },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href={`/projects/${project.id}/iterations/${iteration.id}/flow`} className="btn-secondary">
              Process flow
            </Link>
            <Link href={`/projects/${project.id}/iterations/${iteration.id}`} className="btn-primary">
              View digital thread
            </Link>
          </div>
        }
      />
      <PlanningStepper currentStep="recommendations" />

      <div className="space-y-8 p-8">
        {stages.map((stage, idx) => {
          const recs = stageRecs[idx].slice(0, 4);
          const selection = selectionMap.get(stage.id);
          return (
            <section key={stage.id}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {stage.sequence}
                </span>
                <h2 className="text-base font-semibold text-slate-900">{stage.name}</h2>
                <span className="badge bg-slate-100 text-slate-600">{PROCESS_TYPE_LABELS[stage.stage_type as ProcessType]}</span>
              </div>
              {recs.length === 0 ? (
                <p className="pl-8 text-sm text-slate-500">No candidate machines found for this process type in the catalog.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {recs.map((rec) => {
                    const machine = machineMap.get(rec.machine_id);
                    if (!machine) return null;
                    return (
                      <MachineCard
                        key={rec.id}
                        machine={machine}
                        score={rec.score}
                        breakdown={rec.breakdown}
                        selected={selection?.machine_id === machine.id}
                        iterationId={iteration.id}
                        projectId={project.id}
                        stageId={stage.id}
                        sequence={stage.sequence}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
