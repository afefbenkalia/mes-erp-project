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

const COLORS = ["#2563eb", "#0d9488", "#7c3aed", "#ea580c", "#db2777", "#ca8a04"];

const defaultData = [];

/**
 * @param {{ data?: { machine: string; quantity: number }[] }} props
 */
export default function MachineChart({ data = defaultData }) {
  return (
    <div className="h-72 w-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 32 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="machine"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: "rgb(241 245 249 / 0.6)" }}
            contentStyle={{
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgb(15 23 42 / 8%)",
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "TRS"]}
          />
          <Bar
            dataKey="quantity"
            radius={[6, 6, 0, 0]}
            animationDuration={800}
            maxBarSize={48}
          >
            {data.map((_, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
