import { createServerFn } from "@tanstack/react-start";

export const getBoard = createServerFn({ method: "GET" }).handler(async () => {
  const { loadBoard } = await import("./load.server");
  return loadBoard();
});
