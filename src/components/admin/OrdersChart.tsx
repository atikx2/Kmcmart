"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { taka } from "@/lib/format";

type Point = { label: string; orders: number; revenue: number };

const W = 820;
const H = 290;
const PL = 52;
const PR = 16;
const PT = 18;
const PB = 34;

function niceMax(v: number): number {
  if (v <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const nice = n <= 1.2 ? 1.2 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 6 ? 6 : n <= 8 ? 8 : 10;
  return nice * pow;
}

function compact(n: number): string {
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}

export default function OrdersChart({ data }: { data: Point[] }) {
  const [mode, setMode] = useState<"revenue" | "orders">("revenue");
  const [hover, setHover] = useState<number | null>(null);

  const n = data.length;
  const values = useMemo(() => data.map((d) => (mode === "revenue" ? d.revenue : d.orders)), [data, mode]);
  const maxY = niceMax(Math.max(...values, 1));

  const step = (W - PL - PR) / Math.max(n - 1, 1);
  const x = (i: number) => PL + i * step;
  const y = (v: number) => PT + (H - PT - PB) * (1 - v / maxY);

  const points = values.map((v, i) => [x(i), y(v)] as const);

  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      const mx = (x0 + x1) / 2;
      d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  }, [points]);

  const areaPath = `${linePath} L ${points[n - 1]?.[0] ?? 0} ${H - PB} L ${points[0]?.[0] ?? 0} ${H - PB} Z`;

  const gridVals = [0.25, 0.5, 0.75, 1].map((f) => maxY * f);

  return (
    <div>
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5">
            <span className="grad-bg text-white rounded-xl p-2">
              <BarChart3 size={15} />
            </span>
            Sales Overview
          </h2>
          <p className="text-[11.5px] font-bold text-gray-400 mt-1.5 ml-[2px]">Last 30 days performance</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
          {(["revenue", "orders"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-full text-[11.5px] font-extrabold capitalize transition-all ${
                mode === m ? "grad-bg text-white shadow-md" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* chart */}
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="kmcArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--g2)" }} stopOpacity="0.28" />
              <stop offset="100%" style={{ stopColor: "var(--g1)" }} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="kmcLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" style={{ stopColor: "var(--g1)" }} />
              <stop offset="100%" style={{ stopColor: "var(--g2)" }} />
            </linearGradient>
            <linearGradient id="kmcBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--g2)" }} />
              <stop offset="100%" style={{ stopColor: "var(--g1)" }} />
            </linearGradient>
          </defs>

          {/* grid */}
          {gridVals.map((v) => (
            <g key={v}>
              <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="#eeeef3" strokeWidth="1" strokeDasharray="4 5" />
              <text x={PL - 8} y={y(v) + 4} textAnchor="end" fontSize="10.5" fontWeight="700" fill="#a3a6b3">
                {compact(v)}
              </text>
            </g>
          ))}
          <line x1={PL} x2={W - PR} y1={H - PB} y2={H - PB} stroke="#e4e4ea" strokeWidth="1.2" />

          {/* x labels (every 5th) */}
          {data.map((d, i) =>
            i % 5 === 0 ? (
              <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#a3a6b3">
                {d.label}
              </text>
            ) : null
          )}

          {/* bars or area */}
          {mode === "orders"
            ? values.map((v, i) => {
                const bw = Math.min(26, step * 0.6);
                const bh = Math.max(v === 0 ? 2 : 3, (H - PT - PB) * (v / maxY));
                return (
                  <rect
                    key={i}
                    x={x(i) - bw / 2}
                    y={H - PB - bh}
                    width={bw}
                    height={bh}
                    rx="4"
                    fill="url(#kmcBar)"
                    opacity={hover === null || hover === i ? 1 : 0.35}
                    className="transition-opacity duration-150"
                  />
                );
              })
            : (
              <>
                <path d={areaPath} fill="url(#kmcArea)" />
                <path d={linePath} fill="none" stroke="url(#kmcLine)" strokeWidth="2.6" strokeLinecap="round" />
                {hover !== null && (
                  <>
                    <line
                      x1={x(hover)}
                      x2={x(hover)}
                      y1={PT}
                      y2={H - PB}
                      stroke="#ddd"
                      strokeWidth="1"
                      strokeDasharray="3 4"
                    />
                    <circle cx={x(hover)} cy={y(values[hover])} r="5.5" fill="#fff" stroke="var(--g2)" strokeWidth="2.6" />
                  </>
                )}
              </>
            )}

          {/* hover zones */}
          {data.map((_, i) => (
            <rect
              key={i}
              x={x(i) - step / 2}
              y={PT}
              width={step}
              height={H - PT - PB}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>

        {/* tooltip */}
        {hover !== null && data[hover] && (
          <div
            className="absolute pointer-events-none z-10 -translate-x-1/2 -translate-y-full bg-gray-900 text-white rounded-xl px-3.5 py-2.5 shadow-xl text-center"
            style={{
              left: `${(x(hover) / W) * 100}%`,
              top: `calc(${(y(values[hover]) / H) * 100}% - 12px)`,
            }}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/60 whitespace-nowrap">
              {data[hover].label}
            </p>
            <p className="text-[13px] font-extrabold whitespace-nowrap mt-0.5">
              {taka(data[hover].revenue)}
            </p>
            <p className="text-[10.5px] font-bold text-white/70 whitespace-nowrap">
              {data[hover].orders} order{data[hover].orders === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </div>

      {/* footer legend */}
      <div className="mt-3 flex items-center justify-center gap-5 text-[11px] font-extrabold text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full grad-bg inline-block" />
          Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-300 inline-block" />
          Orders Count
        </span>
      </div>
    </div>
  );
}
