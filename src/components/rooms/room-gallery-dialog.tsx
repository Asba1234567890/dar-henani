"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function RoomGalleryDialog({
  open,
  onOpenChange,
  photos,
  roomName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photos: string[];
  roomName: string;
}) {
  const [index, setIndex] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setIndex(0);
      }}
    >
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{roomName}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <div className="relative aspect-video overflow-hidden rounded-[var(--radius-md)] bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[index]} alt={`${roomName} photo ${index + 1}`} className="h-full w-full object-cover" />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIndex((i) => (i + 1) % photos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {photos.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-primary" : "w-1.5 bg-border-strong")}
                  aria-label={`Go to photo ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
