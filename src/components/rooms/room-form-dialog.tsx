"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ImagePlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldGroup } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fileToResizedDataUrl } from "@/lib/image";
import { createRoom, updateRoom } from "@/app/(app)/rooms/actions";
import { useI18n } from "@/lib/i18n/provider";

type RoomType = { id: string; name: string };
type Amenity = { id: string; name: string };

export type RoomFormValue = {
  id?: string;
  name: string;
  roomTypeId: string;
  capacity: number;
  pricePerNight: number;
  description: string;
  amenityIds: string[];
  photos: string[];
};

const empty: RoomFormValue = { name: "", roomTypeId: "", capacity: 2, pricePerNight: 0, description: "", amenityIds: [], photos: [] };
const MAX_PHOTOS = 6;

export function RoomFormDialog({
  open,
  onOpenChange,
  roomTypes,
  amenities,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roomTypes: RoomType[];
  amenities: Amenity[];
  initial?: RoomFormValue;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<RoomFormValue>(initial ?? empty);
  const [prevOpen, setPrevOpen] = useState(open);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setValue(initial ?? empty);
  }

  function toggleAmenity(id: string) {
    setValue((v) => ({ ...v, amenityIds: v.amenityIds.includes(id) ? v.amenityIds.filter((x) => x !== id) : [...v.amenityIds, id] }));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - value.photos.length;
    if (remaining <= 0) {
      toast.error(t("rooms.maxPhotosError", { max: MAX_PHOTOS }));
      return;
    }
    setUploading(true);
    try {
      const selected = Array.from(files).slice(0, remaining);
      const dataUrls = await Promise.all(selected.map((f) => fileToResizedDataUrl(f)));
      setValue((v) => ({ ...v, photos: [...v.photos, ...dataUrls] }));
    } catch {
      toast.error(t("rooms.readImageError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePhoto(index: number) {
    setValue((v) => ({ ...v, photos: v.photos.filter((_, i) => i !== index) }));
  }

  function handleSubmit() {
    startTransition(async () => {
      const payload = {
        name: value.name,
        roomTypeId: value.roomTypeId || undefined,
        capacity: value.capacity,
        pricePerNight: value.pricePerNight,
        description: value.description || undefined,
        amenityIds: value.amenityIds,
        photos: value.photos,
      };
      const result = value.id ? await updateRoom(value.id, payload) : await createRoom(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(value.id ? t("rooms.roomUpdated") : t("rooms.roomAdded"));
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{value.id ? t("rooms.editRoom") : t("rooms.addRoom")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-2">
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup>
              <Label>{t("rooms.roomNameNumber")}</Label>
              <Input value={value.name} onChange={(e) => setValue((v) => ({ ...v, name: e.target.value }))} />
            </FieldGroup>
            <FieldGroup>
              <Label>{t("rooms.roomType")}</Label>
              <Select value={value.roomTypeId} onChange={(e) => setValue((v) => ({ ...v, roomTypeId: e.target.value }))}>
                <option value="">—</option>
                {roomTypes.map((rt) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label>{t("rooms.capacity")}</Label>
              <Input type="number" min={1} value={value.capacity} onChange={(e) => setValue((v) => ({ ...v, capacity: Number(e.target.value) }))} />
            </FieldGroup>
            <FieldGroup>
              <Label>{t("rooms.pricePerNight")}</Label>
              <Input type="number" min={0} value={value.pricePerNight} onChange={(e) => setValue((v) => ({ ...v, pricePerNight: Number(e.target.value) }))} />
            </FieldGroup>
          </div>
          <FieldGroup>
            <Label>{t("rooms.description")}</Label>
            <Textarea rows={2} value={value.description} onChange={(e) => setValue((v) => ({ ...v, description: e.target.value }))} />
          </FieldGroup>
          <div>
            <Label>{t("rooms.amenities")}</Label>
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAmenity(a.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    value.amenityIds.includes(a.id) ? "border-primary bg-primary/10 text-primary" : "border-border-strong text-text-secondary hover:bg-muted"
                  )}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>{t("rooms.photos")}</Label>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {value.photos.map((src, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-[var(--radius-sm)] border border-border">
                  {/* data-URL thumbnails from client-side resize, not remote images */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Room photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={t("rooms.removePhoto")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {value.photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-dashed border-border-strong text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  <span className="text-[10px]">{t("rooms.addPhoto")}</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">{t("rooms.photosHint", { max: MAX_PHOTOS })}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={pending || !value.name || value.pricePerNight <= 0}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {value.id ? t("common.saveChanges") : t("rooms.addRoom")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
