import Link from "next/link";
import { Banknote, TrendingUp, Wallet, AlertCircle, Receipt, PiggyBank, CalendarDays } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { getFinanceData } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentMethodLabel } from "@/lib/status";
import { FinanceActions, BreakdownBar } from "@/components/finance/finance-client";

export const dynamic = "force-dynamic";

const METHOD_COLORS: Record<string, string> = {
  CASH: "var(--color-primary)",
  CARD: "var(--color-accent)",
  BANK_TRANSFER: "var(--color-secondary)",
  OTHER: "var(--color-muted-foreground)",
};

export default async function FinancePage() {
  const data = await getFinanceData();
  const { kpis } = data;
  const revenueTotal = data.revenueByType.STAY + data.revenueByType.EVENT;
  const methodTotal = data.paymentsByMethod.reduce((s, m) => s + m.amount, 0);

  return (
    <>
      <Topbar title="Finance" actions={<FinanceActions dueReservations={data.dueReservations} />} />
      <PageContainer className="space-y-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Revenue today" value={formatCurrency(kpis.revenueToday)} icon={Banknote} tone="success" />
          <StatCard label="Revenue this week" value={formatCurrency(kpis.revenueWeek)} icon={CalendarDays} tone="success" />
          <StatCard label="Revenue this month" value={formatCurrency(kpis.revenueMonth)} icon={TrendingUp} tone="success" />
          <StatCard label="Total paid (all time)" value={formatCurrency(kpis.totalPaid)} icon={Wallet} tone="primary" />
          <StatCard label="Outstanding" value={formatCurrency(kpis.outstanding)} icon={AlertCircle} tone="warning" />
          <StatCard label="Expenses this month" value={formatCurrency(kpis.expensesMonth)} icon={Receipt} tone="default" />
          <StatCard label="Net revenue this month" value={formatCurrency(kpis.netRevenueMonth)} icon={PiggyBank} tone="accent" className="col-span-2 md:col-span-2" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Revenue breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <BreakdownBar label={`Accommodation — ${formatCurrency(data.revenueByType.STAY)}`} value={data.revenueByType.STAY} total={revenueTotal} color="var(--color-primary)" />
              <BreakdownBar label={`Events — ${formatCurrency(data.revenueByType.EVENT)}`} value={data.revenueByType.EVENT} total={revenueTotal} color="var(--color-accent)" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Payment method breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {data.paymentsByMethod.length === 0 ? (
                <p className="text-sm text-text-secondary">No payments recorded yet.</p>
              ) : (
                data.paymentsByMethod.map((m) => (
                  <BreakdownBar
                    key={m.method}
                    label={`${paymentMethodLabel[m.method]} — ${formatCurrency(m.amount)}`}
                    value={m.amount}
                    total={methodTotal}
                    color={METHOD_COLORS[m.method]}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent payments</CardTitle></CardHeader>
          <CardContent>
            {data.recentPayments.length === 0 ? (
              <EmptyState title="No payments yet" description="Payments recorded against reservations will appear here." />
            ) : (
              <Table>
                <THead>
                  <TR><TH>Date</TH><TH>Reservation</TH><TH>Guest</TH><TH>Amount</TH><TH>Method</TH></TR>
                </THead>
                <TBody>
                  {data.recentPayments.map((p) => (
                    <TR key={p.id}>
                      <TD>{formatDate(p.createdAt, { hour: "2-digit", minute: "2-digit" })}</TD>
                      <TD>
                        <Link href={`/reservations/${p.reservationId}`} className="font-mono text-xs text-primary hover:underline">
                          {p.reservation.code}
                        </Link>
                      </TD>
                      <TD>{p.reservation.guest.firstName} {p.reservation.guest.lastName}</TD>
                      <TD className="font-medium text-success">{formatCurrency(p.amount)}</TD>
                      <TD>{paymentMethodLabel[p.method]}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Outstanding balances</CardTitle></CardHeader>
          <CardContent>
            {data.dueReservations.length === 0 ? (
              <EmptyState title="Nothing outstanding" description="All active reservations are fully paid." />
            ) : (
              <Table>
                <THead>
                  <TR><TH>Reservation</TH><TH>Guest</TH><TH>Total</TH><TH>Paid</TH><TH>Remaining</TH></TR>
                </THead>
                <TBody>
                  {data.dueReservations.map((r) => (
                    <TR key={r.id}>
                      <TD>
                        <Link href={`/reservations/${r.id}`} className="font-mono text-xs text-primary hover:underline">{r.code}</Link>
                      </TD>
                      <TD>{r.guest.firstName} {r.guest.lastName}</TD>
                      <TD>{formatCurrency(r.totalAmount)}</TD>
                      <TD className="text-success">{formatCurrency(r.amountPaid)}</TD>
                      <TD className="font-medium text-error">{formatCurrency(r.remainingAmount)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
