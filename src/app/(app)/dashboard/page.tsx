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
import {
  reservationStatusLabel,
  reservationStatusVariant,
  paymentStatusLabel,
  paymentStatusVariant,
  eventTypeLabel,
} from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { kpis } = data;

  return (
    <>
      <Topbar
        title="Dashboard"
        actions={
          <Button asChild>
            <Link href="/reservations?create=1">+ Create Reservation</Link>
          </Button>
        }
      />
      <PageContainer className="space-y-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            {formatDate(data.date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Arrivals today" value={kpis.arrivalsToday} icon={LogIn} tone="primary" />
          <StatCard label="Departures today" value={kpis.departuresToday} icon={LogOut} tone="accent" />
          <StatCard label="Guests staying" value={kpis.guestsStaying} icon={Users} tone="default" />
          <StatCard label="Upcoming reservations" value={kpis.upcomingReservations} icon={CalendarClock} tone="default" />
          <StatCard label="Revenue today" value={formatCurrency(kpis.revenueToday)} icon={Banknote} tone="success" />
          <StatCard label="Revenue this month" value={formatCurrency(kpis.revenueMonth)} icon={TrendingUp} tone="success" />
          <StatCard label="Outstanding payments" value={formatCurrency(kpis.outstanding)} icon={AlertCircle} tone="warning" />
          <StatCard label="Occupancy rate" value={`${kpis.occupancyRate}%`} icon={Percent} tone="primary" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            {data.arrivals.length === 0 ? (
              <EmptyState title="No arrivals today" description="Guests checking in today will appear here." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Guest</TH>
                    <TH>Type</TH>
                    <TH>Room / Event</TH>
                    <TH>Check-in</TH>
                    <TH>Payment</TH>
                    <TH>Status</TH>
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
                      <TD>Stay</TD>
                      <TD>{r.room?.name ?? "—"}</TD>
                      <TD>{formatDate(r.checkIn!, { weekday: undefined })}</TD>
                      <TD><Badge variant={paymentStatusVariant[r.paymentStatus]}>{paymentStatusLabel[r.paymentStatus]}</Badge></TD>
                      <TD><Badge variant={reservationStatusVariant[r.status]}>{reservationStatusLabel[r.status]}</Badge></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s departures</CardTitle>
          </CardHeader>
          <CardContent>
            {data.departures.length === 0 ? (
              <EmptyState title="No departures today" description="Guests checking out today will appear here." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Guest</TH>
                    <TH>Room</TH>
                    <TH>Check-out</TH>
                    <TH>Payment</TH>
                    <TH>Status</TH>
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
                      <TD>{formatDate(r.checkOut!)}</TD>
                      <TD><Badge variant={paymentStatusVariant[r.paymentStatus]}>{paymentStatusLabel[r.paymentStatus]}</Badge></TD>
                      <TD><Badge variant={reservationStatusVariant[r.status]}>{reservationStatusLabel[r.status]}</Badge></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s events</CardTitle>
          </CardHeader>
          <CardContent>
            {data.eventsToday.length === 0 ? (
              <EmptyState icon={PartyPopper} title="No events today" description="Weddings, henna nights and other events scheduled for today will appear here." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Event</TH>
                    <TH>Client</TH>
                    <TH>Time</TH>
                    <TH>Guests</TH>
                    <TH>Total</TH>
                    <TH>Payment</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.eventsToday.map((r) => (
                    <TR key={r.id}>
                      <TD>
                        <Link href={`/reservations/${r.id}`} className="font-medium hover:text-primary">
                          {r.eventName || eventTypeLabel[r.eventType!]}
                        </Link>
                      </TD>
                      <TD>{r.guest.firstName} {r.guest.lastName}</TD>
                      <TD>{r.eventStart ?? "—"}{r.eventEnd ? ` – ${r.eventEnd}` : ""}</TD>
                      <TD>{r.guestCount ?? "—"}</TD>
                      <TD>{formatCurrency(r.totalAmount)}</TD>
                      <TD><Badge variant={paymentStatusVariant[r.paymentStatus]}>{paymentStatusLabel[r.paymentStatus]}</Badge></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent reservations</CardTitle>
            <Button variant="link" asChild>
              <Link href="/reservations">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentReservations.length === 0 ? (
              <EmptyState
                title="No reservations yet"
                description="Create your first reservation to start managing Dar Henani."
                action={<Button asChild><Link href="/reservations?create=1">+ Create Reservation</Link></Button>}
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>ID</TH>
                    <TH>Guest</TH>
                    <TH>Type</TH>
                    <TH>Date</TH>
                    <TH>Total</TH>
                    <TH>Status</TH>
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
                      <TD>{r.type === "STAY" ? "Stay" : "Event"}</TD>
                      <TD>{formatDate(r.type === "STAY" ? r.checkIn! : r.eventDate!)}</TD>
                      <TD>{formatCurrency(r.totalAmount)}</TD>
                      <TD><Badge variant={reservationStatusVariant[r.status]}>{reservationStatusLabel[r.status]}</Badge></TD>
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
