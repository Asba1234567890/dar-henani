import { Suspense } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { listReservations } from "@/lib/reservation-list";
import { ReservationsClient } from "@/components/reservations/reservations-client";
import { requireUser } from "@/lib/auth/guards";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  const user = await requireUser();
  const dict = getDictionary(user.language);
  const reservations = await listReservations();

  return (
    <>
      <Topbar
        title={dict.reservations.title}
        isAdmin={user.role === "ADMIN"}
        actions={
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/reservations?create=1">{dict.dashboard.createReservation}</Link>
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
