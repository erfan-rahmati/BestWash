"use client";

import { useEffect } from "react";
import {
  hasCustomerSessionHint,
  subscribePush,
} from "../../lib/api/account";

function publicKeyBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js")
        .then(async () => {
          if (!("PushManager" in window) || !("Notification" in window)) return;
          const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
          if (!publicKey || localStorage.getItem("bw-push-permission-asked"))
            return;
          if (!hasCustomerSessionHint()) return;
          localStorage.setItem("bw-push-permission-asked", "1");
          const permission = await Notification.requestPermission();
          if (permission !== "granted") return;
          const registration = await navigator.serviceWorker.ready;
          const existing = await registration.pushManager.getSubscription();
          const subscription =
            existing ??
            (await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: publicKeyBytes(publicKey),
            }));
          await subscribePush(subscription.toJSON()).catch(() => null);
        })
        .catch(() => null);
    }
  }, []);
  return null;
}
