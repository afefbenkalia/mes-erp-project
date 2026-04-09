import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const SLICE_COLORS = {
  Availability: "#0d9488",
  Performance: "#2563eb",
  Quality: "#a855f7",
};

const defaultBreakdown = { availability: 0, performance: 0, quality: 0 };

/**
 * Doughnut chart for OEE component scores (each is a %; slice size reflects relative weight).
 * @param {{ breakdown?: { availability: number; performance: number; quality: number } }} props
 */
export default function OeeChart({ breakdown = defaultBreakdown }) {
  const data = [
    { name: "Availability", value: Math.max(0, breakdown.availability) },
    { name: "Performance", value: Math.max(0, breakdown.performance) },
    { name: "Quality", value: Math.max(0, breakdown.quality) },
  ];

  return (
    <div className="h-72 w-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="52%"
            outerRadius="78%"
            paddingAngle={2}
            animationDuration={900}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={SLICE_COLORS[entry.name] || "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
            contentStyle={{
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgb(15 23 42 / 8%)",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-sm text-slate-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
