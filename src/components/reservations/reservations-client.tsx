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
import {
  reservationStatusLabel,
  reservationStatusVariant,
  paymentStatusLabel,
  paymentStatusVariant,
} from "@/lib/status";
import type { ReservationWithRelations } from "@/lib/reservations";

type Derived = ReservationWithRelations & { amountPaid: number; remainingAmount: number; paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID" };

const FILTERS = ["All", "Today", "Upcoming", "Stays", "Events", "Cancelled"] as const;
type Filter = (typeof FILTERS)[number];

export function ReservationsClient({ reservations }: { reservations: Derived[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(() => searchParams.get("create") === "1");

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      router.replace("/reservations");
    }
  }, [searchParams, router]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
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
              <TabsTrigger key={f} value={f}>{f}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search guest, phone, or ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="sm:hidden">
          <CalendarPlus className="h-4 w-4" /> Create Reservation
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              className="border-none"
              title="No reservations found"
              description={reservations.length === 0 ? "Create your first reservation to start managing Dar Henani." : "Try adjusting your filters or search."}
              action={reservations.length === 0 ? <Button onClick={() => setCreateOpen(true)}>+ Create Reservation</Button> : undefined}
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>ID</TH>
                  <TH>Type</TH>
                  <TH>Guest</TH>
                  <TH>Date</TH>
                  <TH>Room / Event</TH>
                  <TH>Total</TH>
                  <TH>Paid</TH>
                  <TH>Remaining</TH>
                  <TH>Payment</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-mono text-xs text-muted-foreground">
                      <Link href={`/reservations/${r.id}`} className="hover:text-primary">{r.code}</Link>
                    </TD>
                    <TD>
                      <Badge variant={r.type === "STAY" ? "primary" : "accent"}>{r.type === "STAY" ? "Stay" : "Event"}</Badge>
                    </TD>
                    <TD>
                      <Link href={`/reservations/${r.id}`} className="font-medium hover:text-primary">
                        {r.guest.firstName} {r.guest.lastName}
                      </Link>
                    </TD>
                    <TD>{formatDate(r.type === "STAY" ? r.checkIn! : r.eventDate!)}</TD>
                    <TD>{r.type === "STAY" ? r.room?.name ?? "—" : r.eventSpace?.name ?? "—"}</TD>
                    <TD>{formatCurrency(r.totalAmount)}</TD>
                    <TD className="text-success">{formatCurrency(r.amountPaid)}</TD>
                    <TD className={cn(r.remainingAmount > 0 && "text-error font-medium")}>{formatCurrency(r.remainingAmount)}</TD>
                    <TD><Badge variant={paymentStatusVariant[r.paymentStatus]}>{paymentStatusLabel[r.paymentStatus]}</Badge></TD>
                    <TD><Badge variant={reservationStatusVariant[r.status]}>{reservationStatusLabel[r.status]}</Badge></TD>
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
