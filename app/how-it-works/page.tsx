'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

const steps = [
  {
    number: '01',
    title: 'The Conversation',
    body: 'We take the time to understand your world completely. Your life, your priorities, your standards. Nothing is assumed.',
  },
  {
    number: '02',
    title: 'The Brief',
    body: 'Every service is defined and agreed. You decide what is handled. We take it from there.',
  },
  {
    number: '03',
    title: 'Your Vault',
    body: 'All information is stored securely on AWS infrastructure with AES-256 encryption — the same standard used by governments and financial institutions. Your privacy is absolute.',
  },
  {
    number: '04',
    title: 'Your Intelligence Layer',
    body: 'Custom AI agents are architected specifically for your household. Built on your chosen platform. Invisible in operation. Exceptional in output.',
  },
  {
    number: '05',
    title: 'Your Point of Contact',
    body: 'One person. One number. Always available. No queues, no systems, no waiting.',
  },
  {
    number: '06',
    title: 'Always Improving',
    body: 'The longer we work together, the better it gets. Your preferences are learned, your standards are maintained, and nothing is ever missed.',
  },
];

export default function HowItWorksPage() {
  const lineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── FADE-UP OBSERVER ──────────────────────────────────── */
    const targets = document.querySelectorAll<HTMLElement>('.fade-up');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px' }
    );
    targets.forEach((el) => observer.observe(el));

    /* ── TIMELINE LINE DRAWING ─────────────────────────────── */
    if (prefersReducedMotion) {
      if (lineRef.current && containerRef.current) {
        lineRef.current.style.height = `${containerRef.current.offsetHeight}px`;
        lineRef.current.style.transition = 'none';
      }
      return () => observer.disconnect();
    }

    const updateLine = () => {
      if (!lineRef.current || !containerRef.current) return;
      const containerTop =
        containerRef.current.getBoundingClientRect().top + window.scrollY;
      const triggerY = window.scrollY + window.innerHeight * 0.72;

      let maxHeight = 0;
      circleRefs.current.forEach((circle) => {
        if (!circle) return;
        const rect = circle.getBoundingClientRect();
        const circleCenter = rect.top + window.scrollY + rect.height / 2;
        if (circleCenter <= triggerY) {
          maxHeight = Math.max(maxHeight, circleCenter - containerTop);
        }
      });

      lineRef.current.style.height = `${maxHeight}px`;
    };

    window.addEventListener('scroll', updateLine, { passive: true });
    updateLine();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateLine);
    };
  }, []);

  return (
    <>
      {/* ── SECTION 1: HERO HEADER ─────────────────────────── */}
      <section className="bg-[#1F1F1F] flex flex-col items-center justify-center text-center px-6 py-40 fade-up">
        <div className="w-12 h-16 border border-[#F7F5F2] rounded-full flex flex-col items-center justify-center mb-10">
          <span className="font-serif text-[#F7F5F2] text-sm leading-none">T</span>
          <span className="font-serif text-[#F7F5F2] text-sm leading-none">L</span>
        </div>
        <h1 className="font-serif text-[#F7F5F2] text-5xl font-light tracking-wide">
          How it works
        </h1>
      </section>

      {/* ── SECTION 2 + 3: INTRO + VERTICAL TIMELINE ──────── */}
      <section className="bg-[#F7F5F2] px-6 py-32">
        <div className="max-w-2xl mx-auto">

          {/* Intro line */}
          <p
            className="font-serif italic text-[#1F1F1F] text-2xl font-light text-center mb-24 fade-up"
          >
            Every detail considered. Every system designed. Everything handled.
          </p>

          {/* Timeline container */}
          <div ref={containerRef} className="relative">

            {/* Vertical line — desktop only */}
            <div
              ref={lineRef}
              className="absolute left-[3px] top-0 w-px bg-[#A8B2A1] hidden md:block overflow-hidden"
              style={{ height: 0, transition: 'height 0.5s ease-out' }}
              aria-hidden="true"
            />

            {steps.map((step, i) => (
              <div
                key={step.number}
                className="relative md:pl-10 mb-16 last:mb-0 fade-up"
                style={{ '--delay': `${i * 0.1}s` } as React.CSSProperties}
              >
                {/* Circle on the line — desktop only */}
                <div
                  ref={(el) => { circleRefs.current[i] = el; }}
                  className="absolute left-0 top-[5px] w-2 h-2 rounded-full bg-[#A8B2A1] hidden md:block"
                  aria-hidden="true"
                />

                <p className="text-[#A8B2A1] text-xs tracking-widest uppercase mb-3">
                  {step.number}
                </p>
                <h2 className="font-serif text-[#1F1F1F] text-xl font-light mb-4">
                  {step.title}
                </h2>
                <p className="text-[#1F1F1F] text-base leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ── SECTION 4: CLOSING CTA STRIP ───────────────────── */}
      <section className="bg-[#1F1F1F] flex flex-col items-center justify-center text-center px-6 py-24 fade-up">
        <h2 className="font-serif text-[#F7F5F2] text-3xl font-light mb-6">
          Ready to begin?
        </h2>
        <p className="text-[#D8D2C8] text-base font-light mb-12">
          A conversation costs nothing. Everything after that is handled.
        </p>
        <Link
          href="/work-with-us"
          className="inline-block bg-[#A8B2A1] text-[#1F1F1F] text-xs tracking-widest uppercase px-8 py-4 hover:bg-[#96a08f] transition-colors rounded-none w-full sm:w-auto text-center"
        >
          Work with us
        </Link>
      </section>
    </>
  );
}
