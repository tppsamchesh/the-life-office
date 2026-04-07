'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function HowItWorksPage() {
  useEffect(() => {
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

    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      number: '01',
      title: 'The Conversation',
      body: 'We take the time to understand your world completely. Your life, your priorities, your standards. Nothing is assumed.',
      dark: true,
    },
    {
      number: '02',
      title: 'The Brief',
      body: 'Every service is defined and agreed. You decide what is handled. We take it from there.',
      dark: false,
    },
    {
      number: '03',
      title: 'Your Vault',
      body: 'All information is stored securely on AWS infrastructure with AES-256 encryption — the same standard used by governments and financial institutions. Your privacy is absolute.',
      dark: true,
    },
    {
      number: '04',
      title: 'Your Intelligence Layer',
      body: 'Custom AI agents are architected specifically for your household. Built on your chosen platform. Invisible in operation. Exceptional in output.',
      dark: false,
    },
    {
      number: '05',
      title: 'Your Point of Contact',
      body: 'One person. One number. Always available. No queues, no systems, no waiting.',
      dark: true,
    },
    {
      number: '06',
      title: 'Always Improving',
      body: 'The longer we work together, the better it gets. Your preferences are learned, your standards are maintained, and nothing is ever missed.',
      dark: false,
    },
  ];

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

      {/* ── SECTION 2: INTRO LINE ──────────────────────────── */}
      <section className="bg-[#F7F5F2] flex items-center justify-center text-center px-6 py-24 fade-up">
        <p className="font-serif italic text-[#1F1F1F] text-xl md:text-2xl lg:text-3xl font-light">
          Every detail considered. Every system designed. Everything handled.
        </p>
      </section>

      {/* ── SECTION 3: THE STEPS ───────────────────────────── */}
      {steps.map((step, i) => (
        <section
          key={step.number}
          className={`w-full px-6 md:px-16 lg:px-24 py-24 fade-up ${
            step.dark ? 'bg-[#1F1F1F]' : 'bg-[#F7F5F2]'
          }`}
          style={{ '--delay': `${i * 0.05}s` } as React.CSSProperties}
        >
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-20 items-start">

            {/* Step number */}
            <div
              className="fade-up"
              style={{ '--delay': `${i * 0.05}s` } as React.CSSProperties}
            >
              <span className="font-serif text-[#A8B2A1] text-5xl md:text-7xl lg:text-8xl font-light leading-none">
                {step.number}
              </span>
            </div>

            {/* Title + body */}
            <div
              className="fade-up"
              style={{ '--delay': `${i * 0.05 + 0.1}s` } as React.CSSProperties}
            >
              <h2
                className={`font-serif text-2xl font-light mb-6 ${
                  step.dark ? 'text-[#F7F5F2]' : 'text-[#1F1F1F]'
                }`}
              >
                {step.title}
              </h2>
              <p
                className={`text-base leading-relaxed ${
                  step.dark ? 'text-[#D8D2C8]' : 'text-[#1F1F1F]'
                }`}
              >
                {step.body}
              </p>
            </div>

          </div>
        </section>
      ))}

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
