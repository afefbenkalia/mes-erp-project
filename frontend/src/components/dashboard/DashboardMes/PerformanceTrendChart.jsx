import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const defaultData = [];

/**
 * @param {{ data?: { label: string; performance: number }[] }} props
 */
export default function PerformanceTrendChart({ data = defaultData }) {
  return (
    <div className="h-44 w-full min-h-[180px]">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={28}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgb(15 23 42 / 8%)",
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Performance (%)"]}
          />
          <Line
            type="monotone"
            dataKey="performance"
            stroke="#0d9488"
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
