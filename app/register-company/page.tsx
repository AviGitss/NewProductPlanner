import { redirect } from "next/navigation";
import { registerCompanyAction } from "@/app/actions";
import { getCurrentUserContext } from "@/lib/auth";

export default async function RegisterCompanyPage() {
  const ctx = await getCurrentUserContext();
  if (ctx.companyId) redirect("/dashboard");

  return (
    <div className="mx-auto mt-24 max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">Register your company</h1>
      <p className="mt-2 text-sm text-slate-500">
        You&rsquo;re signed in as <span className="font-medium text-slate-700">{ctx.email}</span>, but you don&rsquo;t
        belong to a company yet. Create one to get started — you&rsquo;ll be its first admin and can invite the rest
        of your team afterwards from Company &rarr; Team.
      </p>
      <form action={registerCompanyAction} className="mt-5 space-y-3">
        <div>
          <label className="label" htmlFor="company_name">
            Company name
          </label>
          <input required id="company_name" name="company_name" className="input" placeholder="e.g. Acme Manufacturing" />
        </div>
        <button type="submit" className="btn-primary w-full">
          Create company
        </button>
      </form>
      <p className="mt-4 text-xs text-slate-400">
        Already invited to an existing company? Ask your admin to invite the exact email address you signed in with (
        {ctx.email}) — you&rsquo;ll be linked to their company automatically next time you log in, instead of seeing
        this page.
      </p>
    </div>
  );
}
