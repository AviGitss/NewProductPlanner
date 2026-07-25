import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import IterationCompareSelector from "@/components/IterationCompareSelector";
import { getProject, listIterations } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function IterationsHistoryPage({ params }: { params: { projectId: string } }) {
  const project = await getProject(params.projectId);
  if (!project) notFound();
  const iterations = await listIterations(project.id);

  return (
    <div>
      <PageHeader
        title="Iteration history"
        subtitle="Select two or more iterations to compare side by side"
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Iterations" },
        ]}
      />
      <div className="p-8">
        <IterationCompareSelector projectId={project.id} iterations={iterations} />
      </div>
    </div>
  );
}
