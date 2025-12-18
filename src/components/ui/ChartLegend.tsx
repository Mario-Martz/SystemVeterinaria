// ChartLegend.tsx
import * as React from "react";
import { Legend } from "recharts";
import { cn } from "../../lib/utils";
import { useChart } from "./ChartContext";

export const ChartLegend = Legend;

export const ChartLegendContent = React.forwardRef<
    HTMLDivElement,
    {
        payload?: any[];
        hideIcon?: boolean;
        nameKey?: string;
        verticalAlign?: "top" | "bottom";
        className?: string;
    }
>(({ payload, hideIcon = false, nameKey, verticalAlign = "bottom", className }, ref) => {
    const { config } = useChart();

    if (!payload?.length) return null;

    return (
        <div
            ref={ref}
            className={cn(
                "flex items-center justify-center gap-4",
                verticalAlign === "top" ? "pb-3" : "pt-3",
                className
            )}
        >
            {payload.map((item) => {
                const key = `${nameKey || item.dataKey}`;
                const entry = config[key];

                return (
                    <div key={item.value} className="flex items-center gap-2">
                        {!hideIcon ? (
                            <div
                                className="h-2 w-2 rounded-sm"
                                style={{ backgroundColor: item.color }}
                            />
                        ) : null}
                        <span>{entry?.label}</span>
                    </div>
                );
            })}
        </div>
    );
});

ChartLegendContent.displayName = "ChartLegendContent";