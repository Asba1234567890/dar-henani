"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateReservationDialog } from "@/components/reservations/create-reservation-dialog";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { reservationStatusLabel, reservationStatusVariant, paymentStatusLabel, paymentStatusVariant } from "@/lib/status";
import { useI18n } from "@/lib/i18n/provider";
import type { ReservationWithRelations } from "@/lib/reservations";

type Derived = ReservationWithRelations & { amountPaid: number; remainingAmount: number; paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID" };

const FILTERS = ["All", "Today", "Upcoming", "Stays", "Events", "Cancelled"] as const;
type Filter = (typeof FILTERS)[number];

export function ReservationsClient({ reservations }: { reservations: Derived[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, dict, language } = useI18n();
  const fmtDate = (d: Date | string, opts?: Intl.DateTimeFormatOptions) => formatDate(d, opts, language);
  const fmtCurrency = (n: number) => formatCurrency(n, undefined, language);
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(() => searchParams.get("create") === "1");

  const FILTER_LABELS: Record<Filter, string> = {
    All: t("common.allStatuses"),
    Today: t("common.today"),
    Upcoming: t("dashboard.upcomingReservations"),
    Stays: t("reservations.stay") + "s",
    Events: t("reservations.event") + "s",
    Cancelled: t("enums.reservationStatus.CANCELLED"),
  };

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      router.replace("/reservations");
    }
  }, [searchParams, router]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const today = useMemo(() => new Date(new Date().toDateString()), []);

  const filtered = useMemo(() => {
    let list = reservations;
    switch (filter) {
      case "Today":
        list = list.filter((r) => {
          const d = r.type === "STAY" ? r.checkIn : r.eventDate;
          return d && new Date(new Date(d).toDateString()).getTime() === today.getTime();
        });
        break;
      case "Upcoming":
        list = list.filter((r) => {
          const d = r.type === "STAY" ? r.checkIn : r.eventDate;
          return d && new Date(d) > today && r.status !== "CANCELLED";
        });
        break;
      case "Stays":
        list = list.filter((r) => r.type === "STAY");
        break;
      case "Events":
        list = list.filter((r) => r.type === "EVENT");
        break;
      case "Cancelled":
        list = list.filter((r) => r.status === "CANCELLED" || r.status === "NO_SHOW");
        break;
    }
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          `${r.guest.firstName} ${r.guest.lastName}`.toLowerCase().includes(q) ||
          r.guest.phone?.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reservations, filter, debouncedQuery, today]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="flex-wrap">
            {FILTERS.map((f) => (
              <TabsTrigger key={f} value={f}>{FILTER_LABELS[f]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("reservations.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="sm:hidden">
          <CalendarPlus className="h-4 w-4" /> {t("reservations.newReservation")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              className="border-none"
              title={t("reservations.noResults")}
              description={reservations.length === 0 ? t("dashboard.noReservationsYetDesc") : t("reservations.tryAdjustingFilters")}
              action={reservations.length === 0 ? <Button onClick={() => setCreateOpen(true)}>{t("dashboard.createReservation")}</Button> : undefined}
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>{t("reservations.tableCode")}</TH>
                  <TH>{t("reservations.tableType")}</TH>
                  <TH>{t("reservations.tableGuest")}</TH>
                  <TH>{t("reservations.tableDates")}</TH>
                  <TH>{t("reservations.tableRoomOrSpace")}</TH>
                  <TH>{t("reservations.tableTotal")}</TH>
                  <TH>{t("reservations.amountPaid")}</TH>
                  <TH>{t("reservations.remaining")}</TH>
                  <TH>{t("dashboard.tablePayment")}</TH>
                  <TH>{t("reservations.tableStatus")}</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-mono text-xs text-muted-foreground">
                      <Link href={`/reservations/${r.id}`} className="hover:text-primary">{r.code}</Link>
                    </TD>
                    <TD>
                      <Badge variant={r.type === "STAY" ? "primary" : "accent"}>{r.type === "STAY" ? t("reservations.stay") : t("reservations.event")}</Badge>
                    </TD>
                    <TD>
                      <Link href={`/reservations/${r.id}`} className="font-medium hover:text-primary">
                        {r.guest.firstName} {r.guest.lastName}
                      </Link>
                    </TD>
                    <TD>{fmtDate(r.type === "STAY" ? r.checkIn! : r.eventDate!)}</TD>
                    <TD>{r.type === "STAY" ? r.room?.name ?? "—" : r.eventSpace?.name ?? "—"}</TD>
                    <TD>{fmtCurrency(r.totalAmount)}</TD>
                    <TD className="text-success">{fmtCurrency(r.amountPaid)}</TD>
                    <TD className={cn(r.remainingAmount > 0 && "text-error font-medium")}>{fmtCurrency(r.remainingAmount)}</TD>
                    <TD><Badge variant={paymentStatusVariant[r.paymentStatus]}>{paymentStatusLabel(dict, r.paymentStatus)}</Badge></TD>
                    <TD><Badge variant={reservationStatusVariant[r.status]}>{reservationStatusLabel(dict, r.status)}</Badge></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateReservationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
