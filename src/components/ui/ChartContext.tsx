// ChartContext.tsx
import { createContext, useContext } from "react";
import type { ChartConfig } from "./types";

type ChartContextProps = { config: ChartConfig };

export const ChartContext = createContext<ChartContextProps | null>(null);

export function useChart() {
    const ctx = useContext(ChartContext);
    if (!ctx) throw new Error("useChart must be used inside <ChartContainer>");
    return ctx;
}
