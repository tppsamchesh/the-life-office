"use client";

import { useEffect, useRef, useState } from "react";

// Horizontal scroll container with edge fades that appear only when more
// content exists in that direction, the board's visible overflow affordance.
export function HScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ left: false, right: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setFade({
        left: el.scrollLeft > 8,
        right: el.scrollLeft < el.scrollWidth - el.clientWidth - 8,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative">
      <div ref={ref} className="flex gap-3 overflow-x-auto pb-2">
        {children}
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-canvas to-transparent transition-opacity duration-200 ${
          fade.left ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-canvas to-transparent transition-opacity duration-200 ${
          fade.right ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
