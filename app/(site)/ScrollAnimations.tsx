"use client";

import { useEffect } from "react";

// Attaches the fade-up / word-reveal scroll behaviour to elements already in the
// server-rendered markup. Renders nothing. Reduced-motion is handled in CSS.
export function ScrollAnimations() {
  useEffect(() => {
    /* ── WORD-BY-WORD REVEAL ─────────────────────────────────── */
    document.querySelectorAll<HTMLElement>(".word-reveal").forEach((el) => {
      const text = el.textContent ?? "";
      el.innerHTML = text
        .split(" ")
        .map((word, i) => `<span class="word-span" style="--i:${i}">${word}</span>`)
        .join(" ");
    });

    /* ── INTERSECTION OBSERVER (fade-up + word reveal) ────────── */
    const targets = document.querySelectorAll<HTMLElement>(".fade-up, .word-reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
    );

    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return null;
}
