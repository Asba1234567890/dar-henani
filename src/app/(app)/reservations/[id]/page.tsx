import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deriveReservation } from "@/lib/reservations";
import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  reservationStatusLabel,
  reservationStatusVariant,
  paymentStatusLabel,
  paymentStatusVariant,
  bookingSourceLabel,
  eventTypeLabel,
  paymentMethodLabel,
} from "@/lib/status";
import { ReservationActions } from "@/components/reservations/reservation-actions";
import { NotesEditor } from "@/components/reservations/notes-editor";
import { requireUser } from "@/lib/auth/guards";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const dict = getDictionary(user.language);
  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      guest: true,
      room: true,
      eventSpace: true,
      payments: { orderBy: { createdAt: "desc" } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!reservation) notFound();

  const r = deriveReservation(reservation);
  const services: string[] = r.services ? JSON.parse(r.services) : [];

  return (
    <>
      <Topbar
        title={r.code}
        actions={<ReservationActions reservationId={r.id} status={r.status} remainingAmount={r.remainingAmount} />}
      />
      <PageContainer className="space-y-6">
        <Link href="/reservations" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> {dict.reservations.backToReservations}
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={r.type === "STAY" ? "primary" : "accent"} className="text-sm">{r.type === "STAY" ? dict.reservations.stay : dict.reservations.event}</Badge>
          <Badge variant={reservationStatusVariant[r.status]} className="text-sm">{reservationStatusLabel(dict, r.status)}</Badge>
          <Badge variant={paymentStatusVariant[r.paymentStatus]} className="text-sm">{paymentStatusLabel(dict, r.paymentStatus)}</Badge>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader><CardTitle>{dict.reservations.guestInformation}</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Info label={dict.reservations.name} value={`${r.guest.firstName} ${r.guest.lastName}`} />
                <Info label={dict.reservations.phone} value={r.guest.phone || "—"} />
                <Info label={dict.reservations.email} value={r.guest.email || "—"} />
                <Info label={dict.reservations.idNumber} value={r.guest.idNumber || "—"} />
                {r.type === "STAY" && <Info label={dict.reservations.adultsChildren} value={`${r.adults ?? 0} / ${r.children ?? 0}`} />}
                <Info label={dict.reservations.source} value={bookingSourceLabel(dict, r.source)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{r.type === "STAY" ? dict.reservations.stayDetails : dict.reservations.eventDetailsTitle}</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                {r.type === "STAY" ? (
                  <>
                    <Info label={dict.reservations.room} value={r.room?.name || "—"} />
                    <Info label={dict.reservations.checkIn} value={formatDate(r.checkIn!)} />
                    <Info label={dict.reservations.checkOut} value={formatDate(r.checkOut!)} />
                  </>
                ) : (
                  <>
                    <Info label={dict.reservations.eventType} value={eventTypeLabel(dict, r.eventType!)} />
                    <Info label={dict.reservations.eventName} value={r.eventName || "—"} />
                    <Info label={dict.reservations.eventSpace} value={r.eventSpace?.name || "—"} />
                    <Info label={dict.reservations.date} value={formatDate(r.eventDate!)} />
                    <Info label={dict.common.time} value={`${r.eventStart} – ${r.eventEnd}`} />
                    <Info label={dict.common.guests} value={String(r.guestCount ?? "—")} />
                    {services.length > 0 && (
                      <div className="col-span-full">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{dict.reservations.optionalServices}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {services.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{dict.reservations.paymentInformation}</CardTitle></CardHeader>
              <CardContent>
                {r.payments.length === 0 ? (
                  <EmptyState title={dict.reservations.noPaymentsRecorded} description={dict.reservations.addPaymentDesc} />
                ) : (
                  <Table>
                    <THead>
                      <TR><TH>{dict.common.date}</TH><TH>{dict.reservations.amount}</TH><TH>{dict.reservations.method}</TH><TH>{dict.reservations.note}</TH></TR>
                    </THead>
                    <TBody>
                      {r.payments.map((p) => (
                        <TR key={p.id}>
                          <TD>{formatDate(p.createdAt, { hour: "2-digit", minute: "2-digit" })}</TD>
                          <TD className="font-medium text-success">{formatCurrency(p.amount)}</TD>
                          <TD>{paymentMethodLabel(dict, p.method)}</TD>
                          <TD className="max-w-xs truncate text-text-secondary">{p.note || "—"}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{dict.common.notes}</CardTitle></CardHeader>
              <CardContent>
                <NotesEditor reservationId={r.id} initialNotes={r.notes || ""} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>{dict.reservations.pricing}</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <Row label={dict.reservations.basePrice} value={formatCurrency(r.basePrice)} />
                <Row label={dict.reservations.extraCharges} value={`+ ${formatCurrency(r.extraCharges)}`} />
                <Row label={dict.reservations.discount} value={`- ${formatCurrency(r.discount)}`} />
                <div className="my-2 border-t border-border" />
                <Row label={dict.reservations.totalAmount} value={formatCurrency(r.totalAmount)} strong />
                <Row label={dict.reservations.amountPaid} value={formatCurrency(r.amountPaid)} tone="success" />
                <Row label={dict.reservations.remaining} value={formatCurrency(r.remainingAmount)} tone={r.remainingAmount > 0 ? "error" : undefined} strong />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{dict.reservations.details}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label={dict.reservations.reservationId} value={r.code} mono />
                <Row label={dict.reservations.createdByLabel} value={r.createdBy?.name || dict.reservations.system} />
                <Row label={dict.reservations.created} value={formatDate(r.createdAt, { hour: "2-digit", minute: "2-digit" })} />
                <Row label={dict.reservations.lastUpdated} value={formatDate(r.updatedAt, { hour: "2-digit", minute: "2-digit" })} />
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-text-primary">{value}</p>
    </div>
  );
}

function Row({ label, value, strong, tone, mono }: { label: string; value: string; strong?: boolean; tone?: "success" | "error"; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span
        className={[
          strong ? "font-medium text-text-primary" : "text-text-primary",
          tone === "success" ? "text-success" : "",
          tone === "error" ? "text-error" : "",
          mono ? "font-mono text-xs" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

