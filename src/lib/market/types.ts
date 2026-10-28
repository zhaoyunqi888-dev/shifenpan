export type MarketState = "open" | "pre" | "post" | "closed";

export type Group = "index" | "sector" | "focus";

export type Point = { t: number; c: number };

export type Quote = {
  symbol: string;
  label: string;
  group: Group;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  quoteTime: number;
  points: Point[];
  tenMinPercent: number | null;
  tenMinMinutes: number | null;
};

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  time: number;
  tag: string;
};

export type Board = {
  fetchedAt: number;
  marketState: MarketState;
  ai: boolean;
  indices: Quote[];
  sectors: Quote[];
  focus: Quote[];
  news: NewsItem[];
  newsError: boolean;
};

export type BriefPayload = {
  marketState: MarketState;
  indices: { label: string; price: number; changePercent: number }[];
  sectors: { label: string; changePercent: number }[];
  focus: {
    label: string;
    symbol: string;
    price: number;
    changePercent: number;
    tenMinPercent: number | null;
    tenMinMinutes: number | null;
  }[];
  headlines: { tag: string; title: string; source: string }[];
};

export type BriefResult =
  | { ok: true; text: string; cached: boolean }
  | { ok: false; error: string };
