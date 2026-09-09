import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import TeamMemberRow from "@/components/TeamMemberRow";
import { inviteCompanyMemberAction } from "@/app/actions";
import { getCurrentUserContext } from "@/lib/auth";
import { getCompany, listCompanyMembers } from "@/lib/data";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) redirect("/register-company");

  const [company, members] = await Promise.all([getCompany(ctx.companyId), listCompanyMembers(ctx.companyId)]);
  const isAdmin = ctx.role === "admin";

  return (
    <div>
      <PageHeader title={company?.name ?? "Company"} subtitle="Team members & roles" />
      <div className="space-y-6 p-8">
        <section className="card card-pad">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">What each role can do</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ROLES.map((r) => (
              <div key={r}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-brand-600">{ROLE_LABELS[r]}</dt>
                <dd className="text-sm text-slate-500">{ROLE_DESCRIPTIONS[r]}</dd>
              </div>
            ))}
          </dl>
        </section>

        {isAdmin && (
          <section className="card card-pad">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Invite a teammate</h2>
            <form action={inviteCompanyMemberAction} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input required id="email" name="email" type="email" className="input" placeholder="teammate@company.com" />
              </div>
              <div>
                <label className="label" htmlFor="role">
                  Role
                </label>
                <select id="role" name="role" className="input" defaultValue="rfp_prep">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary">
                Send invite
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-400">
              There&rsquo;s no email system wired up yet — let them know directly. They&rsquo;ll be linked in
              automatically the moment they sign up or log in with this exact email address.
            </p>
          </section>
        )}

        <section className="card card-pad">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Members ({members.length})</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2 font-semibold">Email</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2 font-semibold">Role</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) =>
                isAdmin ? (
                  <TeamMemberRow key={m.id} member={m} isSelf={m.user_id === ctx.userId} />
                ) : (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 text-sm text-slate-700">{m.invited_email ?? m.user_id}</td>
                    <td className="py-2 pr-4 text-sm text-slate-500">{m.status}</td>
                    <td className="py-2 pr-4 text-sm text-slate-500">{ROLE_LABELS[m.role]}</td>
                    <td className="py-2"></td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {!isAdmin && <p className="mt-3 text-xs text-slate-400">Only admins can invite, change roles, or remove teammates.</p>}
        </section>
      </div>
    </div>
  );
}
