import Image from "next/image";

import { getLandingData } from "@/sanity/queries";

import { ScrollAnimations } from "./ScrollAnimations";

/* ── Sage uppercase section label ──────────────────────────── */
function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[#A8B2A1] text-[10px] tracking-[0.2em] uppercase ${className}`}>
      {children}
    </p>
  );
}

/* ── Editorial list — thin sage hairline markers, never dots ─ */
function EditorialList({
  items,
  tone = "dark",
}: {
  items: string[];
  tone?: "dark" | "light";
}) {
  const text = tone === "dark" ? "text-[#D8D2C8]" : "text-[#1F1F1F]";
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-4">
          <span className="mt-[0.7em] h-px w-5 bg-[#A8B2A1] shrink-0" aria-hidden="true" />
          <span className={`${text} text-base font-light leading-relaxed`}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function Home() {
  const { content, heroImageUrl } = await getLandingData();
  const { hero, load, offer, how, changes, who, delivery, pricing, closing } = content;

  return (
    <>
      {/* ───────────────────────── 1 · HERO ───────────────────────── */}
      <section className="relative min-h-dvh flex items-center justify-center px-6 md:px-16 overflow-hidden">
        <Image
          src={heroImageUrl}
          alt="The Life Office"
          fill
          className="object-cover hero-image"
          priority
        />
        <div className="absolute inset-0 bg-[#1F1F1F]/60" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="word-reveal font-serif text-[#F7F5F2] text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light leading-none tracking-[0.06em] uppercase mb-10 md:mb-14">
            {hero.headline}
          </h1>
          <p
            className="text-[#F7F5F2] text-lg md:text-2xl font-light leading-relaxed max-w-2xl mx-auto fade-up"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          >
            {hero.line1}
          </p>
          <p
            className="text-[#D8D2C8] text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto mt-4 mb-12 md:mb-16 fade-up"
            style={{ "--delay": "0.32s" } as React.CSSProperties}
          >
            {hero.line2}
          </p>
          <div className="fade-up" style={{ "--delay": "0.46s" } as React.CSSProperties}>
            <a
              href="#contact"
              className="inline-block bg-[#A8B2A1] text-[#1F1F1F] text-xs tracking-widest uppercase px-10 py-4 hover:bg-[#96a08f] transition-colors"
            >
              Book a Discovery Call
            </a>
          </div>
        </div>
      </section>

      {/* ───────────────────────── 2 · THE LOAD ───────────────────── */}
      <section className="bg-[#F7F5F2] border-t border-[#A8B2A1]/30 px-6 md:px-16 py-28 md:py-44">
        <div className="max-w-3xl mx-auto">
          <h2 className="fade-up font-serif text-[#1F1F1F] text-3xl md:text-5xl font-light leading-tight tracking-wide mb-12 md:mb-16">
            {load.headline}
          </h2>
          <p
            className="fade-up text-[#1F1F1F] text-lg md:text-xl font-light leading-relaxed"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            {load.body}
          </p>
          <p
            className="fade-up text-[#1F1F1F] text-xl md:text-2xl font-light leading-relaxed mt-16 md:mt-20"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          >
            {load.line1}
          </p>
          <p
            className="fade-up text-[#1F1F1F] text-lg md:text-xl font-light leading-relaxed mt-8"
            style={{ "--delay": "0.28s" } as React.CSSProperties}
          >
            {load.line2}
          </p>
        </div>
      </section>

      {/* ──────────────────── 3 · THE SIGNATURE OFFER ──────────────── */}
      <section
        id="the-offer"
        className="scroll-mt-24 bg-[#1F1F1F] border-t border-[#A8B2A1]/30 px-6 md:px-16 py-28 md:py-44"
      >
        <div className="max-w-6xl mx-auto">
          <Label className="fade-up mb-8">{offer.label}</Label>
          <h2 className="fade-up font-serif text-[#F7F5F2] text-3xl md:text-5xl font-light leading-tight tracking-wide mb-10">
            {offer.title}
          </h2>
          <div className="fade-up mb-16 md:mb-20" style={{ "--delay": "0.1s" } as React.CSSProperties}>
            <p className="font-serif italic text-[#A8B2A1] text-xl md:text-2xl font-light leading-relaxed">
              {offer.italic1}
            </p>
            <p className="font-serif italic text-[#A8B2A1] text-xl md:text-2xl font-light leading-relaxed mt-2">
              {offer.italic2}
            </p>
          </div>

          <p
            className="fade-up text-[#D8D2C8] text-base font-light tracking-wide mb-12 md:mb-16"
            style={{ "--delay": "0.15s" } as React.CSSProperties}
          >
            {offer.intro}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-14 md:gap-12">
            {offer.columns.map((col, i) => (
              <div
                key={col.heading}
                className="fade-up"
                style={{ "--delay": `${i * 0.12}s` } as React.CSSProperties}
              >
                <h3 className="font-serif text-[#F7F5F2] text-2xl font-light mb-8">
                  {col.heading}
                  {col.note && (
                    <span className="block font-serif italic text-[#D8D2C8] text-base mt-1">
                      {col.note}
                    </span>
                  )}
                </h3>
                <EditorialList items={col.items} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── 4 · HOW IT WORKS ────────────────────── */}
      <section
        id="how-it-works"
        className="scroll-mt-24 bg-[#F7F5F2] border-t border-[#A8B2A1]/30 px-6 md:px-16 py-28 md:py-44"
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="fade-up font-serif text-[#1F1F1F] text-3xl md:text-5xl font-light leading-tight tracking-wide mb-16 md:mb-24">
            {how.headline}
          </h2>

          <div className="flex flex-col gap-14 md:gap-20">
            {how.steps.map((step, i) => (
              <div
                key={step.title}
                className="fade-up flex flex-col sm:flex-row gap-6 sm:gap-10"
                style={{ "--delay": `${i * 0.12}s` } as React.CSSProperties}
              >
                <div className="w-12 h-12 rounded-full border border-[#A8B2A1] flex items-center justify-center shrink-0">
                  <span className="font-serif text-[#A8B2A1] text-lg leading-none">{i + 1}</span>
                </div>
                <div className="sm:pt-2">
                  <h3 className="font-serif text-[#1F1F1F] text-2xl md:text-3xl font-light mb-4">
                    Step {i + 1}: {step.title}
                  </h3>
                  <p className="text-[#1F1F1F] text-lg font-light leading-relaxed max-w-xl">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── 5 · WHAT CHANGES ────────────────────── */}
      <section className="bg-[#1F1F1F] border-t border-[#A8B2A1]/30 px-6 md:px-16 py-28 md:py-44">
        <div className="max-w-2xl mx-auto">
          <h2 className="fade-up font-serif text-[#F7F5F2] text-3xl md:text-5xl font-light leading-tight tracking-wide mb-10">
            {changes.headline}
          </h2>
          <p
            className="fade-up text-[#D8D2C8] text-lg font-light leading-relaxed mb-12 md:mb-16"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            {changes.intro}
          </p>
          <div className="fade-up" style={{ "--delay": "0.18s" } as React.CSSProperties}>
            <EditorialList items={changes.items} />
          </div>
        </div>
      </section>

      {/* ──────────────────── 6 · WHO THIS IS FOR ──────────────────── */}
      <section className="bg-[#F7F5F2] border-t border-[#A8B2A1]/30 px-6 md:px-16 py-28 md:py-44">
        <div className="max-w-2xl mx-auto">
          <h2 className="fade-up font-serif text-[#1F1F1F] text-3xl md:text-5xl font-light leading-tight tracking-wide mb-10">
            {who.headline}
          </h2>
          <p
            className="fade-up text-[#1F1F1F] text-lg font-light leading-relaxed mb-12 md:mb-16"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            {who.intro}
          </p>
          <div className="fade-up" style={{ "--delay": "0.18s" } as React.CSSProperties}>
            <EditorialList tone="light" items={who.items} />
          </div>
          <p
            className="fade-up text-[#1F1F1F] text-lg font-light leading-relaxed mt-16 md:mt-20"
            style={{ "--delay": "0.26s" } as React.CSSProperties}
          >
            {who.closing}
          </p>
          <p
            className="fade-up font-serif italic text-[#1F1F1F] text-2xl md:text-3xl font-light leading-snug mt-6"
            style={{ "--delay": "0.32s" } as React.CSSProperties}
          >
            {who.closingItalic}
          </p>
        </div>
      </section>

      {/* ───────────────────── 7 · DELIVERY MODEL ──────────────────── */}
      <section className="bg-[#1F1F1F] border-t border-[#A8B2A1]/30 px-6 md:px-16 py-28 md:py-44">
        <div className="max-w-4xl mx-auto">
          <h2 className="fade-up font-serif text-[#F7F5F2] text-3xl md:text-5xl font-light leading-tight tracking-wide mb-10">
            {delivery.headline}
          </h2>
          <p
            className="fade-up text-[#D8D2C8] text-lg font-light leading-relaxed mb-16 md:mb-20"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            {delivery.intro}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-16">
            {delivery.columns.map((col, i) => (
              <div
                key={col.heading}
                className="fade-up"
                style={{ "--delay": `${i * 0.12}s` } as React.CSSProperties}
              >
                <h3 className="font-serif text-[#F7F5F2] text-xl font-light mb-8">{col.heading}</h3>
                <EditorialList items={col.items} />
              </div>
            ))}
          </div>

          <p
            className="fade-up font-serif text-[#F7F5F2] text-3xl md:text-4xl font-light leading-snug tracking-wide mt-20 md:mt-28 max-w-3xl"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          >
            {delivery.backbone}
          </p>
        </div>
      </section>

      {/* ───────────────────────── 8 · PRICING ─────────────────────── */}
      <section
        id="pricing"
        className="scroll-mt-24 bg-[#F7F5F2] border-t border-[#A8B2A1]/30 px-6 md:px-16 py-28 md:py-44"
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="fade-up font-serif text-[#1F1F1F] text-3xl md:text-5xl font-light leading-tight tracking-wide mb-10">
            {pricing.headline}
          </h2>
          <p
            className="fade-up text-[#1F1F1F] text-lg font-light leading-relaxed mb-12 md:mb-16"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            {pricing.intro}
          </p>
          <p
            className="fade-up font-serif text-[#1F1F1F] text-3xl md:text-5xl font-light leading-tight tracking-wide mb-12 md:mb-16"
            style={{ "--delay": "0.18s" } as React.CSSProperties}
          >
            {pricing.figure}
          </p>
          <p
            className="fade-up text-[#1F1F1F] text-lg font-light leading-relaxed"
            style={{ "--delay": "0.24s" } as React.CSSProperties}
          >
            {pricing.closing}
          </p>
        </div>
      </section>

      {/* ─────────────────────── 9 · CLOSING CTA ───────────────────── */}
      <section
        id="contact"
        className="scroll-mt-24 bg-[#1F1F1F] border-t border-[#A8B2A1]/30 px-6 md:px-16 py-32 md:py-48"
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="word-reveal font-serif text-[#F7F5F2] text-4xl md:text-6xl font-light leading-tight tracking-wide mb-10">
            {closing.headline}
          </h2>
          <p
            className="fade-up text-[#D8D2C8] text-lg font-light leading-relaxed mb-12 md:mb-16 max-w-xl mx-auto"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          >
            {closing.body}
          </p>
          <div className="fade-up" style={{ "--delay": "0.32s" } as React.CSSProperties}>
            <a
              href="#contact"
              className="inline-block bg-[#A8B2A1] text-[#1F1F1F] text-xs tracking-widest uppercase px-10 py-4 hover:bg-[#96a08f] transition-colors"
            >
              Book a Discovery Call
            </a>
          </div>
        </div>
      </section>

      <ScrollAnimations />
    </>
  );
}
