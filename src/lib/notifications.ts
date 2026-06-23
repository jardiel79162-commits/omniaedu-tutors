import { toast } from "sonner";

export function requestNotificationPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

type InAppOpts = {
  tag?: string;
  onClick?: () => void;
  icon?: string;
};

export function showAppNotification(
  title: string,
  body: string,
  tagOrOpts?: string | InAppOpts,
) {
  const opts: InAppOpts =
    typeof tagOrOpts === "string" ? { tag: tagOrOpts } : (tagOrOpts ?? {});
  const visible =
    typeof document !== "undefined" && document.visibilityState === "visible";

  // Always show an in-app banner (sonner toast) — WhatsApp-style heads-up while the app is open.
  try {
    toast(title, {
      description: body,
      id: opts.tag,
      duration: 5000,
      action: opts.onClick
        ? { label: "Abrir", onClick: () => opts.onClick && opts.onClick() }
        : undefined,
    });
  } catch {}

  // OS-level notification only when the tab is in background and permission was granted.
  if (visible) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, tag: opts.tag, icon: opts.icon });
    if (opts.onClick) {
      n.onclick = () => {
        try {
          window.focus();
        } catch {}
        opts.onClick && opts.onClick();
        n.close();
      };
    }
  } catch {}
}
