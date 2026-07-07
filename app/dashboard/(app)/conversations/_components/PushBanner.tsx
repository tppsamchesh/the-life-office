"use client";

import { useEffect, useState } from "react";

import { Button } from "../../_components/ui";
import { toSubscriptionPayload, urlBase64ToUint8Array } from "@/lib/push/format";

import { removePushSubscription, savePushSubscription } from "../push-actions";

type Status = "loading" | "unsupported" | "ios-install" | "ready" | "subscribed" | "denied" | "error";

export function PushBanner() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus(isIOS && !standalone ? "ios-install" : "unsupported");
      return;
    }
    if (isIOS && !standalone) {
      setStatus("ios-install");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "ready");
    }).catch(() => setStatus("error"));
  }, []);

  async function subscribe() {
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setStatus("error");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await savePushSubscription(toSubscriptionPayload(sub.toJSON()));
      setStatus("subscribed");
    } catch {
      setStatus(Notification.permission === "denied" ? "denied" : "error");
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  if (status === "loading" || status === "unsupported") return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm">
      {status === "ios-install" ? (
        <span className="text-muted">
          To get notifications on iPhone: tap Share, then Add to Home Screen, then open the app from there.
        </span>
      ) : status === "denied" ? (
        <span className="text-muted">
          Notifications are blocked in your browser settings for this site.
        </span>
      ) : status === "error" ? (
        <span className="text-alert">Could not set up notifications. Try again later.</span>
      ) : status === "subscribed" ? (
        <>
          <span className="text-muted">Notifications are on for this device.</span>
          <Button type="button" variant="quiet" onClick={unsubscribe}>
            Turn off
          </Button>
        </>
      ) : (
        <>
          <span className="text-muted">Get notified when clients message.</span>
          <Button type="button" variant="primary" onClick={subscribe}>
            Enable notifications
          </Button>
        </>
      )}
    </div>
  );
}
