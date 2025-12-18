// ChartContainer.tsx
import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "../../lib/utils";
import { ChartContext } from "./ChartContext";
import type { ChartConfig } from "./types";

const THEMES = { light: "", dark: ".dark" } as const;

export const ChartContainer = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}
>(({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

    return (
        <ChartContext.Provider value={{ config }}>
            <div
                data-chart={chartId}
                ref={ref}
                className={cn(
                    "flex aspect-video justify-center text-xs",
                    "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
                    className
                )}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
            </div>
        </ChartContext.Provider>
    );
});

ChartContainer.displayName = "Chart";

export const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
    const colorConfig = Object.entries(config).filter(([_, c]) => c.theme || c.color);
    if (!colorConfig.length) return null;

    return (
        <style
            dangerouslySetInnerHTML={{
                __html: Object.entries(THEMES)
                    .map(
                        ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
                            .map(([key, c]) => {
                                const color = c.theme?.[theme as "light" | "dark"] || c.color;
                                return color ? `  --color-${key}: ${color};` : "";
                            })
                            .join("\n")}
}
`
                    )
                    .join("\n"),
            }}
        />
    );
};
