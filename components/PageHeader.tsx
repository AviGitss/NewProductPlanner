import Link from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

export default function PageHeader({
  title,
  subtitle,
  crumbs,
  actions,
}: {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="no-print border-b border-slate-200 bg-white px-8 py-5">
      {crumbs && crumbs.length > 0 && (
        <div className="mb-1 flex items-center gap-1 text-xs text-slate-400">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {c.href ? (
                <Link href={c.href} className="hover:text-slate-600">
                  {c.label}
                </Link>
              ) : (
                <span>{c.label}</span>
              )}
              {i < crumbs.length - 1 && <span>/</span>}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
