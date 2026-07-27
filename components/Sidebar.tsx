import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/data";
import SignOutButton from "./SignOutButton";
import SidebarContextNav from "./SidebarContextNav";
import SidebarGuide from "./SidebarGuide";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Projects" },
];

export default async function Sidebar() {
  const user = await getCurrentUser();

  return (
    <aside className="no-print flex h-screen w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
          MP
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">MfgPlan</div>
          <div className="text-[11px] leading-tight text-slate-400">Line Planning Platform</div>
        </div>
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
        <div>{user?.email || "demo@mfgplan.local"}</div>
        {isSupabaseConfigured && <SignOutButton />}
      </div>
    </aside>
  );
}
