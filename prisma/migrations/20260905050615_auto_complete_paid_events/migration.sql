-- Automatically mark EVENT reservations as COMPLETED when payments reach the full total.
CREATE OR REPLACE FUNCTION mark_fully_paid_event_completed()
RETURNS TRIGGER AS $$
DECLARE
  reservation_record RECORD;
  paid_total DOUBLE PRECISION;
BEGIN
  SELECT id, type, status, "totalAmount"
  INTO reservation_record
  FROM "Reservation"
  WHERE id = NEW."reservationId";

  IF reservation_record.type = 'EVENT'
     AND reservation_record.status NOT IN ('CANCELLED', 'NO_SHOW') THEN
    SELECT COALESCE(SUM(amount), 0)
    INTO paid_total
    FROM "Payment"
    WHERE "reservationId" = reservation_record.id;

    IF paid_total >= reservation_record."totalAmount" THEN
      UPDATE "Reservation"
      SET status = 'COMPLETED', "updatedAt" = NOW()
      WHERE id = reservation_record.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Payment_mark_fully_paid_event_completed" ON "Payment";

CREATE TRIGGER "Payment_mark_fully_paid_event_completed"
AFTER INSERT ON "Payment"
FOR EACH ROW
EXECUTE FUNCTION mark_fully_paid_event_completed();

-- Complete existing fully paid events.
UPDATE "Reservation" r
SET status = 'COMPLETED', "updatedAt" = NOW()
WHERE r.type = 'EVENT'
  AND r.status NOT IN ('CANCELLED', 'NO_SHOW', 'COMPLETED')
  AND COALESCE((
    SELECT SUM(p.amount)
    FROM "Payment" p
    WHERE p."reservationId" = r.id
  ), 0) >= r."totalAmount";
