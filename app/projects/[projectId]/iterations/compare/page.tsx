import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import {
  getIteration,
  getProject,
  listIterationSelections,
  listMachines,
  listProcessStages,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CompareIterationsPage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams: { ids?: string };
}) {
  const project = await getProject(params.projectId);
  if (!project) notFound();

  const ids = (searchParams.ids ?? "").split(",").filter(Boolean);
  if (ids.length < 2) {
    return (
      <div>
        <PageHeader title="Compare iterations" crumbs={[{ label: "Projects", href: "/dashboard" }, { label: project.name, href: `/projects/${project.id}` }]} />
        <div className="p-8 text-sm text-slate-500">Select at least two iterations from the iteration history page to compare.</div>
      </div>
    );
  }

  const iterations = (await Promise.all(ids.map((id) => getIteration(id)))).filter(Boolean);
  const machines = await listMachines();
  const machineMap = new Map(machines.map((m) => [m.id, m]));

  const details = await Promise.all(
    iterations.map(async (it) => {
      if (!it) return null;
      const [selections, stages] = await Promise.all([
        listIterationSelections(it.id),
        listProcessStages(it.process_definition_id),
      ]);
      const stageMap = new Map(stages.map((s) => [s.id, s]));
      return { iteration: it, selections, stageMap };
    })
  );

  return (
    <div>
      <PageHeader
        title="Compare iterations"
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Compare" },
        ]}
      />
      <div className="overflow-x-auto p-8">
        <table className="table-base card">
          <thead className="bg-slate-50">
            <tr>
              <th>Metric</th>
              {details.map((d) => (
                <th key={d!.iteration.id}>{d!.iteration.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="font-medium text-slate-500">Status</td>
              {details.map((d) => (
                <td key={d!.iteration.id} className="capitalize">
                  {d!.iteration.status}
                </td>
              ))}
            </tr>
            <tr>
              <td className="font-medium text-slate-500">Average applicability score</td>
              {details.map((d) => (
                <td key={d!.iteration.id} className="font-semibold">
                  {d!.iteration.avg_score}%
                </td>
              ))}
            </tr>
            <tr>
              <td className="font-medium text-slate-500">Estimated cycle time</td>
              {details.map((d) => (
                <td key={d!.iteration.id}>{d!.iteration.est_cycle_time_min} min/part</td>
              ))}
            </tr>
            <tr>
              <td className="font-medium text-slate-500">Estimated cost</td>
              {details.map((d) => (
                <td key={d!.iteration.id}>${d!.iteration.est_cost_usd}/part</td>
              ))}
            </tr>
            <tr>
              <td className="align-top font-medium text-slate-500">Machines chosen</td>
              {details.map((d) => (
                <td key={d!.iteration.id} className="align-top">
                  <ul className="space-y-1">
                    {d!.selections.map((sel) => {
                      const machine = machineMap.get(sel.machine_id);
                      const stage = d!.stageMap.get(sel.process_stage_id);
                      return (
                        <li key={sel.id} className="text-xs">
                          {stage?.sequence}. {stage?.name}: <span className="font-medium">{machine?.name}</span> ({sel.score}%)
                        </li>
                      );
                    })}
                  </ul>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
