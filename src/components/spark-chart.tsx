import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import type { Point } from "@/lib/market/types";

export function SparkChart({
  symbol,
  points,
  tone,
}: {
  symbol: string;
  points: Point[];
  tone: "up" | "down" | "flat";
}) {
  const color =
    tone === "up" ? "var(--color-up)" : tone === "down" ? "var(--color-down)" : "var(--color-muted)";
  const id = `spark-${symbol.replace(/\W/g, "")}`;
  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <YAxis
            hide
            domain={([min, max]: [number, number]) => {
              if (min === max) return [min * 0.999, max * 1.001];
              const pad = (max - min) * 0.18;
              return [min - pad, max + pad];
            }}
          />
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="c"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${id})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
