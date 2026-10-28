import type { Group } from "./types";

export type Instrument = {
  symbol: string;
  label: string;
  group: Group;
};

export const UNIVERSE: Instrument[] = [
  { symbol: "^GSPC", label: "标普500", group: "index" },
  { symbol: "^IXIC", label: "纳斯达克", group: "index" },
  { symbol: "^DJI", label: "道琼斯", group: "index" },
  { symbol: "XLK", label: "科技", group: "sector" },
  { symbol: "XLC", label: "通信", group: "sector" },
  { symbol: "XLY", label: "可选消费", group: "sector" },
  { symbol: "XLP", label: "必需消费", group: "sector" },
  { symbol: "XLF", label: "金融", group: "sector" },
  { symbol: "XLV", label: "医疗", group: "sector" },
  { symbol: "XLI", label: "工业", group: "sector" },
  { symbol: "XLE", label: "能源", group: "sector" },
  { symbol: "XLB", label: "材料", group: "sector" },
  { symbol: "XLRE", label: "地产", group: "sector" },
  { symbol: "XLU", label: "公用事业", group: "sector" },
  { symbol: "SPCX", label: "太空探索", group: "focus" },
  { symbol: "NVDA", label: "英伟达", group: "focus" },
  { symbol: "TSLA", label: "特斯拉", group: "focus" },
  { symbol: "SNDK", label: "闪迪", group: "focus" },
];

export const NEWS_FEEDS: { tag: string; q: string }[] = [
  { tag: "SPCX", q: 'SPCX OR "SpaceX" stock' },
  { tag: "NVDA", q: "NVIDIA OR NVDA stock" },
  { tag: "TSLA", q: "Tesla OR TSLA stock" },
  { tag: "SNDK", q: "Sandisk OR SNDK OR \"SanDisk\" stock" },
  { tag: "大盘", q: "S&P 500 OR Nasdaq stock market" },
];

export const TEN_MS = 10 * 60 * 1000;

export function nextTen(now: number) {
  const next = Math.ceil(now / TEN_MS) * TEN_MS;
  return next === now ? now + TEN_MS : next;
}
