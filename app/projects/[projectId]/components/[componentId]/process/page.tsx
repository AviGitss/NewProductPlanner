import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProcessForm from "@/components/ProcessForm";
import { getComponent, getProject } from "@/lib/data";

export default async function ProcessDefinitionPage({
  params,
}: {
  params: { projectId: string; componentId: string };
}) {
  const [project, component] = await Promise.all([getProject(params.projectId), getComponent(params.componentId)]);
  if (!project || !component) notFound();

  return (
    <div>
      <PageHeader
        title={`Process definition — ${component.name}`}
        subtitle="Describe the manufacturing process in natural language; the platform will parse it into structured stages."
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: component.name },
        ]}
      />
      <div className="p-8">
        <ProcessForm componentId={component.id} projectId={project.id} />
      </div>
    </div>
  );
}
