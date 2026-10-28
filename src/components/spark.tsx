import { useEffect, useState } from "react";
import type { Point } from "@/lib/market/types";

export function Spark({
  symbol,
  points,
  tone,
}: {
  symbol: string;
  points: Point[];
  tone: "up" | "down" | "flat";
}) {
  const [Chart, setChart] = useState<typeof import("./spark-chart").SparkChart | null>(null);

  useEffect(() => {
    let live = true;
    void import("./spark-chart").then((mod) => {
      if (live) setChart(() => mod.SparkChart);
    });
    return () => {
      live = false;
    };
  }, []);

  if (points.length < 2) {
    return <div className="flex h-14 items-center text-sm text-muted">分时还没形成</div>;
  }
  if (!Chart) return <div className="h-14 w-full" />;
  return <Chart symbol={symbol} points={points} tone={tone} />;
}
