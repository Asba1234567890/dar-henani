import Link from "next/link";
import {
  LogIn,
  LogOut,
  Users,
  CalendarClock,
  Banknote,
  TrendingUp,
  AlertCircle,
  Percent,
  PartyPopper,
} from "lucide-react";
import { getDashboardData } from "@/lib/dashboard";
import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { reservationStatusLabel, reservationStatusVariant, paymentStatusLabel, paymentStatusVariant, eventTypeLabel } from "@/lib/status";
import { requireUser } from "@/lib/auth/guards";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const dict = getDictionary(user.language);
  const data = await getDashboardData();
  const { kpis } = data;
  const fmtDate = (d: Date | string, opts?: Intl.DateTimeFormatOptions) => formatDate(d, opts, user.language);
  const fmtCurrency = (n: number) => formatCurrency(n, undefined, user.language);

  return (
    <>
      <Topbar
        title={dict.dashboard.title}
        actions={
          <Button asChild>
            <Link href="/reservations?create=1">{dict.dashboard.createReservation}</Link>
          </Button>
        }
      />
      <PageContainer className="space-y-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            {fmtDate(data.date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label={dict.dashboard.arrivalsToday} value={kpis.arrivalsToday} icon={LogIn} tone="primary" />
          <StatCard label={dict.dashboard.departuresToday} value={kpis.departuresToday} icon={LogOut} tone="accent" />
          <StatCard label={dict.dashboard.guestsStaying} value={kpis.guestsStaying} icon={Users} tone="default" />
          <StatCard label={dict.dashboard.upcomingReservations} value={kpis.upcomingReservations} icon={CalendarClock} tone="default" />
          <StatCard label={dict.dashboard.revenueToday} value={fmtCurrency(kpis.revenueToday)} icon={Banknote} tone="success" />
          <StatCard label={dict.dashboard.revenueThisMonth} value={fmtCurrency(kpis.revenueMonth)} icon={TrendingUp} tone="success" />
          <StatCard label={dict.dashboard.outstandingPayments} value={fmtCurrency(kpis.outstanding)} icon={AlertCircle} tone="warning" />
          <StatCard label={dict.dashboard.occupancyRate} value={`${kpis.occupancyRate}%`} icon={Percent} tone="primary" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{dict.dashboard.todaysArrivals}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.arrivals.length === 0 ? (
              <EmptyState title={dict.dashboard.noArrivals} description={dict.dashboard.noArrivalsDesc} />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>{dict.dashboard.tableGuest}</TH>
                    <TH>{dict.dashboard.tableType}</TH>
                    <TH>{dict.dashboard.tableRoomOrEvent}</TH>
                    <TH>{dict.dashboard.tableCheckIn}</TH>
                    <TH>{dict.dashboard.tablePayment}</TH>
                    <TH>{dict.dashboard.tableStatus}</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.arrivals.map((r) => (
                    <TR key={r.id} className="cursor-pointer">
                      <TD>
                        <Link href={`/reservations/${r.id}`} className="font-medium hover:text-primary">
                          {r.guest.firstName} {r.guest.lastName}
                        </Link>
                      </TD>
                      <TD>{dict.reservations.stay}</TD>
                      <TD>{r.room?.name ?? "—"}</TD>
                      <TD>{fmtDate(r.checkIn!, { weekday: undefined })}</TD>
                      <TD><Badge variant={paymentStatusVariant[r.paymentStatus]}>{paymentStatusLabel(dict, r.paymentStatus)}</Badge></TD>
                      <TD><Badge variant={reservationStatusVariant[r.status]}>{reservationStatusLabel(dict, r.status)}</Badge></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dict.dashboard.todaysDepartures}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.departures.length === 0 ? (
              <EmptyState title={dict.dashboard.noDepartures} description={dict.dashboard.noDeparturesDesc} />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>{dict.dashboard.tableGuest}</TH>
                    <TH>{dict.dashboard.tableRoom}</TH>
                    <TH>{dict.dashboard.tableCheckOut}</TH>
                    <TH>{dict.dashboard.tablePayment}</TH>
                    <TH>{dict.dashboard.tableStatus}</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.departures.map((r) => (
                    <TR key={r.id}>
                      <TD>
                        <Link href={`/reservations/${r.id}`} className="font-medium hover:text-primary">
                          {r.guest.firstName} {r.guest.lastName}
                        </Link>
                      </TD>
                      <TD>{r.room?.name ?? "—"}</TD>
                      <TD>{fmtDate(r.checkOut!)}</TD>
                      <TD><Badge variant={paymentStatusVariant[r.paymentStatus]}>{paymentStatusLabel(dict, r.paymentStatus)}</Badge></TD>
                      <TD><Badge variant={reservationStatusVariant[r.status]}>{reservationStatusLabel(dict, r.status)}</Badge></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dict.dashboard.todaysEvents}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.eventsToday.length === 0 ? (
              <EmptyState icon={PartyPopper} title={dict.dashboard.noEventsToday} description={dict.dashboard.noEventsTodayDesc} />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>{dict.dashboard.tableEvent}</TH>
                    <TH>{dict.dashboard.tableClient}</TH>
                    <TH>{dict.dashboard.tableTime}</TH>
                    <TH>{dict.dashboard.tableGuests}</TH>
                    <TH>{dict.dashboard.tableTotal}</TH>
                    <TH>{dict.dashboard.tablePayment}</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.eventsToday.map((r) => (
                    <TR key={r.id}>
                      <TD>
                        <Link href={`/reservations/${r.id}`} className="font-medium hover:text-primary">
                          {r.eventName || eventTypeLabel(dict, r.eventType!)}
                        </Link>
                      </TD>
                      <TD>{r.guest.firstName} {r.guest.lastName}</TD>
                      <TD>{r.eventStart ?? "—"}{r.eventEnd ? ` – ${r.eventEnd}` : ""}</TD>
                      <TD>{r.guestCount ?? "—"}</TD>
                      <TD>{fmtCurrency(r.totalAmount)}</TD>
                      <TD><Badge variant={paymentStatusVariant[r.paymentStatus]}>{paymentStatusLabel(dict, r.paymentStatus)}</Badge></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dict.dashboard.recentReservations}</CardTitle>
            <Button variant="link" asChild>
              <Link href="/reservations">{dict.common.viewAll}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentReservations.length === 0 ? (
              <EmptyState
                title={dict.dashboard.noReservationsYet}
                description={dict.dashboard.noReservationsYetDesc}
                action={<Button asChild><Link href="/reservations?create=1">{dict.dashboard.createReservation}</Link></Button>}
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>{dict.dashboard.tableId}</TH>
                    <TH>{dict.dashboard.tableGuest}</TH>
                    <TH>{dict.dashboard.tableType}</TH>
                    <TH>{dict.dashboard.tableDate}</TH>
                    <TH>{dict.dashboard.tableTotal}</TH>
                    <TH>{dict.dashboard.tableStatus}</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.recentReservations.map((r) => (
                    <TR key={r.id}>
                      <TD className="font-mono text-xs text-muted-foreground">{r.code}</TD>
                      <TD>
                        <Link href={`/reservations/${r.id}`} className="font-medium hover:text-primary">
                          {r.guest.firstName} {r.guest.lastName}
                        </Link>
                      </TD>
                      <TD>{r.type === "STAY" ? dict.reservations.stay : dict.reservations.event}</TD>
                      <TD>{fmtDate(r.type === "STAY" ? r.checkIn! : r.eventDate!)}</TD>
                      <TD>{fmtCurrency(r.totalAmount)}</TD>
                      <TD><Badge variant={reservationStatusVariant[r.status]}>{reservationStatusLabel(dict, r.status)}</Badge></TD>
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
