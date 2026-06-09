'use client';

import { useEffect } from "react";
import Image from "next/image";

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

export default function Home() {
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

  return (
    <>
      {/* ───────────────────────── 1 · HERO ───────────────────────── */}
      <section className="relative min-h-dvh flex items-center justify-center px-6 md:px-16 overflow-hidden">
        <Image
          src="/Hero image 1.avif"
          alt="The Life Office"
          fill
          className="object-cover hero-image"
          priority
        />
        <div className="absolute inset-0 bg-[#1F1F1F]/60" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="word-reveal font-serif text-[#F7F5F2] text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light leading-none tracking-[0.06em] uppercase mb-10 md:mb-14">
            The Life Office
          </h1>
          <p
            className="text-[#F7F5F2] text-lg md:text-2xl font-light leading-relaxed max-w-2xl mx-auto fade-up"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          >
            We run the operations behind your life and business.
          </p>
          <p
            className="text-[#D8D2C8] text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto mt-4 mb-12 md:mb-16 fade-up"
            style={{ "--delay": "0.32s" } as React.CSSProperties}
          >
            So nothing important gets missed, delayed, or left on you to figure out.
          </p>
          <div
            className="fade-up"
            style={{ "--delay": "0.46s" } as React.CSSProperties}
          >
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
            Life is complicated. Running it shouldn&rsquo;t be.
          </h2>
          <p
            className="fade-up text-[#1F1F1F] text-lg md:text-xl font-light leading-relaxed"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            You&rsquo;re managing more than most people can see. Work is demanding. Life admin never stops. Family logistics pile up. Your calendar runs you instead of the other way around. And everything relies on you remembering it.
          </p>
          <p
            className="fade-up text-[#1F1F1F] text-xl md:text-2xl font-light leading-relaxed mt-16 md:mt-20"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          >
            The Life Office removes that load.
          </p>
          <p
            className="fade-up text-[#1F1F1F] text-lg md:text-xl font-light leading-relaxed mt-8"
            style={{ "--delay": "0.28s" } as React.CSSProperties}
          >
            We become your personal operations partner, handling the moving parts of your life and business so you can focus on what actually matters.
          </p>
        </div>
      </section>

      {/* ──────────────────── 3 · THE SIGNATURE OFFER ──────────────── */}
      <section
        id="the-offer"
        className="scroll-mt-24 bg-[#1F1F1F] border-t border-[#A8B2A1]/30 px-6 md:px-16 py-28 md:py-44"
      >
        <div className="max-w-6xl mx-auto">
          <Label className="fade-up mb-8">The Signature Offer</Label>
          <h2 className="fade-up font-serif text-[#F7F5F2] text-3xl md:text-5xl font-light leading-tight tracking-wide mb-10">
            The Life Office Partner
          </h2>
          <div
            className="fade-up mb-16 md:mb-20"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            <p className="font-serif italic text-[#A8B2A1] text-xl md:text-2xl font-light leading-relaxed">
              Your dedicated operations system for life and business.
            </p>
            <p className="font-serif italic text-[#A8B2A1] text-xl md:text-2xl font-light leading-relaxed mt-2">
              We don&rsquo;t sell tasks. We run your backend.
            </p>
          </div>

          <p
            className="fade-up text-[#D8D2C8] text-base font-light tracking-wide mb-12 md:mb-16"
            style={{ "--delay": "0.15s" } as React.CSSProperties}
          >
            We typically handle:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-14 md:gap-12">
            <div className="fade-up">
              <h3 className="font-serif text-[#F7F5F2] text-2xl font-light mb-8">Personal Operations</h3>
              <EditorialList
                items={[
                  "Calendar and scheduling management",
                  "Family logistics and coordination",
                  "School, childcare, and household admin",
                  "Travel planning and bookings",
                  "Reminders, renewals, and life admin",
                ]}
              />
            </div>

            <div
              className="fade-up"
              style={{ "--delay": "0.12s" } as React.CSSProperties}
            >
              <h3 className="font-serif text-[#F7F5F2] text-2xl font-light mb-8">
                Business Operations{" "}
                <span className="block font-serif italic text-[#D8D2C8] text-base mt-1">
                  (for founders and executives)
                </span>
              </h3>
              <EditorialList
                items={[
                  "Inbox and task triage",
                  "Meeting scheduling and follow-ups",
                  "CRM and pipeline organisation",
                  "Light sales and revenue operations support",
                  "Coordination between teams, suppliers, and stakeholders",
                ]}
              />
            </div>

            <div
              className="fade-up"
              style={{ "--delay": "0.24s" } as React.CSSProperties}
            >
              <h3 className="font-serif text-[#F7F5F2] text-2xl font-light mb-8">System Ownership</h3>
              <EditorialList
                items={[
                  "Building structure around your week",
                  "Ensuring nothing is missed or dropped",
                  "Creating clarity across work and life",
                  "Proactive identification of bottlenecks",
                ]}
              />
            </div>
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
            How It Works
          </h2>

          <div className="flex flex-col gap-14 md:gap-20">
            {[
              {
                n: "1",
                title: "Life and Work Audit",
                body: "We map everything currently on your plate, personal and professional.",
              },
              {
                n: "2",
                title: "Setup (Week 1 to 2)",
                body: "We install your Life Office system: priorities, calendar structure, task flows, communication channels.",
              },
              {
                n: "3",
                title: "Ongoing Operations Support",
                body: "We run the system day-to-day so you don’t have to. You send requests. We handle execution, coordination, and follow-through.",
              },
            ].map((step, i) => (
              <div
                key={step.n}
                className="fade-up flex flex-col sm:flex-row gap-6 sm:gap-10"
                style={{ "--delay": `${i * 0.12}s` } as React.CSSProperties}
              >
                <div className="w-12 h-12 rounded-full border border-[#A8B2A1] flex items-center justify-center shrink-0">
                  <span className="font-serif text-[#A8B2A1] text-lg leading-none">{step.n}</span>
                </div>
                <div className="sm:pt-2">
                  <h3 className="font-serif text-[#1F1F1F] text-2xl md:text-3xl font-light mb-4">
                    Step {step.n}: {step.title}
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
            What Changes for Clients
          </h2>
          <p
            className="fade-up text-[#D8D2C8] text-lg font-light leading-relaxed mb-12 md:mb-16"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            Within weeks, clients typically experience:
          </p>
          <div
            className="fade-up"
            style={{ "--delay": "0.18s" } as React.CSSProperties}
          >
            <EditorialList
              items={[
                "Less mental clutter",
                "Fewer dropped tasks",
                "A calmer calendar",
                "Faster decision-making",
                "More time for deep work or family",
                "Reduced stress from everything relying on you",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ──────────────────── 6 · WHO THIS IS FOR ──────────────────── */}
      <section className="bg-[#F7F5F2] border-t border-[#A8B2A1]/30 px-6 md:px-16 py-28 md:py-44">
        <div className="max-w-2xl mx-auto">
          <h2 className="fade-up font-serif text-[#1F1F1F] text-3xl md:text-5xl font-light leading-tight tracking-wide mb-10">
            Who This Is For
          </h2>
          <p
            className="fade-up text-[#1F1F1F] text-lg font-light leading-relaxed mb-12 md:mb-16"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            The Life Office is for people who are:
          </p>
          <div
            className="fade-up"
            style={{ "--delay": "0.18s" } as React.CSSProperties}
          >
            <EditorialList
              tone="light"
              items={[
                "Running companies or senior teams",
                "Balancing high-pressure work and family life",
                "Earning well but short on time",
                "Tired of being the default operator for everything",
              ]}
            />
          </div>
          <p
            className="fade-up text-[#1F1F1F] text-lg font-light leading-relaxed mt-16 md:mt-20"
            style={{ "--delay": "0.26s" } as React.CSSProperties}
          >
            This is not for people looking for basic admin support.
          </p>
          <p
            className="fade-up font-serif italic text-[#1F1F1F] text-2xl md:text-3xl font-light leading-snug mt-6"
            style={{ "--delay": "0.32s" } as React.CSSProperties}
          >
            This is for people who need their life run properly.
          </p>
        </div>
      </section>

      {/* ───────────────────── 7 · DELIVERY MODEL ──────────────────── */}
      <section className="bg-[#1F1F1F] border-t border-[#A8B2A1]/30 px-6 md:px-16 py-28 md:py-44">
        <div className="max-w-4xl mx-auto">
          <h2 className="fade-up font-serif text-[#F7F5F2] text-3xl md:text-5xl font-light leading-tight tracking-wide mb-10">
            Delivery Model
          </h2>
          <p
            className="fade-up text-[#D8D2C8] text-lg font-light leading-relaxed mb-16 md:mb-20"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            We keep this deliberately high-touch and focused.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-16">
            <div className="fade-up">
              <h3 className="font-serif text-[#F7F5F2] text-xl font-light mb-8">Each client gets:</h3>
              <EditorialList
                items={[
                  "One dedicated Operations Partner",
                  "Shared secure communication channel",
                  "Weekly priority review",
                  "Daily request handling (within agreed boundaries)",
                ]}
              />
            </div>
            <div
              className="fade-up"
              style={{ "--delay": "0.12s" } as React.CSSProperties}
            >
              <h3 className="font-serif text-[#F7F5F2] text-xl font-light mb-8">Operating rhythm:</h3>
              <EditorialList
                items={[
                  "Requests come in throughout the day",
                  "We triage, organise, and execute",
                  "Weekly review ensures priorities stay aligned",
                  "Proactive flagging of issues before they become problems",
                ]}
              />
            </div>
          </div>

          <p
            className="fade-up font-serif text-[#F7F5F2] text-3xl md:text-4xl font-light leading-snug tracking-wide mt-20 md:mt-28 max-w-3xl"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          >
            We are not reactive support. We are your operational backbone.
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
            Pricing
          </h2>
          <p
            className="fade-up text-[#1F1F1F] text-lg font-light leading-relaxed mb-12 md:mb-16"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            Engagements are tailored based on complexity and scope.
          </p>
          <p
            className="fade-up font-serif text-[#1F1F1F] text-3xl md:text-5xl font-light leading-tight tracking-wide mb-12 md:mb-16"
            style={{ "--delay": "0.18s" } as React.CSSProperties}
          >
            Typical investment: &pound;1,500 to &pound;5,000 per month
          </p>
          <p
            className="fade-up text-[#1F1F1F] text-lg font-light leading-relaxed"
            style={{ "--delay": "0.24s" } as React.CSSProperties}
          >
            Most clients sit in the mid-tier depending on how much of their life and business we support.
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
            Ready to Hand Over the Chaos?
          </h2>
          <p
            className="fade-up text-[#D8D2C8] text-lg font-light leading-relaxed mb-12 md:mb-16 max-w-xl mx-auto"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          >
            If you want more clarity, more time, and less mental load, book a short discovery call. We&rsquo;ll review your current setup and see if The Life Office is the right fit.
          </p>
          <div
            className="fade-up"
            style={{ "--delay": "0.32s" } as React.CSSProperties}
          >
            <a
              href="#contact"
              className="inline-block bg-[#A8B2A1] text-[#1F1F1F] text-xs tracking-widest uppercase px-10 py-4 hover:bg-[#96a08f] transition-colors"
            >
              Book a Discovery Call
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
