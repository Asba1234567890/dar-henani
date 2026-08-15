import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ElementType;
  tone?: "default" | "primary" | "accent" | "success" | "warning";
  className?: string;
}) {
  const toneStyles: Record<string, string> = {
    default: "bg-muted text-text-secondary",
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent-dark",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
  };

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-medium text-text-primary truncate">{value}</p>
          {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", toneStyles[tone])}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>
    </Card>
  );
}
