import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ComponentForm from "@/components/ComponentForm";
import { getProject } from "@/lib/data";

export default async function NewComponentPage({ params }: { params: { projectId: string } }) {
  const project = await getProject(params.projectId);
  if (!project) notFound();

  return (
    <div>
      <PageHeader
        title="Add component"
        subtitle="Upload a CAD reference and enter material / mechanical parameters"
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "New component" },
        ]}
      />
      <div className="p-8">
        <ComponentForm projectId={project.id} />
      </div>
    </div>
  );
}
