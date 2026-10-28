import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/dashboard";
import { getBoard } from "@/lib/market/board.functions";
import type { Board } from "@/lib/market/types";
import { nextTen } from "@/lib/market/universe";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [board, setBoard] = useState<Board | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await getBoard();
      setBoard(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "刷新失败");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    let timer = 0;
    const arm = () => {
      const wait = Math.max(1000, nextTen(Date.now()) - Date.now());
      timer = window.setTimeout(() => {
        void refresh().finally(arm);
      }, wait);
    };
    arm();
    return () => window.clearTimeout(timer);
  }, [refresh]);

  if (!board) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <p className="text-xs tracking-widest text-brass">每十分钟一记</p>
        <h1 className="mt-1 font-serif text-4xl text-ink">十分盘</h1>
        <p className="mt-3 text-sm text-muted">{error ?? "正在接通行情…"}</p>
        {error && (
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-6 h-11 w-fit rounded-full bg-brass px-4 text-sm font-medium text-bg"
          >
            重试
          </button>
        )}
      </main>
    );
  }

  return <Dashboard board={board} refreshing={refreshing} error={error} onRefresh={() => void refresh()} />;
}
