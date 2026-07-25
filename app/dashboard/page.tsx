import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import DeleteProjectButton from "@/components/DeleteProjectButton";
import { getCurrentUserId } from "@/lib/auth";
import { listProjects } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const projects = await listProjects(userId);

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Manufacturing line planning projects"
        actions={
          <Link href="/projects/new" className="btn-primary">
            + New project
          </Link>
        }
      />
      <div className="p-8">
        {projects.length === 0 ? (
          <div className="card card-pad text-center text-sm text-slate-500">
            No projects yet. Create your first project to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <div key={p.id} className="card card-pad relative hover:border-brand-300 hover:shadow-md">
                {/* Full-card link underneath the content; visible content sits above it with
                    pointer-events disabled so clicks pass through to the link, except for the
                    delete control below, which keeps pointer events so clicking it does not
                    also navigate. */}
                <Link href={`/projects/${p.id}`} className="absolute inset-0 z-0" aria-label={p.name} />
                <div className="pointer-events-none relative z-10">
                  <h3 className="font-semibold text-slate-900">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description || "No description"}</p>
                  <p className="mt-3 text-xs text-slate-400">Created {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <div className="pointer-events-auto relative z-10 mt-3 flex justify-end">
                  <DeleteProjectButton projectId={p.id} projectName={p.name} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
