"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateReservationNotes } from "@/app/(app)/reservations/actions";

export function NotesEditor({ reservationId, initialNotes }: { reservationId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();
  const dirty = notes !== initialNotes;

  function save() {
    startTransition(async () => {
      const result = await updateReservationNotes(reservationId, notes);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Notes saved");
    });
  }

  return (
    <div className="space-y-2">
      <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="No notes yet." />
      {dirty && (
        <Button size="sm" variant="outline" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save notes
        </Button>
      )}
    </div>
  );
}
