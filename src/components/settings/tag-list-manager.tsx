"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function TagListManager({
  title,
  items,
  onAdd,
  onDelete,
  placeholder,
}: {
  title: string;
  items: { id: string; name: string }[];
  onAdd: (name: string) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean }>;
  placeholder: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    if (!value.trim()) return;
    startTransition(async () => {
      const result = await onAdd(value.trim());
      if (!result.ok) {
        toast.error(result.error || "Something went wrong.");
        return;
      }
      setValue("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await onDelete(id);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {items.length === 0 && <p className="text-sm text-text-secondary">None yet.</p>}
          {items.map((item) => (
            <Badge key={item.id} variant="outline" className="gap-1.5 pr-1.5">
              {item.name}
              <button onClick={() => remove(item.id)} className="rounded-full p-0.5 hover:bg-muted" aria-label={`Remove ${item.name}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button variant="outline" onClick={add} disabled={pending || !value.trim()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
