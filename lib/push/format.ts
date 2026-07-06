// Pure helpers for shaping Web Push subscription data. Kept separate from
// PushBanner.tsx (a client component) so this logic is unit-testable under
// vitest, which does not run a browser environment.

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export type SubscriptionPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

// Shapes a PushSubscriptionJSON (from PushSubscription.toJSON()) into the
// flat {endpoint, p256dh, auth} row the push_subscriptions table expects.
export function toSubscriptionPayload(json: {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}): SubscriptionPayload {
  return {
    endpoint: json.endpoint ?? "",
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
  };
}
