"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

export function SalesVelocityChart({ data }: { data: { name: string; total: number }[] }) {
  if (!data?.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-zinc-500">
        No sales data in this window.
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
          <XAxis 
            dataKey="name" 
            stroke="#888" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#888" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            cursor={{ fill: "rgba(255, 193, 5, 0.05)" }}
            contentStyle={{ backgroundColor: "#1a1814", borderColor: "#333", borderRadius: "12px", border: "1px solid rgba(255,193,5,0.2)" }}
            itemStyle={{ color: "#ffc105" }}
            labelStyle={{ color: "#888" }}
          />
          <Bar dataKey="total" fill="#ffc105" radius={[4, 4, 0, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
