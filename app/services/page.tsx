'use client';

import { useEffect } from "react";

export default function ServicesPage() {
  useEffect(() => {
    const animatedEls = document.querySelectorAll('.fade-up, .word-reveal')

    // Immediately reveal anything already in view
    animatedEls.forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight) {
        el.classList.add('is-visible')
      }
    })

    // Word reveal: split headline spans
    document.querySelectorAll('.word-reveal').forEach((el) => {
      const text = el.textContent || ''
      el.innerHTML = text
        .split(' ')
        .map((w) => `<span class="word-span">${w}</span>`)
        .join(' ')
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0, rootMargin: '0px 0px -40px 0px' }
    )

    animatedEls.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="bg-[#F7F5F2]">
      {/* HERO */}
      <section className="relative min-h-dvh flex items-center justify-center px-6 md:px-16 bg-[#1F1F1F] overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-[#A8B2A1] text-xs tracking-widest uppercase mb-8 md:mb-12 fade-up">
            Services
          </p>
          <h1 className="word-reveal font-serif text-[#F7F5F2] text-[2rem] sm:text-4xl md:text-5xl lg:text-6xl font-light leading-snug md:leading-tight tracking-wide mb-8 md:mb-10">
            You haven&apos;t switched off in months.
          </h1>
          <p
            className="text-[#D8D2C8] text-base md:text-lg font-light leading-relaxed mb-12 md:mb-16 max-w-xl mx-auto fade-up"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          >
            The Life Office takes the mental load off your plate completely — so your time off actually feels like time off.
          </p>
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-up"
            style={{ "--delay": "0.35s" } as React.CSSProperties}
          >
            <a
              href="#contact"
              className="bg-[#A8B2A1] text-[#1F1F1F] text-xs tracking-widest uppercase px-10 py-4 hover:bg-[#96a08f] transition-colors w-full sm:w-auto text-center"
            >
              Start offloading
            </a>
          </div>
        </div>
      </section>

      {/* THIS IS FOR YOU IF */}
      <section className="bg-[#F7F5F2] px-6 md:px-16 py-32">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-[#1F1F1F] text-4xl md:text-5xl font-light leading-tight tracking-wide text-center mb-20 md:mb-24 fade-up">
            This is for you if&hellip;
          </h2>

          <ul className="flex flex-col">
            {[
              "You fall asleep thinking about everything you forgot to do.",
              "You\u2019re present in the room but somewhere else in your head.",
              "You carry the mental load for home and work simultaneously.",
              "Time off doesn\u2019t feel like time off.",
              "You\u2019re high-functioning and exhausted by it.",
              "You\u2019ve tried systems. You don\u2019t need another system. You need someone to take it from you.",
            ].map((line, i) => (
              <li
                key={i}
                className="fade-up border-b border-[#A8B2A1] last:border-b-0 py-10 md:py-12"
                style={{ "--delay": `${0.1 + i * 0.08}s` } as React.CSSProperties}
              >
                <p className="font-serif italic text-[#1F1F1F] text-xl md:text-2xl font-light leading-relaxed text-center">
                  {line}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#1F1F1F] px-6 md:px-16 py-32">
        <div className="max-w-3xl mx-auto text-center">
          <p
            className="text-[#A8B2A1] text-xs tracking-widest uppercase mb-8 md:mb-12 fade-up"
          >
            How it works
          </p>
          <h2
            className="font-serif text-[#F7F5F2] text-4xl md:text-5xl font-light leading-tight tracking-wide fade-up"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            Here&rsquo;s exactly how it works.
          </h2>
          <p
            className="text-[#F7F5F2] text-base font-light leading-relaxed mt-8 fade-up"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          >
            You send it over. We handle it. It gets done.
          </p>
          <p
            className="text-[#D8D2C8] text-base font-light leading-relaxed mt-6 fade-up"
            style={{ "--delay": "0.3s" } as React.CSSProperties}
          >
            Life admin, bookings, travel, events, correspondence, household management, diary, research, purchases, renewals. Whatever it is — send it.
          </p>
          <p
            className="text-[#D8D2C8] text-base font-light leading-relaxed mt-6 fade-up"
            style={{ "--delay": "0.4s" } as React.CSSProperties}
          >
            No briefing documents. No task management software. No following up.
          </p>
        </div>
      </section>

      {/* THE OUTCOME */}
      <section className="bg-[#F7F5F2] px-6 md:px-16 py-32">
        <div className="max-w-3xl mx-auto">
          <p className="text-[#A8B2A1] text-xs tracking-widest uppercase text-center fade-up">
            The Outcome
          </p>
          <h2
            className="font-serif text-[#1F1F1F] text-4xl md:text-5xl font-light leading-tight tracking-wide text-center mt-8 mb-20 md:mb-24 fade-up"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            This is what changes.
          </h2>

          <ul className="flex flex-col">
            {[
              "A clearer mind.",
              "More presence with the people who matter.",
              "Time off that actually feels like time off.",
              "A home life that runs without your involvement.",
              "The quiet confidence that everything is in hand.",
            ].map((line, i) => (
              <li
                key={i}
                className="fade-up border-b border-[#A8B2A1] last:border-b-0 py-10 md:py-12"
                style={{ "--delay": `${0.2 + i * 0.08}s` } as React.CSSProperties}
              >
                <p className="font-serif italic text-[#1F1F1F] text-xl md:text-2xl font-light leading-relaxed text-center">
                  {line}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* THE DIFFERENCE */}
      <section className="bg-[#1F1F1F] px-6 md:px-16 py-32">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#A8B2A1] text-xs tracking-widest uppercase fade-up">
            The Difference
          </p>
          <h2
            className="font-serif italic text-[#F7F5F2] text-4xl md:text-5xl font-light leading-tight tracking-wide mt-8 fade-up"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            This is not a virtual assistant.
          </h2>
          <p
            className="text-[#F7F5F2] text-base font-light leading-relaxed mt-10 fade-up"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          >
            A VA waits to be told what to do.
          </p>
          <p
            className="text-[#D8D2C8] text-base font-light leading-relaxed mt-6 fade-up"
            style={{ "--delay": "0.3s" } as React.CSSProperties}
          >
            The Life Office is proactive, structured and high-touch. We don&rsquo;t execute tasks. We take ownership. We learn your world, anticipate what it needs, and handle it — with complete discretion and without being asked twice.
          </p>
        </div>
      </section>

      {/* GET YOUR TIME BACK */}
      <section className="bg-[#A8B2A1] px-6 md:px-16 py-32">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-[#1F1F1F] text-4xl md:text-5xl font-light leading-tight tracking-wide fade-up">
            Get your time back.
          </h2>
          <p
            className="text-[#1F1F1F] text-base font-light leading-relaxed mt-6 opacity-80 fade-up"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            A conversation costs nothing. Start there.
          </p>
          <div
            className="mt-10 fade-up"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          >
            <a
              href="#contact"
              className="inline-block bg-[#1F1F1F] text-[#F7F5F2] text-xs tracking-widest uppercase px-10 py-4 hover:opacity-80 transition-opacity"
            >
              Start offloading
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
