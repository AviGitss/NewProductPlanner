import PageHeader from "@/components/PageHeader";
import { createProjectAction } from "@/app/actions";

export default function NewProjectPage() {
  return (
    <div>
      <PageHeader
        title="New project"
        crumbs={[{ label: "Projects", href: "/dashboard" }, { label: "New" }]}
      />
      <div className="p-8">
        <form action={createProjectAction} className="card card-pad max-w-xl space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Project name
            </label>
            <input required id="name" name="name" className="input" placeholder="e.g. Bracket Line Rollout" />
          </div>
          <div>
            <label className="label" htmlFor="description">
              Description
            </label>
            <textarea id="description" name="description" className="textarea" placeholder="Optional context for this planning effort" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
