'use client';

import { useEffect } from "react";
import Image from "next/image";

export default function Home() {

  useEffect(() => {
    const prefersReducedMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ── WORD-BY-WORD REVEAL ─────────────────────────────────── */
    document
      .querySelectorAll<HTMLElement>(".word-reveal")
      .forEach((el) => {
        const text = el.textContent ?? "";
        el.innerHTML = text
          .split(" ")
          .map(
            (word, i) =>
              `<span class="word-span" style="--i:${i}" aria-hidden="false">${word}</span>`
          )
          .join(" ");
      });

    /* ── INTERSECTION OBSERVER (fade-up + word reveal) ────────── */
    const targets = document.querySelectorAll<HTMLElement>(
      ".fade-up, .word-reveal"
    );

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

    /* ── CUSTOM CURSOR ────────────────────────────────────────── */
    const isTouch =
      "ontouchstart" in window ||
      !window.matchMedia("(pointer: fine)").matches;

    const cursor =
      document.querySelector<HTMLElement>(".custom-cursor");

    let rafId: number;

    if (!isTouch && cursor && !prefersReducedMotion) {
      cursor.style.opacity = "1";
      document.body.style.cursor = "none";

      let x = -100,
        y = -100,
        targetX = -100,
        targetY = -100,
        hovering = false;

      const onMove = (e: MouseEvent) => {
        targetX = e.clientX;
        targetY = e.clientY;
      };

      const setHover = (v: boolean) => () => {
        hovering = v;
      };

      document.addEventListener("mousemove", onMove);
      document.querySelectorAll("a, button, label").forEach((el) => {
        el.addEventListener("mouseenter", setHover(true));
        el.addEventListener("mouseleave", setHover(false));
      });

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      const tick = () => {
        x = lerp(x, targetX, 0.12);
        y = lerp(y, targetY, 0.12);
        const s = hovering ? 32 : 12;
        cursor.style.width = `${s}px`;
        cursor.style.height = `${s}px`;
        cursor.style.left = `${x - s / 2}px`;
        cursor.style.top = `${y - s / 2}px`;
        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);

      return () => {
        observer.disconnect();
        cancelAnimationFrame(rafId);
        document.body.style.cursor = "";
        document.removeEventListener("mousemove", onMove);
      };
    }

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* ── CUSTOM CURSOR ─────────────────────────────────────── */}
      <div
        className="custom-cursor fixed rounded-full bg-[#A8B2A1] pointer-events-none z-[200] opacity-0"
        style={{
          width: 12,
          height: 12,
          top: -100,
          left: -100,
          transition: "width 0.25s ease, height 0.25s ease",
        }}
        aria-hidden="true"
      />

      {/* HERO */}
      <section className="relative min-h-dvh flex items-center justify-center px-6 md:px-16 overflow-hidden">
        <Image
          src="/Hero image 1.avif"
          alt="The Life Office"
          fill
          className="object-cover hero-image"
          priority
        />
        <div className="absolute inset-0 bg-[#1F1F1F]/50" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p
            className="text-[#A8B2A1] text-xs tracking-widest uppercase mb-8 md:mb-12 fade-up"
          >
            The Life Office
          </p>
          <h1
            className="word-reveal font-serif text-[#F7F5F2] text-[2rem] sm:text-4xl md:text-5xl lg:text-6xl font-light leading-snug md:leading-tight tracking-wide mb-8 md:mb-10"
          >
            A life well managed is a life well lived.
          </h1>
          <p
            className="text-[#D8D2C8] text-base md:text-lg font-light leading-relaxed mb-12 md:mb-16 max-w-xl mx-auto fade-up"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          >
            Discreet, expert support for the people who expect nothing but the best.
          </p>
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-up"
            style={{ "--delay": "0.35s" } as React.CSSProperties}
          >
            <a
              href="/#work-with-us"
              className="bg-[#A8B2A1] text-[#1F1F1F] text-xs tracking-widest uppercase px-10 py-4 hover:bg-[#96a08f] transition-colors w-full sm:w-auto text-center"
            >
              Work with us
            </a>
            <a
              href="#what-we-deliver"
              className="text-[#F7F5F2] text-xs tracking-widest uppercase border border-[#F7F5F2]/60 px-10 py-4 hover:border-[#F7F5F2] hover:bg-[#F7F5F2]/10 transition-colors w-full sm:w-auto text-center"
            >
              Discover more
            </a>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF STRIP */}
      <div className="bg-[#D8D2C8] px-6 py-5 md:py-6 fade-up">
        <p className="text-[#1F1F1F] text-[10px] sm:text-xs tracking-widest uppercase text-center font-light">
          The choice of founders, executives and families who refuse to settle.
        </p>
      </div>

      {/* WHAT WE DELIVER */}
      <section id="what-we-deliver">

        {/* Row 1 — The Quiet Structure — odd: title left, description right */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="bg-[#1F1F1F] flex flex-col justify-center px-6 py-10 md:px-14 lg:px-20 md:py-20">
            <p className="text-[#A8B2A1] text-xs tracking-widest uppercase mb-6 fade-up">
              What we deliver
            </p>
            <h3
              className="word-reveal font-serif text-[#F7F5F2] text-2xl md:text-4xl lg:text-5xl font-light leading-tight"
            >
              The Quiet Structure
            </h3>
          </div>
          <div className="bg-[#F7F5F2] flex items-center px-6 py-10 md:px-14 lg:px-20 md:py-20">
            <p
              className="font-serif italic text-[#1F1F1F] text-lg md:text-2xl lg:text-3xl font-light leading-relaxed fade-up"
            >
              Beneath every effortless life is an invisible architecture. We build it, maintain it, and ensure it never falters.
            </p>
          </div>
        </div>

        {/* Row 2 — Personal Affairs — even: description left, title right */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="order-1 md:order-2 bg-[#1F1F1F] flex flex-col justify-center px-6 py-10 md:px-14 lg:px-20 md:py-20">
            <h3
              className="word-reveal font-serif text-[#F7F5F2] text-2xl md:text-4xl lg:text-5xl font-light leading-tight"
            >
              Personal Affairs
            </h3>
          </div>
          <div className="order-2 md:order-1 bg-[#F7F5F2] flex items-center px-6 py-10 md:px-14 lg:px-20 md:py-20">
            <p
              className="font-serif italic text-[#1F1F1F] text-lg md:text-2xl lg:text-3xl font-light leading-relaxed fade-up"
            >
              Every appointment, commitment and detail attended to before you think to ask. Quietly. Precisely. Without fail.
            </p>
          </div>
        </div>

        {/* Row 3 — Professional Support — odd: title left, description right */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="bg-[#1F1F1F] flex flex-col justify-center px-6 py-10 md:px-14 lg:px-20 md:py-20">
            <h3
              className="word-reveal font-serif text-[#F7F5F2] text-2xl md:text-4xl lg:text-5xl font-light leading-tight"
            >
              Professional Support
            </h3>
          </div>
          <div className="bg-[#F7F5F2] flex items-center px-6 py-10 md:px-14 lg:px-20 md:py-20">
            <p
              className="font-serif italic text-[#1F1F1F] text-lg md:text-2xl lg:text-3xl font-light leading-relaxed fade-up"
            >
              Your diary protected. Your correspondence immaculate. Your professional world running exactly as it should.
            </p>
          </div>
        </div>

        {/* Row 4 — Occasions — even: description left, title right */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="order-1 md:order-2 bg-[#1F1F1F] flex flex-col justify-center px-6 py-10 md:px-14 lg:px-20 md:py-20">
            <h3
              className="word-reveal font-serif text-[#F7F5F2] text-2xl md:text-4xl lg:text-5xl font-light leading-tight"
            >
              Occasions
            </h3>
          </div>
          <div className="order-2 md:order-1 bg-[#F7F5F2] flex items-center px-6 py-10 md:px-14 lg:px-20 md:py-20">
            <p
              className="font-serif italic text-[#1F1F1F] text-lg md:text-2xl lg:text-3xl font-light leading-relaxed fade-up"
            >
              From the most intimate gathering to the grandest occasion — conceived, curated and delivered without a single detail overlooked.
            </p>
          </div>
        </div>

      </section>

      {/* WHO WE WORK WITH */}
      <section className="bg-[#1F1F1F] px-6 md:px-16 py-20 md:py-32">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#A8B2A1] text-xs tracking-widest uppercase mb-16 md:mb-20 fade-up">
            Who we work with
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#A8B2A1]/40">
            <div className="flex items-center justify-center text-center py-12 md:py-8 md:pr-12 lg:pr-16">
              <p
                className="word-reveal font-serif italic text-[#F7F5F2] text-xl lg:text-2xl font-light leading-relaxed"
              >
                Those who have built enough to know their time is irreplaceable.
              </p>
            </div>
            <div className="flex items-center justify-center text-center py-12 md:py-8 md:px-12 lg:px-16">
              <p
                className="word-reveal font-serif italic text-[#F7F5F2] text-xl lg:text-2xl font-light leading-relaxed"
              >
                Those who understand that true luxury is never having to think about the details.
              </p>
            </div>
            <div className="flex items-center justify-center text-center py-12 md:py-8 md:pl-12 lg:pl-16">
              <p
                className="word-reveal font-serif italic text-[#F7F5F2] text-xl lg:text-2xl font-light leading-relaxed"
              >
                Those who want their life to feel as exceptional as the one they have worked for.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="grid grid-cols-1 md:grid-cols-2 overflow-hidden">

        {/* Left: sage */}
        <div className="bg-[#A8B2A1] px-6 py-12 md:px-12 lg:px-16 md:py-20">
          <p className="text-[#1F1F1F] text-xs tracking-widest uppercase mb-10 md:mb-14 fade-up">
            How it works
          </p>
          <h2
            className="word-reveal font-serif text-[#1F1F1F] text-3xl md:text-3xl lg:text-4xl font-light tracking-wide mb-12 md:mb-16"
          >
            Effortless by design.
          </h2>

          {/* Steps */}
          <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-0">

            <div
              className="flex-1 fade-up"
              style={{ "--delay": "0.1s" } as React.CSSProperties}
            >
              <div className="w-10 h-10 rounded-full border border-[#1F1F1F] flex items-center justify-center mb-5">
                <span className="font-serif text-[#1F1F1F] text-base">1</span>
              </div>
              <p className="text-[#1F1F1F] text-xs tracking-widest uppercase mb-3">
                A conversation
              </p>
              <p className="text-[#1F1F1F] text-sm font-light leading-relaxed">
                We take the time to understand your world completely before we begin.
              </p>
            </div>

            <div className="hidden md:flex items-start justify-center shrink-0 px-3 pt-[18px] text-[#1F1F1F]">
              &#8594;
            </div>

            <div
              className="flex-1 fade-up"
              style={{ "--delay": "0.22s" } as React.CSSProperties}
            >
              <div className="w-10 h-10 rounded-full border border-[#1F1F1F] flex items-center justify-center mb-5">
                <span className="font-serif text-[#1F1F1F] text-base">2</span>
              </div>
              <p className="text-[#1F1F1F] text-xs tracking-widest uppercase mb-3">
                Simply reach out
              </p>
              <p className="text-[#1F1F1F] text-sm font-light leading-relaxed">
                A message, a call, a thought. We receive it and act — immediately.
              </p>
            </div>

            <div className="hidden md:flex items-start justify-center shrink-0 px-3 pt-[18px] text-[#1F1F1F]">
              &#8594;
            </div>

            <div
              className="flex-1 fade-up"
              style={{ "--delay": "0.34s" } as React.CSSProperties}
            >
              <div className="w-10 h-10 rounded-full border border-[#1F1F1F] flex items-center justify-center mb-5">
                <span className="font-serif text-[#1F1F1F] text-base">3</span>
              </div>
              <p className="text-[#1F1F1F] text-xs tracking-widest uppercase mb-3">
                Consider it done
              </p>
              <p className="text-[#1F1F1F] text-sm font-light leading-relaxed">
                No follow up required. No chasing. No wondering. Just results.
              </p>
            </div>

          </div>
        </div>

        {/* Mobile-only image — full width below sage content */}
        <div className="relative md:hidden aspect-[3/2] overflow-hidden">
          <Image
            src="/Hero image 1.avif"
            alt="The Life Office"
            fill
            className="object-cover"
          />
        </div>

        {/* Desktop-only image — right half fill */}
        <div className="relative hidden md:block">
          <Image
            src="/Hero image 1.avif"
            alt="The Life Office"
            fill
            className="object-cover"
          />
        </div>

      </section>

      {/* STATEMENT + SUBSCRIBE */}
      <section className="bg-[#1F1F1F] flex flex-col items-center justify-center text-center px-6 py-28 md:py-44">
        <p className="text-[#A8B2A1] text-[10px] tracking-widest uppercase mb-8 fade-up">
          In a world of clutter
        </p>
        <h2
          className="word-reveal font-serif text-[#F7F5F2] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light leading-tight tracking-wide mb-16 md:mb-20"
        >
          the organised person wins.
        </h2>
        <form
          className="flex flex-col sm:flex-row gap-3 w-full max-w-md fade-up"
          style={{ "--delay": "0.2s" } as React.CSSProperties}
        >
          <input
            type="email"
            placeholder="Your email address"
            className="flex-1 bg-transparent border border-[#D8D2C8]/40 text-[#F7F5F2] text-sm font-light px-5 py-4 placeholder:text-[#D8D2C8]/50 outline-none focus:border-[#A8B2A1] transition-colors"
          />
          <button
            type="submit"
            className="bg-[#A8B2A1] text-[#1F1F1F] text-xs tracking-widest uppercase px-8 py-4 hover:bg-[#96a08f] transition-colors whitespace-nowrap"
          >
            Subscribe
          </button>
        </form>
      </section>

    </>
  );
}
