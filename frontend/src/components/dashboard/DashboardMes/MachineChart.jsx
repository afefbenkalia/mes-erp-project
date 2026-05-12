import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

const COLORS = [
  "#1E3A8A",
  "#1D4ED8",
  "#2563EB",
  "#3B82F6",
  "#60A5FA",
  "#93C5FD",
  "#0F766E",
  "#0369A1",
  "#0284C7",
  "#38BDF8",
  "#334155",
  "#64748B",
];

const defaultData = [];

/**
 * @param {{ data?: { machine: string; quantity: number }[] }} props
 */
export default function MachineChart({ data = defaultData }) {
  return (
    <div className="h-44 w-full min-h-[180px]">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 2, right: 6, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="machine"
            tick={{ fontSize: 9, fill: "#111827" }}
            tickLine={false}
            axisLine={{ stroke: "#E5E7EB" }}
            interval={0}
            angle={-16}
            textAnchor="end"
            height={30}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#111827" }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            cursor={{ fill: "rgb(243 244 246 / 0.75)" }}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #E5E7EB",
              backgroundColor: "#F3F4F6",
              color: "#111827",
              boxShadow: "0 8px 24px rgb(15 23 42 / 10%)",
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "TRS"]}
          />
          <Bar
            dataKey="quantity"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            maxBarSize={28}
          >
            {data.map((_, i) => (
              <Cell
                key={`cell-${i}`}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.95}
                stroke="#ffffff"
                strokeOpacity={0.9}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
