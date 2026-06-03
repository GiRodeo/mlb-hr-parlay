// Recharts wrapper for rolling stat lines. Renders the player's HR rate over
// the last N games against a flat league-average reference line.
"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrendPoint {
  game: number;
  hrRate: number;
  leagueAvg: number;
}

export interface TrendChartProps {
  data: TrendPoint[];
  height?: number;
  /** Display label for the value series. */
  seriesLabel?: string;
  className?: string;
}

const NAVY = "#0F2044";
const GREEN = "#00C853";

export function TrendChart({ data, height = 240, seriesLabel = "HR rate", className }: TrendChartProps) {
  const leagueAvg = data[0]?.leagueAvg ?? 0;

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GREEN} stopOpacity={0.25} />
              <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E8EC" vertical={false} />
          <XAxis
            dataKey="game"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            label={{ value: "Games ago", position: "insideBottom", offset: -2, fontSize: 10, fill: "#9CA3AF" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #E5E8EC", fontSize: 12 }}
            formatter={(v: number) => [v.toFixed(3), seriesLabel]}
            labelFormatter={(l) => `Game ${l}`}
          />
          <ReferenceLine
            y={leagueAvg}
            stroke="#9CA3AF"
            strokeDasharray="4 4"
            label={{ value: "Lg avg", position: "right", fontSize: 10, fill: "#9CA3AF" }}
          />
          <Area type="monotone" dataKey="hrRate" stroke="none" fill="url(#trendFill)" />
          <Line
            type="monotone"
            dataKey="hrRate"
            stroke={NAVY}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: NAVY }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
