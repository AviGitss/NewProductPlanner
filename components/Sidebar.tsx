import Link from "next/link";
import Image from "next/image";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { getCurrentUser, getCompany } from "@/lib/data";
import { getCurrentUserContext } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/rbac";
import SignOutButton from "./SignOutButton";
import SidebarContextNav from "./SidebarContextNav";
import SidebarGuide from "./SidebarGuide";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Projects" },
];

export default async function Sidebar() {
  const user = await getCurrentUser();
  const ctx = await getCurrentUserContext();
  const company = ctx.companyId ? await getCompany(ctx.companyId) : null;

  return (
    <aside className="no-print flex h-screen w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center border-b border-slate-200 px-5 py-4">
        <Image src="/logo.png" alt="Open Netrikkan" width={140} height={35} priority className="h-7 w-auto" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className="space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
          {(ctx.role === "admin" || ctx.role === "sales") && (
            <Link
              href="/sales/dashboard"
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Sales dashboard
            </Link>
          )}
          {(ctx.role === "admin" || ctx.role === "rfp_prep") && (
            <Link
              href="/company/master-data"
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Master data
            </Link>
          )}
          {ctx.role === "admin" && (
            <Link
              href="/company/team"
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Team
            </Link>
          )}
        </nav>

        <SidebarContextNav />

        <SidebarGuide />
      </div>

      <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-400">
        <div className="mb-1 flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${isSupabaseConfigured ? "bg-emerald-500" : "bg-amber-500"}`}
          />
          {isSupabaseConfigured ? "Supabase connected" : "Demo mode (mock data)"}
        </div>
        {company && <div className="truncate font-medium text-slate-500">{company.name}</div>}
        <div className="truncate">
          {user?.email || "demo@mfgplan.local"}
          {ctx.role && <span className="ml-1 text-slate-300">&middot; {ROLE_LABELS[ctx.role]}</span>}
        </div>
        {isSupabaseConfigured && <SignOutButton />}
      </div>
    </aside>
  );
}
