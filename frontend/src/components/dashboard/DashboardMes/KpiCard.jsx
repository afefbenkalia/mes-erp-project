import React from "react";

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string|number} props.value
 * @param {string} [props.suffix]
 * @param {string} [props.subtitle]
 * @param {React.ComponentType<{ className?: string }>} [props.icon]
 * @param {string} [props.iconClassName] — Tailwind classes for icon wrapper
 */
export default function KpiCard({
  title,
  value,
  suffix,
  subtitle,
  icon: Icon,
  iconClassName = "bg-slate-100 text-slate-700",
}) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-200/40 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900">
            {value}
            {suffix ? (
              <span className="ml-1 text-sm font-medium text-slate-600">{suffix}</span>
            ) : null}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
