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
  Disponibilité: "#0d9488",
  Performance: "#2563eb",
  Qualité: "#a855f7",
};

const defaultBreakdown = { availability: 0, performance: 0, quality: 0 };

export default function OeeChart({ breakdown = defaultBreakdown }) {
  const data = [
    { name: "Disponibilité", value: Math.max(0, breakdown.availability) },
    { name: "Performance", value: Math.max(0, breakdown.performance) },
    { name: "Qualité", value: Math.max(0, breakdown.quality) },
  ];

  return (
    <div className="h-full w-full min-h-[125px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="32%"
            outerRadius="48%"
            paddingAngle={2}
            isAnimationActive={false}
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
            iconSize={6}
            wrapperStyle={{ paddingTop: 2 }}
            formatter={(value) => (
              <span className="text-[10px] text-slate-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
