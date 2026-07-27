"use client";

// Contextual navigation shown in the sidebar whenever the current route is
// inside a project (and optionally an iteration). Sidebar itself is an
// async server component with no access to the current route's dynamic
// params, so this piece reads the pathname on the client and derives the
// relevant ids via regex against known route shapes.

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, pathname, children }: { href: string; pathname: string; children: React.ReactNode }) {
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-1.5 text-sm ${
        isActive ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}

export default function SidebarContextNav() {
  const pathname = usePathname();

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const rawProjectSegment = projectMatch?.[1];
  // "/projects/new" is the static "create a new project" route, not a
  // project detail page — don't treat "new" as a project id.
  const projectId = rawProjectSegment && rawProjectSegment !== "new" ? rawProjectSegment : undefined;
  if (!projectId) return null;

  // Only treat the segment after /iterations/ as an iteration id when it's
  // not the "compare" or list route, e.g.:
  //   /projects/abc/iterations              -> no iteration id
  //   /projects/abc/iterations/compare      -> no iteration id
  //   /projects/abc/iterations/xyz          -> iteration id "xyz"
  //   /projects/abc/iterations/xyz/flow     -> iteration id "xyz"
  const iterationMatch = pathname.match(/^\/projects\/[^/]+\/iterations\/([^/]+)/);
  const rawIterationSegment = iterationMatch?.[1];
  const iterationId = rawIterationSegment && rawIterationSegment !== "compare" ? rawIterationSegment : undefined;

  return (
    <div className="mt-2 border-t border-slate-200 pt-3">
      <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">This project</div>
      <NavLink href={`/projects/${projectId}`} pathname={pathname}>
        Overview
      </NavLink>
      <NavLink href={`/projects/${projectId}/components/new`} pathname={pathname}>
        Add component
      </NavLink>
      <NavLink href={`/projects/${projectId}/iterations`} pathname={pathname}>
        Iteration history
      </NavLink>
      <NavLink href={`/projects/${projectId}/recommended`} pathname={pathname}>
        Recommended flow
      </NavLink>

      {iterationId && (
        <>
          <div className="mt-3 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">This iteration</div>
          <NavLink href={`/projects/${projectId}/iterations/${iterationId}`} pathname={pathname}>
            Digital thread
          </NavLink>
          <NavLink href={`/projects/${projectId}/iterations/${iterationId}/recommendations`} pathname={pathname}>
            Machine recommendations
          </NavLink>
          <NavLink href={`/projects/${projectId}/iterations/${iterationId}/flow`} pathname={pathname}>
            Process flow
          </NavLink>
          <NavLink href={`/projects/${projectId}/iterations/${iterationId}/line`} pathname={pathname}>
            Line & KPIs
          </NavLink>
          <NavLink href={`/projects/${projectId}/iterations/${iterationId}/twin`} pathname={pathname}>
            Digital twin
          </NavLink>
          <NavLink href={`/projects/${projectId}/iterations/${iterationId}/report`} pathname={pathname}>
            Report
          </NavLink>
        </>
      )}
    </div>
  );
}
