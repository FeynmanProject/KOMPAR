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

const GRID = "rgba(255,255,255,0.06)";
const AXIS = "rgba(226,232,240,0.8)";

const tooltipStyle = {
  background: "rgba(16,16,35,0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  color: "#e2e8f0",
  fontSize: "12px",
};

export function ExecutionTimeChart({ serialTime, parallelResults }) {
  const data = [
    { label: "Serial", time: Number(serialTime?.toFixed?.(4) ?? serialTime ?? 0), fill: "#ff5dba" },
    ...parallelResults.map((p) => ({
      label: `Paralel ${p.num_workers}w`,
      time: Number(p.parallel_time.toFixed(4)),
      fill: "#7c5cff",
    })),
  ];
  return (
    <div className="card">
      <h4 className="mb-3 text-sm font-semibold text-white">Waktu eksekusi (detik)</h4>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke={AXIS} fontSize={11} />
          <YAxis stroke={AXIS} fontSize={11} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(124,92,255,0.08)" }} />
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
  const data = parallelResults.map((p) => ({
    workers: p.num_workers,
    speedup: Number(p.speedup.toFixed(3)),
    ideal: p.num_workers,
  }));
  return (
    <div className="card">
      <h4 className="mb-3 text-sm font-semibold text-white">Speedup vs jumlah worker</h4>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="workers" stroke={AXIS} fontSize={11} label={{ value: "workers", fill: AXIS, dy: 10, fontSize: 11 }} />
          <YAxis stroke={AXIS} fontSize={11} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#cbd5e1" }} />
          <Line type="monotone" dataKey="speedup" stroke="#7c5cff" strokeWidth={3} dot={{ r: 4 }} name="Speedup terukur" />
          <Line type="monotone" dataKey="ideal" stroke="#5cf0ff" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Speedup ideal (linear)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EfficiencyChart({ parallelResults }) {
  const data = parallelResults.map((p) => ({
    workers: p.num_workers,
    efficiency: Number((p.efficiency * 100).toFixed(2)),
  }));
  return (
    <div className="card">
      <h4 className="mb-3 text-sm font-semibold text-white">Efficiency vs jumlah worker (%)</h4>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="workers" stroke={AXIS} fontSize={11} label={{ value: "workers", fill: AXIS, dy: 10, fontSize: 11 }} />
          <YAxis stroke={AXIS} fontSize={11} domain={[0, 100]} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(165,255,112,0.08)" }} />
          <Bar dataKey="efficiency" fill="#a5ff70" radius={[8, 8, 0, 0]} />
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
