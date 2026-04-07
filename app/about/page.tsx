'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function AboutPage() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>('.fade-up, .fade-in');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' }
    );

    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* ── SECTION 1: PAGE HEADER ─────────────────────────── */}
      <section className="bg-[#F7F5F2] px-6 md:px-16 pt-40 pb-12 md:pb-16 fade-up">
        <div className="max-w-7xl mx-auto">
          <p className="text-[#A8B2A1] text-[10px] tracking-widest uppercase mb-8">
            About
          </p>
          <h1 className="font-serif text-[#1F1F1F] text-5xl md:text-6xl font-light leading-tight tracking-wide max-w-3xl text-center md:text-left mx-auto md:mx-0">
            Behind every well-run life is someone who made it that way.
          </h1>
        </div>
      </section>

      {/* ── SECTION 2: SPLIT CONTENT ───────────────────────── */}
      <section className="bg-[#F7F5F2] px-6 md:px-16 pb-24 md:pb-32">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-16 md:gap-20 items-start">

          {/* Left column: body copy */}
          <div className="order-1">

            <p
              className="text-[#1F1F1F] text-base leading-loose mb-8 fade-up"
              style={{ '--delay': '0.05s' } as React.CSSProperties}
            >
              Meg created The Life Office because she has lived the alternative.
            </p>

            <p
              className="text-[#1F1F1F] text-base leading-loose mb-8 fade-up"
              style={{ '--delay': '0.12s' } as React.CSSProperties}
            >
              Years of a demanding corporate career, alongside raising a family, made one thing clear: the invisible work is relentless. The admin. The coordination. The mental load of never quite switching off. The accumulation of everything in between.
            </p>

            <p
              className="text-[#1F1F1F] text-base leading-loose mb-8 fade-up"
              style={{ '--delay': '0.19s' } as React.CSSProperties}
            >
              Most people manage it. Few enjoy it. None of them should have to.
            </p>

            <p
              className="text-[#1F1F1F] text-base leading-loose mb-8 fade-up"
              style={{ '--delay': '0.26s' } as React.CSSProperties}
            >
              The Life Office exists for those who have built enough to know their time is worth protecting — and who want their life to reflect that, not just in the moments that matter, but every day.
            </p>

            <p
              className="text-[#1F1F1F] text-base leading-loose mb-8 fade-up"
              style={{ '--delay': '0.33s' } as React.CSSProperties}
            >
              Meg takes complete ownership of the operational layer of your life. Day-to-day administration. Household management. Personal and professional coordination. Events conceived and delivered without a single detail left to chance.
            </p>

            <p
              className="text-[#1F1F1F] text-base leading-loose mb-8 fade-up"
              style={{ '--delay': '0.40s' } as React.CSSProperties}
            >
              This is not delegation. It is a transfer of responsibility — handled with discretion, precision and an exceptionally high standard.
            </p>

            <p
              className="text-[#1F1F1F] text-base leading-loose mb-16 fade-up"
              style={{ '--delay': '0.47s' } as React.CSSProperties}
            >
              Clients come because they value their time. They stay because nothing is ever missed.
            </p>

            {/* Sage divider */}
            <hr
              className="border-none h-px bg-[#A8B2A1] w-[60px] mb-10 fade-up"
              style={{ '--delay': '0.52s' } as React.CSSProperties}
            />

            {/* Closing line */}
            <p
              className="font-serif italic text-[#1F1F1F] text-xl md:text-2xl font-light leading-relaxed mb-12 fade-up"
              style={{ '--delay': '0.58s' } as React.CSSProperties}
            >
              A well-run life is not an accident. It is designed.
            </p>

            {/* CTA button */}
            <div
              className="fade-up"
              style={{ '--delay': '0.64s' } as React.CSSProperties}
            >
              <Link
                href="/work-with-us"
                className="inline-block bg-[#A8B2A1] text-[#1F1F1F] text-xs tracking-widest uppercase px-8 py-4 hover:bg-[#96a08f] transition-colors w-full md:w-auto text-center rounded-none"
              >
                Work with us
              </Link>
            </div>
          </div>

          {/* Right column: photograph */}
          <div className="order-2 md:sticky md:top-24 md:self-start">
            {/* Mobile: full width with aspect ratio */}
            <div className="relative aspect-[3/4] md:hidden fade-in">
              <Image
                src="/meg.jpeg"
                alt="Meg"
                fill
                className="object-cover object-top"
              />
            </div>

            {/* Desktop: tall sticky panel */}
            <div className="hidden md:block relative h-full min-h-[600px] fade-in">
              <Image
                src="/meg.jpeg"
                alt="Meg"
                fill
                className="object-cover object-top"
              />
            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION 3: CLOSING STRIP ───────────────────────── */}
      <section className="bg-[#1F1F1F] flex items-center justify-center text-center px-6 py-24 fade-up">
        <p className="font-serif italic text-[#F7F5F2] text-2xl font-light">
          Quietly accepting a select number of new clients.
        </p>
      </section>
    </>
  );
}
