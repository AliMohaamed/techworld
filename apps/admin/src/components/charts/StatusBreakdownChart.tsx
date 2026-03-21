"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#ffc105", "#4CAF50", "#2196F3", "#F44336", "#9C27B0", "#FF9800", "#795548", "#9E9E9E", "#607D8B"];

export function StatusBreakdownChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data?.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-zinc-500">
        No orders found.
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: "#1a1814", borderColor: "#333", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}
            itemStyle={{ color: "#fff", textTransform: "capitalize" }}
            labelClassName="hidden"
          />
          <Legend 
            wrapperStyle={{ paddingTop: "20px" }}
            formatter={(value) => <span className="text-[11px] uppercase tracking-[0.1em] text-zinc-400">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
