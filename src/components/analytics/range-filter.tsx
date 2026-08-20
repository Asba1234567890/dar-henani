"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

export function RangeFilter({ current, from, to }: { current: string; from?: string; to?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const RANGES = [
    { value: "today", label: t("common.today") },
    { value: "week", label: t("analytics.thisWeek") },
    { value: "month", label: t("analytics.thisMonth") },
    { value: "year", label: t("analytics.thisYear") },
    { value: "custom", label: t("analytics.custom") },
  ] as const;

  function setRange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setCustom(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Tabs value={current} onValueChange={setRange}>
        <TabsList>
          {RANGES.map((r) => (
            <TabsTrigger key={r.value} value={r.value}>{r.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {current === "custom" && (
        <div className="flex items-center gap-2">
          <Input type="date" className="h-9 w-auto" value={from ?? ""} onChange={(e) => setCustom("from", e.target.value)} />
          <span className="text-text-secondary">{t("common.to")}</span>
          <Input type="date" className="h-9 w-auto" value={to ?? ""} onChange={(e) => setCustom("to", e.target.value)} />
        </div>
      )}
    </div>
  );
}
