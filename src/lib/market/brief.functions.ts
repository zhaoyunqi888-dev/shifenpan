import { createServerFn } from "@tanstack/react-start";
import { windowPhrase } from "./format";
import type { BriefPayload, BriefResult, MarketState } from "./types";

const STATES = new Set<MarketState>(["open", "pre", "post", "closed"]);
const cache = new Map<string, { at: number; text: string }>();
let stamps: number[] = [];

function text(v: unknown, max: number) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function num(v: unknown) {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function nullable(v: unknown) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parsePayload(input: unknown): BriefPayload {
  if (!input || typeof input !== "object") throw new Error("缺少快报内容");
  const o = input as Partial<BriefPayload>;
  const state = STATES.has(o.marketState as MarketState)
    ? (o.marketState as MarketState)
    : "closed";
  const indices = Array.isArray(o.indices) ? o.indices.slice(0, 4) : [];
  const sectors = Array.isArray(o.sectors) ? o.sectors.slice(0, 11) : [];
  const focus = Array.isArray(o.focus) ? o.focus.slice(0, 4) : [];
  const headlines = Array.isArray(o.headlines) ? o.headlines.slice(0, 8) : [];
  return {
    marketState: state,
    indices: indices.map((row) => ({
      label: text((row as { label?: unknown }).label, 16),
      price: num((row as { price?: unknown }).price),
      changePercent: num((row as { changePercent?: unknown }).changePercent),
    })),
    sectors: sectors.map((row) => ({
      label: text((row as { label?: unknown }).label, 16),
      changePercent: num((row as { changePercent?: unknown }).changePercent),
    })),
    focus: focus.map((row) => ({
      label: text((row as { label?: unknown }).label, 16),
      symbol: text((row as { symbol?: unknown }).symbol, 8),
      price: num((row as { price?: unknown }).price),
      changePercent: num((row as { changePercent?: unknown }).changePercent),
      tenMinPercent: nullable((row as { tenMinPercent?: unknown }).tenMinPercent),
      tenMinMinutes: nullable((row as { tenMinMinutes?: unknown }).tenMinMinutes),
    })),
    headlines: headlines.map((row) => ({
      tag: text((row as { tag?: unknown }).tag, 12),
      title: text((row as { title?: unknown }).title, 180),
      source: text((row as { source?: unknown }).source, 40),
    })),
  };
}

function allow() {
  const now = Date.now();
  stamps = stamps.filter((t) => now - t < 10 * 60 * 1000);
  if (stamps.length >= 6) return false;
  stamps.push(now);
  return true;
}

function cacheKey(payload: BriefPayload) {
  const prices = payload.focus
    .map((q) => `${q.symbol}:${q.price.toFixed(2)}:${(q.tenMinPercent ?? 0).toFixed(2)}`)
    .join("|");
  const heads = payload.headlines.map((h) => h.title).join("|");
  return `${payload.marketState}:${prices}:${heads}`;
}

export const writeBrief = createServerFn({ method: "POST" })
  .validator((input: unknown) => parsePayload(input))
  .handler(async ({ data }): Promise<BriefResult> => {
    const key = cacheKey(data);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 10 * 60 * 1000) {
      return { ok: true, text: hit.text, cached: true };
    }
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "中文快报这会儿不可用。" };
    if (!allow()) return { ok: false, error: "这一轮快报写得太密了，等下次十分钟刷新再试。" };

    const lines = [
      `市场状态: ${data.marketState}`,
      `指数: ${data.indices.map((q) => `${q.label} ${q.price} (${q.changePercent.toFixed(2)}%)`).join("；")}`,
      `板块: ${data.sectors.map((q) => `${q.label} ${q.changePercent.toFixed(2)}%`).join("；")}`,
      `盯盘: ${data.focus
        .map((q) => {
          const ten =
            q.tenMinPercent == null
              ? "近十分钟无数据"
              : `${windowPhrase(q.tenMinMinutes)} ${q.tenMinPercent.toFixed(2)}%`;
          return `${q.label}(${q.symbol}) ${q.price} 当日${q.changePercent.toFixed(2)}% ${ten}`;
        })
        .join("；")}`,
      `新闻: ${data.headlines.map((h) => `[${h.tag}] ${h.title}（${h.source}）`).join(" / ") || "无"}`,
    ].join("\n");

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(25_000),
        body: JSON.stringify({
          model: "grok-4.5",
          max_tokens: 420,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "你是美股交易台的中文观察员。只根据用户给的数字和新闻标题写快报，不要编造没出现的原因、目标价或传闻。5到7行，每行一句，不要编号，不要 markdown，不要投资建议。先写大盘和最强最弱板块，再写太空探索、英伟达、特斯拉、闪迪的当日方向和近十分钟，最后如果某条新闻能对上涨跌再提一句。",
            },
            { role: "user", content: lines },
          ],
        }),
      });
      if (!res.ok) {
        console.error("[shifen] brief", res.status);
        return { ok: false, error: "中文快报这次没写成，可以再试一次。" };
      }
      const body = (await res.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const content = body.choices?.[0]?.message?.content;
      const brief = typeof content === "string" ? content.trim() : "";
      if (!brief) return { ok: false, error: "快报是空的，再试一次。" };
      cache.set(key, { at: Date.now(), text: brief });
      if (cache.size > 12) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
      return { ok: true, text: brief, cached: false };
    } catch (err) {
      console.error("[shifen] brief", err);
      return { ok: false, error: "中文快报这次没写成，可以再试一次。" };
    }
  });
