import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useThemeAttribute } from "../lib/useTheme.js";

/**
 * Returns the inline-color palette Recharts needs for the current theme.
 *
 * Dark mode keeps the original violet/pink/cyan/lime palette so the look the
 * project shipped with is preserved. Light mode swaps every accent for a
 * grayscale stop so the page reads strictly monochrome (no purple left over),
 * matching the reference design.
 */
function usePalette() {
  const isLight = useThemeAttribute() === "light";
  if (isLight) {
    return {
      grid: "rgba(0,0,0,0.08)",
      axis: "rgba(0,0,0,0.55)",
      legend: "#3a3a40",
      serialBar: "#9a9aa2",
      parallelBar: "#0a0a0a",
      speedupLine: "#0a0a0a",
      idealLine: "#9a9aa2",
      efficiencyBar: "#2a2a2f",
      cursorTime: "rgba(0,0,0,0.04)",
      cursorEfficiency: "rgba(0,0,0,0.04)",
      tooltip: {
        background: "rgba(255,255,255,0.96)",
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: "12px",
        color: "#0a0a0a",
        fontSize: "12px",
      },
    };
  }
  return {
    grid: "rgba(255,255,255,0.06)",
    axis: "rgba(226,232,240,0.8)",
    legend: "#cbd5e1",
    serialBar: "#ff5dba",
    parallelBar: "#7c5cff",
    speedupLine: "#7c5cff",
    idealLine: "#5cf0ff",
    efficiencyBar: "#a5ff70",
    cursorTime: "rgba(124,92,255,0.08)",
    cursorEfficiency: "rgba(165,255,112,0.08)",
    tooltip: {
      background: "rgba(16,16,35,0.95)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "12px",
      color: "#e2e8f0",
      fontSize: "12px",
    },
  };
}

export function ExecutionTimeChart({ serialTime, parallelResults }) {
  const p = usePalette();
  const data = [
    { label: "Serial", time: Number(serialTime?.toFixed?.(4) ?? serialTime ?? 0), fill: p.serialBar },
    ...parallelResults.map((row) => ({
      label: `Paralel ${row.num_workers}w`,
      time: Number(row.parallel_time.toFixed(4)),
      fill: p.parallelBar,
    })),
  ];
  return (
    <div className="card">
      <h4 className="mb-3 text-sm font-semibold text-white">Waktu eksekusi (detik)</h4>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={p.grid} strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke={p.axis} fontSize={11} />
          <YAxis stroke={p.axis} fontSize={11} />
          <Tooltip contentStyle={p.tooltip} cursor={{ fill: p.cursorTime }} />
          <Bar dataKey="time" radius={[8, 8, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpeedupChart({ parallelResults }) {
  const p = usePalette();
  const data = parallelResults.map((row) => ({
    workers: row.num_workers,
    speedup: Number(row.speedup.toFixed(3)),
    ideal: row.num_workers,
  }));
  return (
    <div className="card">
      <h4 className="mb-3 text-sm font-semibold text-white">Speedup vs jumlah worker</h4>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={p.grid} strokeDasharray="3 3" />
          <XAxis dataKey="workers" stroke={p.axis} fontSize={11} label={{ value: "workers", fill: p.axis, dy: 10, fontSize: 11 }} />
          <YAxis stroke={p.axis} fontSize={11} />
          <Tooltip contentStyle={p.tooltip} />
          <Legend wrapperStyle={{ fontSize: 12, color: p.legend }} />
          <Line type="monotone" dataKey="speedup" stroke={p.speedupLine} strokeWidth={3} dot={{ r: 4 }} name="Speedup terukur" />
          <Line type="monotone" dataKey="ideal" stroke={p.idealLine} strokeDasharray="5 5" strokeWidth={2} dot={false} name="Speedup ideal (linear)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EfficiencyChart({ parallelResults }) {
  const p = usePalette();
  const data = parallelResults.map((row) => ({
    workers: row.num_workers,
    efficiency: Number((row.efficiency * 100).toFixed(2)),
  }));
  return (
    <div className="card">
      <h4 className="mb-3 text-sm font-semibold text-white">Efficiency vs jumlah worker (%)</h4>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={p.grid} strokeDasharray="3 3" />
          <XAxis dataKey="workers" stroke={p.axis} fontSize={11} label={{ value: "workers", fill: p.axis, dy: 10, fontSize: 11 }} />
          <YAxis stroke={p.axis} fontSize={11} domain={[0, 100]} />
          <Tooltip contentStyle={p.tooltip} cursor={{ fill: p.cursorEfficiency }} />
          <Bar dataKey="efficiency" fill={p.efficiencyBar} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function BenchmarkChart({ serialTime, parallelResults }) {
  if (!parallelResults?.length) return null;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <ExecutionTimeChart serialTime={serialTime} parallelResults={parallelResults} />
      <SpeedupChart parallelResults={parallelResults} />
      <EfficiencyChart parallelResults={parallelResults} />
    </div>
  );
}
