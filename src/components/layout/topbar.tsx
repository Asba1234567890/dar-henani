"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { MobileSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";

export function Topbar({ title, actions }: { title: string; actions?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/85 px-4 py-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-xl font-medium text-text-primary sm:text-2xl">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
      <MobileSidebar open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
