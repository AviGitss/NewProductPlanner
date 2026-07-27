"use client";

// Client wrapper deciding whether to show the app sidebar. `Sidebar` itself
// is an async server component (it fetches the current user), so it can't
// be conditionally invoked from a client component's hook — instead the
// server layout renders it unconditionally and passes the resulting React
// node in as `sidebar`; this component only decides whether to display it,
// based on the current route.

import { usePathname } from "next/navigation";

export default function AppChrome({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Marketing landing page and login screen only — every other route keeps the sidebar.
  const hideSidebar = pathname === "/" || pathname === "/login";

  return (
    <div className="flex min-h-screen">
      {!hideSidebar && sidebar}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
