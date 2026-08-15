import { Suspense } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { listReservations } from "@/lib/reservation-list";
import { ReservationsClient } from "@/components/reservations/reservations-client";

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  const reservations = await listReservations();

  return (
    <>
      <Topbar
        title="Reservations"
        actions={
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/reservations?create=1">+ Create Reservation</Link>
          </Button>
        }
      />
      <PageContainer>
        <Suspense>
          <ReservationsClient reservations={reservations} />
        </Suspense>
      </PageContainer>
    </>
  );
}
