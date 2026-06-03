// Bankroll-over-time chart. Plots running bankroll after each settled bet,
// with a dashed reference line at the starting bankroll so up/down is obvious.
"use client";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { BankrollPoint } from "@/types";

const NAVY = "#0F2044";
const GREEN = "#00C853";
const RED = "#E53935";

export function BankrollChart({
  curve, starting, height = 280,
}: {
  curve: BankrollPoint[]; starting: number; height?: number;
}) {
  if (curve.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No settled bets yet to chart.</p>;
  }
  const last = curve[curve.length - 1]!.bankroll;
  const up = last >= starting;
  const stroke = up ? GREEN : RED;
  // Include the starting point at index 0 so the line begins at baseline.
  const data = [{ index: 0, bankroll: starting, label: "Start", date: "" }, ...curve];

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="bkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E8EC" vertical={false} />
          <XAxis dataKey="index" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6B7280" }}
            label={{ value: "Settled bet #", position: "insideBottom", offset: -2, fontSize: 10, fill: "#9CA3AF" }} />
          <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "#6B7280" }}
            tickFormatter={(v: number) => `${v}u`} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #E5E8EC", fontSize: 12 }}
            formatter={(v: number) => [`${v.toFixed(2)}u`, "Bankroll"]}
            labelFormatter={(l, p) => {
              const pt = p?.[0]?.payload as BankrollPoint | undefined;
              return pt && pt.label !== "Start" ? `#${l}: ${pt.label}` : "Start";
            }}
          />
          <ReferenceLine y={starting} stroke="#9CA3AF" strokeDasharray="4 4"
            label={{ value: "start", position: "right", fontSize: 10, fill: "#9CA3AF" }} />
          <Area type="monotone" dataKey="bankroll" stroke={stroke} strokeWidth={2.5}
            fill="url(#bkFill)" dot={false} activeDot={{ r: 4, fill: NAVY }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
