"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  BedDouble,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/components/providers/session-provider";
import { logout } from "@/lib/auth/actions";
import type { UserRole } from "@prisma/client";

function useNavItems(role: UserRole) {
  const { t } = useI18n();
  const items = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/reservations", label: t("nav.reservations"), icon: CalendarRange },
    { href: "/rooms", label: t("nav.rooms"), icon: BedDouble },
  ];
  if (role === "ADMIN") {
    items.push(
      { href: "/finance", label: t("nav.finance"), icon: Wallet },
      { href: "/analytics", label: t("nav.analytics"), icon: BarChart3 },
      { href: "/settings", label: t("nav.settings"), icon: Settings }
    );
  }
  return items;
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const session = useSession();
  const navItems = useNavItems(session.role);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-sm">
          DH
        </div>
        <div>
          <p className="font-display text-base leading-tight text-text-primary">Dar Henani</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("nav.tagline")}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:bg-muted hover:text-text-primary"
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-4">
        <Link
          href="/profile"
          onClick={onNavigate}
          className="mb-2 flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 hover:bg-muted"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {session.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">{session.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {session.role === "ADMIN" ? t("settings.roleAdmin") : t("settings.roleUser")}
            </p>
          </div>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-muted hover:text-text-primary"
          >
            <LogOut className="h-4 w-4" /> {t("common.signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:block">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
      }}
      className="lg:hidden"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 10000,
        }}
      />
      {/* Drawer panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "min(85vw, 320px)",
          height: "100dvh",
          backgroundColor: "#ffffff",
          zIndex: 10001,
          boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <button
          onClick={onClose}
          aria-label={t("common.closeMenu")}
          style={{
            position: "absolute",
            right: 12,
            top: 24,
            zIndex: 10,
            borderRadius: "9999px",
            padding: 6,
          }}
          className="text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>,
    document.body
  );
}
