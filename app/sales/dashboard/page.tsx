import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getCurrentUserContext } from "@/lib/auth";
import { listProjects } from "@/lib/data";
import { canViewSalesDashboard } from "@/lib/rbac";
import { RFP_STAGE_LABELS, RFP_STAGE_ORDER, RFP_STAGE_OWNER } from "@/lib/rfpWorkflow";
import { ROLE_LABELS } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function SalesDashboardPage() {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) redirect("/register-company");
  if (!canViewSalesDashboard(ctx)) redirect("/dashboard");

  const projects = await listProjects(ctx.companyId);
  const byStage = RFP_STAGE_ORDER.reduce<Record<string, typeof projects>>((acc, stage) => {
    acc[stage] = projects.filter((p) => p.rfp_stage === stage);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Sales — RFP progress" subtitle="Every RFP across the company, by stage" />
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {RFP_STAGE_ORDER.map((stage) => (
            <div key={stage} className="card card-pad text-center">
              <div className="text-2xl font-semibold text-brand-700">{byStage[stage]?.length ?? 0}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">{RFP_STAGE_LABELS[stage]}</div>
            </div>
          ))}
        </div>

        <section className="card card-pad">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">All RFPs</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2">Name</th>
                <th className="pb-2">Stage</th>
                <th className="pb-2">Waiting on</th>
                <th className="pb-2">Last moved</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const owner = RFP_STAGE_OWNER[p.rfp_stage];
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2">
                      <Link href={`/projects/${p.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-2">
                      <span className="badge bg-brand-100 text-brand-700">{RFP_STAGE_LABELS[p.rfp_stage]}</span>
                    </td>
                    <td className="py-2 text-slate-500">{owner ? ROLE_LABELS[owner] : "—"}</td>
                    <td className="py-2 text-slate-400">{new Date(p.rfp_stage_updated_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No RFPs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
