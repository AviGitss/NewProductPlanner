import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import DeleteProjectButton from "@/components/DeleteProjectButton";
import RfpWorkflowPanel from "@/components/RfpWorkflowPanel";
import { getCurrentUserContext } from "@/lib/auth";
import {
  getProductionCapacity,
  getProject,
  listComponents,
  listIterations,
  listProcurementSuggestions,
  listRfpDocuments,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const ctx = await getCurrentUserContext();
  const project = await getProject(params.projectId);
  if (!project) notFound();

  const [components, iterations, productionCapacity, documents, procurementSuggestions] = await Promise.all([
    listComponents(project.id),
    listIterations(project.id),
    getProductionCapacity(project.id),
    listRfpDocuments(project.id),
    listProcurementSuggestions(project.id),
  ]);

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={project.description || undefined}
        crumbs={[{ label: "Projects", href: "/dashboard" }, { label: project.name }]}
        actions={
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Link href={`/projects/${project.id}/iterations`} className="btn-secondary">
                Iteration history
              </Link>
              <Link href={`/projects/${project.id}/recommended`} className="btn-secondary">
                Recommended flow
              </Link>
              <Link href={`/projects/${project.id}/components/new`} className="btn-primary">
                + Add component
              </Link>
            </div>
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
        <section className="card card-pad">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Components</h2>
          {components.length === 0 ? (
            <p className="text-sm text-slate-500">No components yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {components.map((c) => (
                <li key={c.id} className="py-3">
                  <Link href={`/projects/${project.id}/components/${c.id}/process`} className="font-medium text-slate-800 hover:text-brand-600">
                    {c.name}
                  </Link>
                  <p className="text-xs text-slate-400">
                    {c.material.material_name} · {c.mechanical.length_mm}x{c.mechanical.width_mm}x{c.mechanical.height_mm}mm ·{" "}
                    {c.mechanical.weight_kg}kg
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card card-pad">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Recent iterations</h2>
          {iterations.length === 0 ? (
            <p className="text-sm text-slate-500">No iterations yet — add a component and define its process to generate one.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {iterations.slice(0, 6).map((it) => (
                <li key={it.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link href={`/projects/${project.id}/iterations/${it.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                      {it.name}
                    </Link>
                    <p className="text-xs text-slate-400">
                      Status: {it.status} · Avg score {it.avg_score}%
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="px-8 pb-8">
        <RfpWorkflowPanel
          project={project}
          role={ctx.role}
          productionCapacity={productionCapacity}
          documents={documents}
          procurementSuggestions={procurementSuggestions}
        />
      </div>
    </div>
  );
}
