import type { Quote } from "./types";

export function formatPrice(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPct(n: number) {
  const rounded = Math.round(n * 100) / 100;
  if (rounded === 0) return "0.00%";
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(2)}%`;
}

export function formatChange(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatVol(n: number) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}亿`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)}万`;
  if (n <= 0) return "—";
  return n.toLocaleString("en-US");
}

export function formatClock(ms: number, timeZone: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(ms);
}

export function formatRemain(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}秒`;
  return `${m}分${r.toString().padStart(2, "0")}秒`;
}

export function windowPhrase(minutes: number | null) {
  if (minutes == null || (minutes >= 8 && minutes <= 12)) return "近十分钟";
  return `近${minutes}分钟`;
}

export function formatAgo(timeMs: number, nowMs: number) {
  const d = Math.max(0, nowMs - timeMs);
  if (d < 60_000) return "刚刚";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}分钟前`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}小时前`;
  return `${Math.floor(d / 86_400_000)}天前`;
}

export function toneOf(pct: number | null): "up" | "down" | "flat" {
  if (pct == null || Math.abs(pct) < 0.05) return "flat";
  return pct > 0 ? "up" : "down";
}

export function trendWord(pct: number | null) {
  if (pct == null || Math.abs(pct) < 0.05) return "横盘";
  if (pct >= 0.45) return "急升";
  if (pct <= -0.45) return "急跌";
  return pct > 0 ? "走强" : "走弱";
}

export function toneClass(tone: "up" | "down" | "flat") {
  if (tone === "up") return "text-up";
  if (tone === "down") return "text-down";
  return "text-muted";
}

export function rangePos(q: Quote) {
  const span = q.dayHigh - q.dayLow;
  if (span <= 0) return 50;
  return Math.min(100, Math.max(0, ((q.price - q.dayLow) / span) * 100));
}
