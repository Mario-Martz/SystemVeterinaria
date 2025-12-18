// ChartTooltip.tsx
import * as React from "react";
import { Tooltip } from "recharts";
import { cn } from "../../lib/utils";
import { useChart } from "./ChartContext";
import type { ChartConfig } from "./types";

export const ChartTooltip = Tooltip;

/* ---------- Tipos seguros ---------- */
type TooltipPayloadItem = {
    value?: number | string | null;
    name?: string | null;
    dataKey?: string | null;
    color?: string | null;
    payload?: Record<string, unknown> | null;
};

export interface ChartTooltipContentProps {
    active?: boolean;
    payload?: unknown;
    label?: unknown;
    labelFormatter?: (
        value: React.ReactNode | undefined,
        payload?: TooltipPayloadItem[]
    ) => React.ReactNode;
    formatter?: (
        value: number | string | null,
        name?: string | null,
        item?: TooltipPayloadItem,
        index?: number
    ) => React.ReactNode;
    nameKey?: string;
    labelKey?: string;
    indicator?: "line" | "dot" | "dashed";
    hideLabel?: boolean;
    hideIndicator?: boolean;
    className?: string;
    restProps?: Record<string, unknown>;
}

/* ---------- Type Guard para “payload.fill” ---------- */
function hasFill(value: unknown): value is { fill: string } {
    return (
        typeof value === "object" &&
        value !== null &&
        "fill" in value &&
        typeof (value as Record<string, unknown>).fill === "string"
    );
}

/* ---------- Componente ---------- */
export const ChartTooltipContent = React.forwardRef<
    HTMLDivElement,
    ChartTooltipContentProps
>(
    (
        {
            active = false,
            payload,
            label,
            labelFormatter,
            formatter,
            nameKey,
            labelKey,
            indicator = "dot",
            hideLabel = false,
            hideIndicator = false,
            className,
            restProps = {},
        },
        ref
    ) => {
        const { config } = useChart();

        // aseguramos array tipado
        const safePayload: TooltipPayloadItem[] = Array.isArray(payload)
            ? (payload as TooltipPayloadItem[])
            : [];

        /* ---------- Hook (antes de returns) ---------- */
        const headerLabel = React.useMemo(() => {
            if (hideLabel || safePayload.length === 0) return null;

            const first = safePayload[0];
            const key = String(labelKey ?? first.dataKey ?? first.name ?? "value");
            const entry = config[key as keyof ChartConfig];

            if (labelFormatter) {
                return labelFormatter(
                    entry?.label ?? (typeof label === "string" ? label : undefined),
                    safePayload
                );
            }

            return entry?.label ?? (typeof label === "string" ? label : null);
        }, [hideLabel, safePayload, labelFormatter, label, labelKey, config]);

        /* ---------- Early return (después del hook) ---------- */
        if (!active || safePayload.length === 0) return null;

        const htmlRest = restProps as React.HTMLAttributes<HTMLDivElement>;

        return (
            <div
                ref={ref}
                className={cn(
                    "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
                    className
                )}
                {...htmlRest}
            >
                {!hideLabel && headerLabel && (
                    <div className="font-medium">{headerLabel}</div>
                )}

                <div className="grid gap-1.5">
                    {safePayload.map((item, index) => {
                        const key = String(nameKey ?? item.name ?? item.dataKey ?? "value");
                        const entry = config[key as keyof ChartConfig];

                        const pp = item.payload;
                        const fillFromPayload = hasFill(pp) ? pp.fill : undefined;
                        const indicatorColor = item.color ?? fillFromPayload;

                        const displayValue =
                            item.value !== undefined && item.value !== null
                                ? item.value
                                : "";

                        return (
                            <div
                                key={`${key}-${index}`}
                                className="flex w-full items-center justify-between gap-2"
                            >
                                {!hideIndicator && (
                                    <span
                                        className={cn(
                                            "inline-block rounded-sm",
                                            indicator === "dot" && "h-2 w-2",
                                            indicator === "line" && "h-2 w-1",
                                            indicator === "dashed" &&
                                            "h-2 w-2 border border-dashed"
                                        )}
                                        style={{
                                            backgroundColor: indicatorColor,
                                            borderColor: indicatorColor,
                                        }}
                                    />
                                )}

                                <span className="text-muted-foreground">
                  {entry?.label ?? item.name ?? key}
                </span>

                                <span className="font-mono font-medium">
                  {formatter
                      ? formatter(
                          item.value ?? "",
                          item.name ?? "",
                          item,
                          index
                      )
                      : typeof displayValue === "number"
                          ? displayValue.toLocaleString()
                          : String(displayValue)}
                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
);

ChartTooltipContent.displayName = "ChartTooltipContent";
