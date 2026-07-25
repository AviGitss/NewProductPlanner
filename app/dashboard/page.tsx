import Link from "next/link";
import PageHeader from "@/components/PageHeader";
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
              <Link key={p.id} href={`/projects/${p.id}`} className="card card-pad block hover:border-brand-300 hover:shadow-md">
                <h3 className="font-semibold text-slate-900">{p.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description || "No description"}</p>
                <p className="mt-3 text-xs text-slate-400">Created {new Date(p.created_at).toLocaleDateString()}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
