import { NEWS_FEEDS, UNIVERSE } from "./universe";
import type { Board, MarketState, NewsItem, Point, Quote } from "./types";

const UA = "Mozilla/5.0 (compatible; ShifenPan/1.0)";
const TTL_MS = 20_000;

let cache: { at: number; board: Board } | null = null;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function decode(raw: string) {
  let s = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  for (let i = 0; i < 3; i++) {
    const next = s
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, '"')
      .replace(/&#39;|'|&#x27;/gi, "'");
    if (next === s) break;
    s = next;
  }
  return s.replace(/<[^>]+>/g, "").trim();
}

function matchTag(block: string, tag: string) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : "";
}

function tenMinute(points: Point[]) {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const target = last.t - 10 * 60;
  let best = points[0];
  let bestDist = Infinity;
  for (const p of points) {
    if (p.t >= last.t) continue;
    const dist = Math.abs(p.t - target);
    if (dist < bestDist) {
      best = p;
      bestDist = dist;
    }
  }
  if (!best || best.c === 0 || bestDist > 20 * 60) return null;
  const minutes = Math.max(1, Math.round((last.t - best.t) / 60));
  return { percent: ((last.c - best.c) / best.c) * 100, minutes };
}

function windowOf(v: unknown) {
  if (!v || typeof v !== "object") return null;
  const o = v as { start?: unknown; end?: unknown };
  const start = num(o.start);
  const end = num(o.end);
  if (start == null || end == null) return null;
  return { start, end };
}

function marketStateOf(
  period: {
    pre: { start: number; end: number } | null;
    regular: { start: number; end: number } | null;
    post: { start: number; end: number } | null;
  } | null,
  nowSec: number,
): MarketState {
  if (!period) return "closed";
  const { pre, regular, post } = period;
  if (regular && nowSec >= regular.start && nowSec < regular.end) return "open";
  if (pre && nowSec >= pre.start && nowSec < pre.end) return "pre";
  if (post && nowSec >= post.start && nowSec < post.end) return "post";
  return "closed";
}

async function fetchSpark() {
  const symbols = UNIVERSE.map((u) => u.symbol).join(",");
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbols)}&range=1d&interval=5m`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error("行情源没有回应。");
  return (await res.json()) as {
    spark?: {
      result?: Array<{
        symbol?: string;
        response?: Array<{
          meta?: Record<string, unknown>;
          timestamp?: unknown[];
          indicators?: { quote?: Array<Record<string, unknown>> };
        }> | null;
      }> | null;
    };
  };
}

function parseRss(xml: string, tag: string): NewsItem[] {
  const items: NewsItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const source = decode(matchTag(block, "source")) || "新闻";
    let title = decode(matchTag(block, "title"));
    const link = decode(matchTag(block, "link"));
    const pub = matchTag(block, "pubDate");
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(source.length + 3)).trim();
    }
    if (!title || !link) continue;
    const parsed = Date.parse(pub);
    items.push({
      id: `${tag}-${title.slice(0, 48)}`,
      title,
      link,
      source,
      time: Number.isFinite(parsed) ? parsed : Date.now(),
      tag,
    });
    if (items.length >= 5) break;
  }
  return items;
}

async function fetchFeed(tag: string, q: string) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:2d`)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`news ${tag} ${res.status}`);
  return parseRss(await res.text(), tag);
}

async function fetchNews(): Promise<{ items: NewsItem[]; error: boolean }> {
  const settled = await Promise.allSettled(NEWS_FEEDS.map((f) => fetchFeed(f.tag, f.q)));
  const items: NewsItem[] = [];
  let failed = 0;
  for (const s of settled) {
    if (s.status === "fulfilled") items.push(...s.value);
    else failed += 1;
  }
  const seen = new Set<string>();
  const unique = items
    .sort((a, b) => b.time - a.time)
    .filter((item) => {
      const key = item.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 30);
  return { items: unique, error: failed === NEWS_FEEDS.length };
}

function buildQuotes(
  raw: Awaited<ReturnType<typeof fetchSpark>>,
): { quotes: Quote[]; state: MarketState } {
  const rows = raw.spark?.result ?? [];
  const bySymbol = new Map<string, Quote>();
  let period: {
    pre: { start: number; end: number } | null;
    regular: { start: number; end: number } | null;
    post: { start: number; end: number } | null;
  } | null = null;

  for (const row of rows) {
    const resp = row.response?.[0];
    const meta = resp?.meta;
    const symbol = row.symbol || (typeof meta?.symbol === "string" ? meta.symbol : "");
    const spec = UNIVERSE.find((u) => u.symbol === symbol);
    if (!resp || !meta || !spec) continue;
    const price = num(meta.regularMarketPrice);
    if (price == null) continue;
    const previousClose = num(meta.previousClose) ?? num(meta.chartPreviousClose) ?? price;
    const change = price - previousClose;
    const changePercent =
      num(meta.regularMarketChangePercent) ??
      (previousClose ? (change / previousClose) * 100 : 0);
    const ts = Array.isArray(resp.timestamp) ? resp.timestamp : [];
    const closes = resp.indicators?.quote?.[0]?.close;
    const closeArr = Array.isArray(closes) ? closes : [];
    const points: Point[] = [];
    for (let i = 0; i < ts.length; i++) {
      const t = num(ts[i]);
      const c = num(closeArr[i]);
      if (t == null || c == null) continue;
      points.push({ t, c });
    }
    const move = tenMinute(points);
    const trading = meta.currentTradingPeriod;
    if (trading && typeof trading === "object" && (symbol === "^GSPC" || !period)) {
      const bag = trading as {
        pre?: unknown;
        regular?: unknown;
        post?: unknown;
      };
      period = {
        pre: windowOf(bag.pre),
        regular: windowOf(bag.regular),
        post: windowOf(bag.post),
      };
    }
    bySymbol.set(symbol, {
      symbol,
      label: spec.label,
      group: spec.group,
      price,
      change,
      changePercent,
      previousClose,
      dayHigh: num(meta.regularMarketDayHigh) ?? price,
      dayLow: num(meta.regularMarketDayLow) ?? price,
      volume: num(meta.regularMarketVolume) ?? 0,
      quoteTime: num(meta.regularMarketTime) ?? Math.floor(Date.now() / 1000),
      points,
      tenMinPercent: move?.percent ?? null,
      tenMinMinutes: move?.minutes ?? null,
    });
  }

  const quotes = UNIVERSE.map((u) => bySymbol.get(u.symbol)).filter((q): q is Quote => !!q);
  return { quotes, state: marketStateOf(period, Math.floor(Date.now() / 1000)) };
}

export async function loadBoard(): Promise<Board> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.board;

  const [spark, news] = await Promise.all([
    fetchSpark().catch((err: unknown) => {
      console.error("[shifen] spark", err);
      throw new Error("行情暂时连不上，过一会儿再刷新。");
    }),
    fetchNews().catch((err: unknown) => {
      console.error("[shifen] news", err);
      return { items: [] as NewsItem[], error: true };
    }),
  ]);

  const { quotes, state } = buildQuotes(spark);
  if (!quotes.some((q) => q.group === "focus") && !quotes.some((q) => q.group === "index")) {
    throw new Error("行情源没有返回可用报价。");
  }

  const board: Board = {
    fetchedAt: Date.now(),
    marketState: state,
    ai: Boolean(process.env.XAI_API_KEY),
    indices: quotes.filter((q) => q.group === "index"),
    sectors: quotes.filter((q) => q.group === "sector"),
    focus: quotes.filter((q) => q.group === "focus"),
    news: news.items,
    newsError: news.error,
  };
  cache = { at: Date.now(), board };
  return board;
}
