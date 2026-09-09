import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PlanningStepper from "@/components/PlanningStepper";
import ProcessForm from "@/components/ProcessForm";
import { getComponent, getProject } from "@/lib/data";
import { suggestProcessFromComponent } from "@/lib/processSuggestion";

export default async function ProcessDefinitionPage({
  params,
}: {
  params: { projectId: string; componentId: string };
}) {
  const [project, component] = await Promise.all([getProject(params.projectId), getComponent(params.componentId)]);
  if (!project || !component) notFound();

  // The process step always opens with a recommendation, not a blank
  // textarea: a CAD-derived suggestion (from lib/cadParser.ts) takes
  // priority when one exists, otherwise the tool falls back to a
  // rule-based recommendation built from the component's own material and
  // mechanical parameters (see lib/processSuggestion.ts). Either way, the
  // user can edit every detected stage or clear it entirely to write the
  // process themselves before continuing to machine selection.
  const suggestionSource: "cad" | "auto" = component.suggested_process_text ? "cad" : "auto";
  const suggestedText = component.suggested_process_text ?? suggestProcessFromComponent(component);

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
      <PlanningStepper
        currentStep="process"
        hrefs={{
          component: `/projects/${project.id}/components/${component.id}/process`,
          process: `/projects/${project.id}/components/${component.id}/process`,
        }}
      />
      <div className="p-8">
        <ProcessForm
          componentId={component.id}
          projectId={project.id}
          initialSuggestedText={suggestedText}
          suggestionSource={suggestionSource}
        />
      </div>
    </div>
  );
}
