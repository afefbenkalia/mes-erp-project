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
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-900">
            {value}
            {suffix ? (
              <span className="ml-1 text-lg font-medium text-slate-600">{suffix}</span>
            ) : null}
          </p>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
