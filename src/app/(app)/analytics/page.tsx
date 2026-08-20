import { Suspense } from "react";
import { Percent, Receipt, TrendingUp, Ban, Gauge, BedDouble } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsData, type AnalyticsRange } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import { bookingSourceLabel } from "@/lib/status";
import { RevenueChart } from "@/components/analytics/revenue-chart";
import { RangeFilter } from "@/components/analytics/range-filter";
import { BreakdownBar } from "@/components/finance/finance-client";
import { requireAdminPage } from "@/lib/auth/guards";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { BookingSource } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const user = await requireAdminPage();
  const dict = getDictionary(user.language);
  const sp = await searchParams;
  const range = (sp.range as AnalyticsRange) || "month";
  const data = await getAnalyticsData(range, sp.from, sp.to);

  const revenueTypeTotal = data.revenueByType.STAY + data.revenueByType.EVENT;
  const sourceEntries = Object.entries(data.revenueBySource).sort((a, b) => b[1] - a[1]);
  const sourceTotal = sourceEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <>
      <Topbar title={dict.analytics.title} />
      <PageContainer className="space-y-8">
        <Suspense>
          <RangeFilter current={range} from={sp.from} to={sp.to} />
        </Suspense>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label={dict.analytics.totalRevenue} value={formatCurrency(data.totalRevenue)} icon={TrendingUp} tone="success" />
          <StatCard label={dict.analytics.reservations} value={data.totalReservations} icon={Receipt} tone="primary" />
          <StatCard label={dict.analytics.averageBookingValue} value={formatCurrency(data.avgBookingValue)} icon={Gauge} tone="default" />
          <StatCard label={dict.analytics.cancellationRate} value={`${data.cancellationRate.toFixed(1)}%`} icon={Ban} tone="warning" />
          <StatCard label={dict.analytics.occupancyRate} value={`${data.occupancyRate.toFixed(1)}%`} icon={Percent} tone="primary" />
          <StatCard label={dict.analytics.averageDailyRate} value={formatCurrency(data.adr)} icon={BedDouble} tone="accent" />
          <StatCard label="RevPAR" value={formatCurrency(data.revPAR)} icon={BedDouble} tone="accent" />
          <StatCard label={dict.analytics.eventRevenue} value={formatCurrency(data.revenueByType.EVENT)} icon={TrendingUp} tone="default" />
        </div>

        <Card>
          <CardHeader><CardTitle>{dict.analytics.revenueOverTime}</CardTitle></CardHeader>
          <CardContent>
            <RevenueChart data={data.revenueSeries} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{dict.analytics.revenueByType}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <BreakdownBar label={`${dict.finance.accommodation} — ${formatCurrency(data.revenueByType.STAY)}`} value={data.revenueByType.STAY} total={revenueTypeTotal} color="var(--color-primary)" />
              <BreakdownBar label={`${dict.finance.events} — ${formatCurrency(data.revenueByType.EVENT)}`} value={data.revenueByType.EVENT} total={revenueTypeTotal} color="var(--color-accent)" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{dict.analytics.revenueBySource}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {sourceEntries.length === 0 ? (
                <p className="text-sm text-text-secondary">{dict.analytics.noDataForPeriod}</p>
              ) : (
                sourceEntries.map(([source, amount]) => (
                  <BreakdownBar
                    key={source}
                    label={`${bookingSourceLabel(dict, source as BookingSource)} — ${formatCurrency(amount)}`}
                    value={amount}
                    total={sourceTotal}
                    color="var(--color-primary)"
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
