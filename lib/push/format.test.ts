import { describe, expect, it } from "vitest";

import { toSubscriptionPayload, urlBase64ToUint8Array } from "./format";

describe("urlBase64ToUint8Array", () => {
  it("decodes a base64url string into bytes", () => {
    // "AAECAw" (base64url, no padding) decodes to bytes [0, 1, 2, 3]
    expect(Array.from(urlBase64ToUint8Array("AAECAw"))).toEqual([0, 1, 2, 3]);
  });

  it("handles base64url characters (- and _) not present in standard base64", () => {
    // base64url "--__" -> standard base64 "++//" -> bytes [0xfb, 0xef, 0xff]
    expect(Array.from(urlBase64ToUint8Array("--__"))).toEqual([0xfb, 0xef, 0xff]);
  });

  it("pads short strings correctly", () => {
    // "AA" (2 chars) needs 2 padding chars to reach a multiple of 4 -> "AA==" -> [0]
    expect(Array.from(urlBase64ToUint8Array("AA"))).toEqual([0]);
  });
});

describe("toSubscriptionPayload", () => {
  it("shapes a PushSubscriptionJSON into the endpoint/p256dh/auth payload", () => {
    const json = {
      endpoint: "https://push.example.com/abc",
      keys: { p256dh: "key-p256dh", auth: "key-auth" },
    };
    expect(toSubscriptionPayload(json)).toEqual({
      endpoint: "https://push.example.com/abc",
      p256dh: "key-p256dh",
      auth: "key-auth",
    });
  });

  it("defaults missing keys to empty strings rather than throwing", () => {
    const json = { endpoint: "https://push.example.com/abc" };
    expect(toSubscriptionPayload(json)).toEqual({
      endpoint: "https://push.example.com/abc",
      p256dh: "",
      auth: "",
    });
  });
});
