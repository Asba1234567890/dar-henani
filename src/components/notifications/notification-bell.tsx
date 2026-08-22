"use client";

import { useCallback, useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Bell, BellOff, Check, Loader2, SendHorizonal } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { markNotificationRead, markAllNotificationsRead } from "@/app/(app)/notifications/actions";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  reservationId: string | null;
  read: boolean;
  createdAt: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true));
}

export function NotificationBell({ isAdmin }: { isAdmin?: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPending, setPushPending] = useState(false);
  const [testPending, setTestPending] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Non-critical background fetch; fail quietly and let the next poll retry.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch + poll on mount
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature-detecting a browser API on mount
    setPushSupported(true);
    navigator.serviceWorker.ready.then(async (registration) => {
      const sub = await registration.pushManager.getSubscription();
      setPushSubscribed(!!sub);
    });
  }, []);

  async function togglePush() {
    if (!("serviceWorker" in navigator)) return;
    setPushPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      if (pushSubscribed) {
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setPushSubscribed(false);
        return;
      }

      if (isIos() && !isStandalone()) {
        toast.error(t("notifications.iosRequiresHomeScreen"));
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") {
          toast.error(t("notifications.permissionBlocked"));
        } else {
          toast.error(t("notifications.permissionDenied"));
        }
        return;
      }

      const keyRes = await fetch("/api/push/vapid-key");
      if (!keyRes.ok) {
        toast.error(t("notifications.notConfigured"));
        return;
      }
      const { key: publicKey } = await keyRes.json();
      if (!publicKey) {
        toast.error(t("notifications.notConfigured"));
        return;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const subRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!subRes.ok) {
        const data = await subRes.json().catch(() => ({}));
        toast.error(data.error || t("common.somethingWentWrong"));
        return;
      }
      setPushSubscribed(true);
      toast.success(t("notifications.pushEnabled"));
    } catch (err) {
      console.error("togglePush failed:", err);
      toast.error(t("common.somethingWentWrong"));
    } finally {
      setPushPending(false);
    }
  }

  async function sendTestPush() {
    setTestPending(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("common.somethingWentWrong"));
        return;
      }
      toast.success(t("notifications.testSent"));
    } catch {
      toast.error(t("common.somethingWentWrong"));
    } finally {
      setTestPending(false);
    }
  }

  async function handleNotificationClick(n: NotificationRow) {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      const result = await markNotificationRead(n.id);
      if (!result.ok) toast.error(result.error);
    }
    setOpen(false);
    if (n.reservationId) router.push(`/reservations/${n.reservationId}`);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    const result = await markAllNotificationsRead();
    if (!result.ok) toast.error(result.error);
  }

  return (
    <Popover.Root open={open} onOpenChange={(next) => { setOpen(next); if (next) fetchNotifications(); }}>
      <Popover.Trigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-muted hover:text-text-primary"
          aria-label={t("notifications.title")}
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-[110] w-[340px] max-w-[90vw] rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-lg)]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-text-primary">{t("notifications.title")}</p>
            <div className="flex items-center gap-2">
              {isAdmin && pushSubscribed && (
                <button
                  onClick={sendTestPush}
                  disabled={testPending}
                  className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary disabled:opacity-40"
                  title={t("notifications.sendTest")}
                >
                  {testPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizonal className="h-3.5 w-3.5" />}
                </button>
              )}
              <button
                onClick={togglePush}
                disabled={!pushSupported || pushPending}
                className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary disabled:opacity-40"
                title={pushSubscribed ? t("notifications.disablePush") : t("notifications.enablePush")}
              >
                {pushPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : pushSubscribed ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
              </button>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Check className="h-3 w-3" /> {t("notifications.markAllRead")}
                </button>
              )}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-secondary">{t("notifications.empty")}</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "block w-full border-b border-border px-4 py-3 text-left text-sm transition-colors hover:bg-muted last:border-b-0",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <p className="font-medium text-text-primary">{n.title}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{n.body}</p>
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
