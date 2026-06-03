// Reliability (calibration) chart. Plots observed HR rate vs. the model's
// predicted probability per bucket, against the y=x "perfectly calibrated"
// diagonal. Points below the line = the model was overconfident in that
// bucket; above = underconfident.
"use client";
import {
  CartesianGrid, Line, ComposedChart, ReferenceLine,
  ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import type { CalibrationSummary } from "@/types";

const NAVY = "#0F2044";
const GREEN = "#00C853";

export function ReliabilityChart({ data, height = 320 }: { data: CalibrationSummary; height?: number }) {
  // Convert to percentage points for readable axes.
  const points = data.bins.map((b) => ({
    predicted: Number((b.predictedRate * 100).toFixed(1)),
    observed: Number((b.observedRate * 100).toFixed(1)),
    count: b.count,
  }));
  // Diagonal endpoints span the data range.
  const maxAxis = Math.ceil(Math.max(10, ...points.map((p) => Math.max(p.predicted, p.observed))) / 5) * 5;
  const diagonal = [{ predicted: 0, observed: 0 }, { predicted: maxAxis, observed: maxAxis }];

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 8, right: 16, left: 4, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E8EC" />
          <XAxis
            type="number" dataKey="predicted" domain={[0, maxAxis]}
            tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v) => `${v}%`}
            label={{ value: "Predicted HR probability", position: "insideBottom", offset: -8, fontSize: 11, fill: "#9CA3AF" }}
          />
          <YAxis
            type="number" dataKey="observed" domain={[0, maxAxis]}
            tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v) => `${v}%`}
            label={{ value: "Observed HR rate", angle: -90, position: "insideLeft", fontSize: 11, fill: "#9CA3AF" }}
          />
          <ZAxis type="number" dataKey="count" range={[60, 400]} name="samples" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #E5E8EC", fontSize: 12 }}
            formatter={(v: number, name: string) => [`${v}%`, name === "observed" ? "Observed" : name]}
            labelFormatter={() => ""}
          />
          {/* perfect-calibration reference diagonal */}
          <Line
            data={diagonal} dataKey="observed" dot={false} stroke="#9CA3AF"
            strokeDasharray="5 5" strokeWidth={1.5} isAnimationActive={false} legendType="none"
          />
          {/* model points; size ∝ sample count */}
          <Scatter data={points} fill={GREEN} stroke={NAVY} strokeWidth={1} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
