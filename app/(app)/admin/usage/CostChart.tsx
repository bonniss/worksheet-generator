"use client";
import { useState } from "react";

type Point = { day: string; usd: number; calls: number };

// Mốc trục y "tròn" (1, 2, 5 × 10^n) để nhãn dễ đọc
function niceMax(v: number): number {
  if (v <= 0) return 0.01;
  const exp = Math.floor(Math.log10(v));
  const f = v / 10 ** exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * 10 ** exp;
}

const fmtUsd = (v: number) => (v === 0 ? "$0" : v < 0.01 ? `$${v.toFixed(4)}` : v < 1 ? `$${v.toFixed(3)}` : `$${v.toFixed(2)}`);
const fmtDay = (d: string) => { const [, m, day] = d.split("-"); return `${Number(day)}/${Number(m)}`; };

/** Cột chi phí theo ngày: một chuỗi, một màu (primary) — tiêu đề card đã nói đang vẽ gì nên không cần chú giải. */
export function CostChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 220, padL = 52, padR = 8, padT = 12, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = niceMax(Math.max(...data.map((d) => d.usd)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  // Cùng số chữ số thập phân cho mọi mốc trục, suy từ khoảng cách giữa hai mốc
  const tickDecimals = Math.max(...ticks.map((t) => (t.toFixed(6).replace(/0+$/, "").split(".")[1] ?? "").length));
  const fmtTick = (v: number) => (v === 0 ? "$0" : `$${v.toFixed(tickDecimals)}`);
  const band = plotW / data.length;
  const barW = Math.min(24, band - 2); // ≤ 24px, chừa khe 2px giữa các cột
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const total = data.reduce((s, d) => s + d.usd, 0);
  const h = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Chi phí AI theo ngày, 30 ngày gần nhất, tổng ${fmtUsd(total)}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#F4F4F5" strokeWidth={1} />
              <text x={padL - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#71717A" style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmtTick(t)}
              </text>
            </g>
          ))}
          <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="#E4E4E7" strokeWidth={1} />
          {data.map((d, i) => {
            const cx = padL + band * i + band / 2;
            const top = y(d.usd);
            const hgt = y(0) - top;
            const r = Math.min(4, hgt, barW / 2);
            const x0 = cx - barW / 2, x1 = cx + barW / 2, yb = y(0);
            // Bo góc 4px ở đầu cột, vuông ở chân
            const path = hgt <= 0 ? "" :
              `M${x0},${yb} L${x0},${top + r} Q${x0},${top} ${x0 + r},${top} L${x1 - r},${top} Q${x1},${top} ${x1},${top + r} L${x1},${yb} Z`;
            const showLabel = i === 0 || i === data.length - 1 || i % 5 === 0;
            return (
              <g key={d.day}>
                {path && <path d={path} fill={hover === null || hover === i ? "#2563EB" : "#93B4F5"} />}
                {showLabel && (
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="#71717A">{fmtDay(d.day)}</text>
                )}
                {/* Vùng bắt chuột phủ cả dải, lớn hơn thân cột */}
                <rect
                  x={padL + band * i} y={padT} width={band} height={plotH} fill="transparent"
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}
                  aria-label={`${fmtDay(d.day)}: ${fmtUsd(d.usd)}, ${d.calls} lượt gọi`}
                />
              </g>
            );
          })}
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs text-white shadow-medium"
            style={{ left: `${((padL + band * hover + band / 2) / W) * 100}%`, top: `${(y(h.usd) / H) * 100}%`, marginTop: -8 }}
          >
            <div className="font-semibold">{fmtDay(h.day)}</div>
            <div>{fmtUsd(h.usd)} · {h.calls} lượt gọi</div>
          </div>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-[13px] text-zinc-500 hover:text-primary">Xem dạng bảng</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-solid border-zinc-100">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-white text-left text-zinc-500">
              <tr><th className="px-3 py-2 font-medium">Ngày</th><th className="px-3 py-2 text-right font-medium">Lượt gọi</th><th className="px-3 py-2 text-right font-medium">Chi phí</th></tr>
            </thead>
            <tbody className="tabular-nums">
              {[...data].reverse().map((d) => (
                <tr key={d.day} className="border-0 border-t border-solid border-zinc-100">
                  <td className="px-3 py-1.5">{fmtDay(d.day)}</td>
                  <td className="px-3 py-1.5 text-right">{d.calls}</td>
                  <td className="px-3 py-1.5 text-right">{fmtUsd(d.usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
