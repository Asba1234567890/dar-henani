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

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const range = (sp.range as AnalyticsRange) || "month";
  const data = await getAnalyticsData(range, sp.from, sp.to);

  const revenueTypeTotal = data.revenueByType.STAY + data.revenueByType.EVENT;
  const sourceEntries = Object.entries(data.revenueBySource).sort((a, b) => b[1] - a[1]);
  const sourceTotal = sourceEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <>
      <Topbar title="Analytics" />
      <PageContainer className="space-y-8">
        <Suspense>
          <RangeFilter current={range} from={sp.from} to={sp.to} />
        </Suspense>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total revenue" value={formatCurrency(data.totalRevenue)} icon={TrendingUp} tone="success" />
          <StatCard label="Reservations" value={data.totalReservations} icon={Receipt} tone="primary" />
          <StatCard label="Average booking value" value={formatCurrency(data.avgBookingValue)} icon={Gauge} tone="default" />
          <StatCard label="Cancellation rate" value={`${data.cancellationRate.toFixed(1)}%`} icon={Ban} tone="warning" />
          <StatCard label="Occupancy rate" value={`${data.occupancyRate.toFixed(1)}%`} icon={Percent} tone="primary" />
          <StatCard label="Average daily rate (ADR)" value={formatCurrency(data.adr)} icon={BedDouble} tone="accent" />
          <StatCard label="RevPAR" value={formatCurrency(data.revPAR)} icon={BedDouble} tone="accent" />
          <StatCard label="Event revenue" value={formatCurrency(data.revenueByType.EVENT)} icon={TrendingUp} tone="default" />
        </div>

        <Card>
          <CardHeader><CardTitle>Revenue over time</CardTitle></CardHeader>
          <CardContent>
            <RevenueChart data={data.revenueSeries} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Revenue by reservation type</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <BreakdownBar label={`Accommodation — ${formatCurrency(data.revenueByType.STAY)}`} value={data.revenueByType.STAY} total={revenueTypeTotal} color="var(--color-primary)" />
              <BreakdownBar label={`Events — ${formatCurrency(data.revenueByType.EVENT)}`} value={data.revenueByType.EVENT} total={revenueTypeTotal} color="var(--color-accent)" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Revenue by booking source</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {sourceEntries.length === 0 ? (
                <p className="text-sm text-text-secondary">No data for this period.</p>
              ) : (
                sourceEntries.map(([source, amount]) => (
                  <BreakdownBar
                    key={source}
                    label={`${bookingSourceLabel[source as keyof typeof bookingSourceLabel]} — ${formatCurrency(amount)}`}
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
