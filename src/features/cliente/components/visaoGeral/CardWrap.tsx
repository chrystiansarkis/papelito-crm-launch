import { ReactNode } from "react";

export function CardWrap({
  title,
  meta,
  subtitle,
  badge,
  children,
  footer,
}: {
  title: string;
  meta?: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="border border-gray-line rounded-lg bg-white">
      <header className="px-4 py-3 border-b border-gray-line flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-ink">{title}</h2>
            {meta && <span className="text-xs text-gray-faint">· {meta}</span>}
            {badge}
          </div>
          {subtitle && <div className="text-xs text-gray-text mt-0.5">{subtitle}</div>}
        </div>
      </header>
      <div className="p-4">{children}</div>
      {footer && (
        <footer className="px-4 py-2 border-t border-gray-line text-xs text-gray-text">
          {footer}
        </footer>
      )}
    </section>
  );
}