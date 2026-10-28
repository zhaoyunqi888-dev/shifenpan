import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { writeBrief } from "@/lib/market/brief.functions";
import {
  formatAgo,
  formatChange,
  formatClock,
  formatPct,
  formatPrice,
  formatRemain,
  formatVol,
  rangePos,
  toneClass,
  toneOf,
  trendWord,
  windowPhrase,
} from "@/lib/market/format";
import type { Board, Quote } from "@/lib/market/types";
import { nextTen } from "@/lib/market/universe";
import { Spark } from "./spark";

const STATE_LABEL = {
  open: "交易中",
  pre: "盘前",
  post: "盘后",
  closed: "休市",
} as const;

const FILTERS = [
  { id: "全部", label: "全部" },
  { id: "大盘", label: "大盘" },
  { id: "SPCX", label: "太空探索" },
  { id: "NVDA", label: "英伟达" },
  { id: "TSLA", label: "特斯拉" },
  { id: "SNDK", label: "闪迪" },
];

function tenStory(focus: Quote[]) {
  const ranked = [...focus]
    .filter((q) => q.tenMinPercent != null)
    .sort((a, b) => (b.tenMinPercent ?? 0) - (a.tenMinPercent ?? 0));
  if (ranked.length === 0) return "分时还没凑够，先看全日涨跌。";
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const minutes = best.tenMinMinutes ?? worst.tenMinMinutes ?? null;
  const phrase = windowPhrase(minutes);
  const b = best.tenMinPercent ?? 0;
  const w = worst.tenMinPercent ?? 0;
  if (b > 0.05 && w < -0.05) {
    return `${phrase}${best.label} ${formatPct(b)} 领先，${worst.label} ${formatPct(w)}。`;
  }
  if (b > 0.05) return `${phrase}${best.label}领涨 ${formatPct(b)}，其余不大动。`;
  if (w < -0.05) return `${phrase}${worst.label}回落 ${formatPct(w)}，其余大体平稳。`;
  return `${phrase}四只大体横盘。`;
}

function Lead({ focus, sectors }: { focus: Quote[]; sectors: Quote[] }) {
  const byDay = [...sectors].sort((a, b) => b.changePercent - a.changePercent);
  const bestS = byDay[0];
  const worstS = byDay[byDay.length - 1];
  const sectorLine =
    bestS && worstS
      ? `今日${bestS.label}最强 ${formatPct(bestS.changePercent)}，${worstS.label}最弱 ${formatPct(worstS.changePercent)}。`
      : "";

  return (
    <p className="font-serif text-xl leading-snug text-pretty text-ink sm:text-2xl">
      {tenStory(focus)}
      {sectorLine ? ` ${sectorLine}` : ""}
    </p>
  );
}

function TenRow({
  quote,
  maxAbs,
  active,
  onPick,
}: {
  quote: Quote;
  maxAbs: number;
  active: boolean;
  onPick: () => void;
}) {
  const pct = quote.tenMinPercent;
  const tone = toneOf(pct);
  const width = pct == null ? 0 : (Math.abs(pct) / maxAbs) * 50;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={
        "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left " +
        (active ? "bg-surface-2" : "hover:bg-surface-2")
      }
    >
      <span className="w-16 shrink-0 text-sm text-ink">{quote.label}</span>
      <span className="relative h-2 min-w-0 flex-1 rounded-full bg-line">
        <span className="absolute inset-y-0 left-1/2 w-px bg-muted" />
        {pct != null && (
          <span
            className={
              "absolute top-0 h-2 rounded-full " +
              (tone === "up" ? "bg-up" : tone === "down" ? "bg-down" : "bg-muted")
            }
            style={{
              width: `${width}%`,
              left: tone === "down" ? `${50 - width}%` : "50%",
            }}
          />
        )}
      </span>
      <span className={"w-16 shrink-0 text-right text-sm tabular-nums " + toneClass(tone)}>
        {pct == null ? "—" : formatPct(pct)}
      </span>
    </button>
  );
}

function QuoteCard({ quote, active }: { quote: Quote; active: boolean }) {
  const dayTone = toneOf(quote.changePercent);
  const tenTone = toneOf(quote.tenMinPercent);
  const pos = rangePos(quote);
  return (
    <article
      id={`card-${quote.symbol}`}
      className={
        "flex flex-col rounded-2xl border bg-surface p-4 " +
        (active ? "border-brass" : "border-line")
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg text-ink">{quote.label}</h3>
        <span className="text-xs tracking-widest text-muted">{quote.symbol}</span>
      </div>
      <p className="mt-2 text-3xl font-medium tabular-nums text-ink">{formatPrice(quote.price)}</p>
      <p className={"mt-1 text-sm tabular-nums " + toneClass(dayTone)}>
        {formatChange(quote.change)} · {formatPct(quote.changePercent)}
        <span className="text-muted"> 全日</span>
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 text-sm">
        <span className="text-muted">{windowPhrase(quote.tenMinMinutes)}</span>
        <span className={toneClass(tenTone)}>
          {quote.tenMinPercent == null ? "—" : formatPct(quote.tenMinPercent)} · {trendWord(quote.tenMinPercent)}
        </span>
      </div>
      <div className="mt-2">
        <Spark symbol={quote.symbol} points={quote.points} tone={dayTone} />
      </div>
      <div className="mt-3">
        <div className="relative h-1.5 rounded-full bg-line">
          <span
            className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-brass"
            style={{ left: `calc(${pos}% - 5px)` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs tabular-nums text-muted">
          <span>{formatPrice(quote.dayLow)}</span>
          <span>{formatPrice(quote.dayHigh)}</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        成交 {formatVol(quote.volume)} · 昨收 {formatPrice(quote.previousClose)}
      </p>
    </article>
  );
}

export function Dashboard({
  board,
  refreshing,
  error,
  onRefresh,
}: {
  board: Board;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [now, setNow] = useState(board.fetchedAt);
  const [tag, setTag] = useState("全部");
  const [brief, setBrief] = useState<string | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setBrief(null);
    setBriefError(null);
  }, [board.fetchedAt]);

  const sectors = [...board.sectors].sort((a, b) => b.changePercent - a.changePercent);
  const maxAbs = Math.max(0.2, ...board.focus.map((q) => Math.abs(q.tenMinPercent ?? 0)));
  const news = board.news.filter((item) => tag === "全部" || item.tag === tag);
  const quoteMs = Math.max(0, ...[...board.focus, ...board.indices].map((q) => q.quoteTime)) * 1000;
  const nextAt = nextTen(now);
  const live = board.marketState === "open";

  async function onBrief() {
    setBriefing(true);
    setBriefError(null);
    try {
      const result = await writeBrief({
        data: {
          marketState: board.marketState,
          indices: board.indices.map((q) => ({
            label: q.label,
            price: q.price,
            changePercent: q.changePercent,
          })),
          sectors: sectors.map((q) => ({ label: q.label, changePercent: q.changePercent })),
          focus: board.focus.map((q) => ({
            label: q.label,
            symbol: q.symbol,
            price: q.price,
            changePercent: q.changePercent,
            tenMinPercent: q.tenMinPercent,
            tenMinMinutes: q.tenMinMinutes,
          })),
          headlines: board.news.slice(0, 8).map((n) => ({
            tag: n.tag,
            title: n.title,
            source: n.source,
          })),
        },
      });
      if (result.ok) setBrief(result.text);
      else setBriefError(result.error);
    } catch {
      setBriefError("中文快报这次没写成，可以再试一次。");
    } finally {
      setBriefing(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-16 sm:py-8">
      <header className="border-t-2 border-brass pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-widest text-brass">每十分钟一记</p>
            <h1 className="mt-1 text-4xl text-ink">十分盘</h1>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-brass px-4 text-sm font-medium text-bg disabled:opacity-60"
          >
            <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
            {refreshing ? "更新中" : "立即刷新"}
          </button>
        </div>
        <p className="mt-3 max-w-xl text-sm text-muted">
          美股十一板块，加上太空探索、英伟达、特斯拉、闪迪。报价对齐整十分钟自动更新。
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2 text-ink">
            <span className="relative flex size-2">
              {live && (
                <span className="absolute inline-flex size-2 animate-ping rounded-full bg-up opacity-60" />
              )}
              <span
                className={
                  "relative inline-flex size-2 rounded-full " +
                  (live ? "bg-up" : board.marketState === "closed" ? "bg-muted" : "bg-brass")
                }
              />
            </span>
            {STATE_LABEL[board.marketState]}
          </span>
          <span className="tabular-nums text-muted">美东 {formatClock(now, "America/New_York")}</span>
          <span className="tabular-nums text-muted">北京 {formatClock(now, "Asia/Shanghai")}</span>
          <span className="tabular-nums text-ink">
            距刷新 {formatRemain(nextAt - now)} · {formatClock(nextAt, "Asia/Shanghai")}
          </span>
        </div>
        {error && (
          <p className="mt-3 text-sm text-down" role="status">
            {error} 仍显示上一笔。
          </p>
        )}
      </header>

      <section className="mt-6">
        <Lead focus={board.focus} sectors={board.sectors} />
      </section>

      <section className="mt-6" aria-label="主要指数">
        <div className="grid grid-cols-3 gap-2">
          {board.indices.map((q) => {
            const tone = toneOf(q.changePercent);
            return (
              <div key={q.symbol} className="rounded-2xl border border-line bg-surface px-3 py-3">
                <p className="text-xs text-muted">{q.label}</p>
                <p className="mt-1 text-sm font-medium tabular-nums text-ink sm:text-lg">
                  {formatPrice(q.price)}
                </p>
                <p className={"mt-1 text-xs tabular-nums sm:text-sm " + toneClass(tone)}>
                  {formatPct(q.changePercent)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8" aria-label="板块强弱">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl text-ink">板块</h2>
          <p className="text-xs text-muted">按今日涨跌</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {sectors.map((q) => {
            const tone = toneOf(q.changePercent);
            return (
              <div
                key={q.symbol}
                className={
                  "rounded-2xl border border-line px-3 py-3 " +
                  (tone === "up" ? "bg-up/10" : tone === "down" ? "bg-down/10" : "bg-surface")
                }
              >
                <p className="text-sm text-ink">{q.label}</p>
                <p className="text-xs text-muted">{q.symbol}</p>
                <p className={"mt-2 text-lg font-medium tabular-nums " + toneClass(tone)}>
                  {formatPct(q.changePercent)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8" aria-label="十分趋势">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-2xl text-ink">十分趋势</h2>
          <p className="text-xs text-muted">
            {board.marketState === "open" ? "最近约十分钟的价格方向" : "最近交易时段的尾段"}
          </p>
        </div>
        <div className="mt-3 rounded-2xl border border-line bg-surface p-2">
          {board.focus.map((q) => (
            <TenRow
              key={q.symbol}
              quote={q}
              maxAbs={maxAbs}
              active={tag === q.symbol}
              onPick={() => setTag((cur) => (cur === q.symbol ? "全部" : q.symbol))}
            />
          ))}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="盯盘">
        {board.focus.map((q) => (
          <QuoteCard key={q.symbol} quote={q} active={tag === q.symbol} />
        ))}
      </section>

      <section className="mt-8" aria-label="新闻">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl text-ink">新闻</h2>
          {board.ai && (
            <button
              type="button"
              onClick={onBrief}
              disabled={briefing}
              className="inline-flex h-11 items-center rounded-full border border-brass px-4 text-sm text-brass disabled:opacity-60"
            >
              {briefing ? "正在写…" : "写成中文快报"}
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="新闻筛选">
          {FILTERS.map((f) => {
            const on = tag === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTag(f.id)}
                className={
                  "h-11 rounded-full px-3 text-sm " +
                  (on ? "bg-ink text-bg" : "border border-line bg-surface text-muted")
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {brief && (
          <article className="mt-4 rounded-2xl border border-line bg-surface-2 p-4">
            <h3 className="text-lg text-ink">这一轮中文快报</h3>
            {brief
              .split(/\n+/)
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, i) => (
                <p key={i} className="mt-2 text-sm leading-relaxed text-pretty text-ink">
                  {line}
                </p>
              ))}
            <p className="mt-3 text-xs text-muted">根据当前报价和标题整理，不构成投资建议。</p>
          </article>
        )}
        {briefError && (
          <p className="mt-3 text-sm text-down" role="status">
            {briefError}
          </p>
        )}

        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
          {news.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted">
              {board.newsError ? "新闻源这次没接上，报价仍是新的。" : "这一档暂时没有新闻。"}
            </li>
          )}
          {news.map((item) => (
            <li key={item.id}>
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="block px-4 py-3 hover:bg-surface-2"
              >
                <p className="text-sm leading-relaxed text-pretty text-ink">{item.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {FILTERS.find((f) => f.id === item.tag)?.label ?? item.tag} · {item.source} ·{" "}
                  {formatAgo(item.time, now)}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-8 text-xs leading-relaxed text-muted">
        报价时间 美东 {quoteMs ? formatClock(quoteMs, "America/New_York") : "—"}
        ，北京 {quoteMs ? formatClock(quoteMs, "Asia/Shanghai") : "—"}。数据来自公开行情与新闻标题，可能有延迟。只作观察，不是投资建议。
      </footer>
    </main>
  );
}
