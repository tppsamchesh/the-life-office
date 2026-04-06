export default function Home() {
  return (
    <div className="flex flex-col flex-1 font-sans">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-[#1F1F1F] border-b border-[#D8D2C8]/20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 py-5 md:py-6 flex items-center justify-between gap-4">
          <span className="text-[#F7F5F2] text-[10px] sm:text-xs tracking-widest uppercase shrink-0">
            The Life Office
          </span>
          <a
            href="#packages"
            className="text-[#A8B2A1] text-[10px] sm:text-xs tracking-widest uppercase border border-[#A8B2A1] px-4 py-2.5 md:px-6 md:py-3 hover:bg-[#A8B2A1] hover:text-[#1F1F1F] transition-colors whitespace-nowrap"
          >
            Work with us
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="flex-1 bg-[#1F1F1F] flex items-center justify-center px-6 md:px-16 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#D8D2C8] text-xs tracking-widest uppercase mb-5 md:mb-10">
            The Life Office
          </p>
          <h1 className="text-[#F7F5F2] text-[1.75rem] sm:text-4xl md:text-5xl lg:text-6xl font-light leading-snug md:leading-tight tracking-wide mb-6 md:mb-10">
            We handle the life admin<br className="hidden sm:block" /> you don&apos;t have time for.
          </h1>
          <p className="text-[#D8D2C8] text-base md:text-xl font-light leading-relaxed mb-10 md:mb-16 max-w-xl mx-auto">
            For busy professionals who need things done—properly.
          </p>
          <a
            href="#packages"
            className="inline-block text-[#A8B2A1] text-xs tracking-widest uppercase border border-[#A8B2A1] px-8 py-4 hover:bg-[#A8B2A1] hover:text-[#1F1F1F] transition-colors"
          >
            Work with us
          </a>
        </div>
      </section>

      {/* SERVICES */}
      <section className="bg-[#F7F5F2] px-6 md:px-16 py-20 md:py-32">
        <div className="max-w-7xl mx-auto">
          <p className="text-[#D8D2C8] text-xs tracking-widest uppercase mb-14 md:mb-20">
            What we do
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#D8D2C8]">
            <div className="pb-10 pt-0 md:py-0 md:pr-10 lg:pr-16">
              <h3 className="text-[#1F1F1F] text-sm tracking-widest uppercase font-light mb-5">
                Life Admin
              </h3>
              <p className="text-[#1F1F1F] font-light leading-relaxed">
                Appointments, travel, errands, research — handled.
              </p>
            </div>
            <div className="py-10 md:py-0 md:px-10 lg:px-16">
              <h3 className="text-[#1F1F1F] text-sm tracking-widest uppercase font-light mb-5">
                Business Support
              </h3>
              <p className="text-[#1F1F1F] font-light leading-relaxed">
                Inbox management, scheduling, documents, correspondence.
              </p>
            </div>
            <div className="py-10 md:py-0 md:px-10 lg:px-16">
              <h3 className="text-[#1F1F1F] text-sm tracking-widest uppercase font-light mb-5">
                Events
              </h3>
              <p className="text-[#1F1F1F] font-light leading-relaxed">
                Planning and coordination for personal and professional events.
              </p>
            </div>
            <div className="pt-10 pb-0 md:py-0 md:pl-10 lg:pl-16">
              <h3 className="text-[#1F1F1F] text-sm tracking-widest uppercase font-light mb-5">
                Life OS
              </h3>
              <p className="text-[#1F1F1F] font-light leading-relaxed">
                Systems and structure so everything runs without you chasing it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#1F1F1F] px-6 md:px-16 py-20 md:py-32">
        <div className="max-w-7xl mx-auto">
          <p className="text-[#D8D2C8] text-xs tracking-widest uppercase mb-14 md:mb-20">
            How it works
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 lg:gap-16">
            <div>
              <p className="text-[#A8B2A1] text-xs tracking-widest uppercase mb-5">
                01
              </p>
              <h3 className="text-[#F7F5F2] text-lg font-light tracking-wide mb-3">
                Join
              </h3>
              <p className="text-[#D8D2C8] font-light leading-relaxed">
                Tell us what you need. We&apos;ll take it from there.
              </p>
            </div>
            <div>
              <p className="text-[#A8B2A1] text-xs tracking-widest uppercase mb-5">
                02
              </p>
              <h3 className="text-[#F7F5F2] text-lg font-light tracking-wide mb-3">
                Send requests
              </h3>
              <p className="text-[#D8D2C8] font-light leading-relaxed">
                Drop us a message, email, or voice note. Any time.
              </p>
            </div>
            <div>
              <p className="text-[#A8B2A1] text-xs tracking-widest uppercase mb-5">
                03
              </p>
              <h3 className="text-[#F7F5F2] text-lg font-light tracking-wide mb-3">
                We handle it
              </h3>
              <p className="text-[#D8D2C8] font-light leading-relaxed">
                Consider it done.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section id="packages" className="bg-[#F7F5F2] px-6 md:px-16 py-20 md:py-32">
        <div className="max-w-7xl mx-auto">
          <p className="text-[#D8D2C8] text-xs tracking-widest uppercase mb-14 md:mb-20">
            Packages
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#D8D2C8]">

            {/* Essential */}
            <div className="pb-12 pt-0 md:py-0 md:pr-10 lg:pr-16 flex flex-col">
              <p className="text-[#D8D2C8] text-xs tracking-widest uppercase mb-4">
                Essential
              </p>
              <p className="text-[#1F1F1F] font-light leading-relaxed mb-8">
                Ideal for occasional support.
              </p>
              <ul className="space-y-4 mb-12 flex-1">
                {[
                  "Up to 5 requests per month",
                  "Life admin tasks",
                  "Email support",
                ].map((item) => (
                  <li key={item} className="text-[#1F1F1F] font-light text-sm leading-relaxed flex items-start gap-3">
                    <span className="text-[#D8D2C8] mt-0.5">—</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className="block text-center text-[#1F1F1F] text-xs tracking-widest uppercase border border-[#1F1F1F] px-8 py-4 hover:bg-[#1F1F1F] hover:text-[#F7F5F2] transition-colors"
              >
                Get started
              </a>
            </div>

            {/* Core */}
            <div className="py-12 md:py-0 md:px-10 lg:px-16 flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <p className="text-[#D8D2C8] text-xs tracking-widest uppercase">
                  Core
                </p>
                <span className="text-[#A8B2A1] text-xs tracking-widest uppercase">
                  Recommended
                </span>
              </div>
              <p className="text-[#1F1F1F] font-light leading-relaxed mb-8">
                For busy professionals who need consistent support.
              </p>
              <ul className="space-y-4 mb-12 flex-1">
                {[
                  "Up to 15 requests per month",
                  "Life and business admin",
                  "Priority response",
                  "Monthly check-in call",
                ].map((item) => (
                  <li key={item} className="text-[#1F1F1F] font-light text-sm leading-relaxed flex items-start gap-3">
                    <span className="text-[#A8B2A1] mt-0.5">—</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className="block text-center text-[#A8B2A1] text-xs tracking-widest uppercase border border-[#A8B2A1] px-8 py-4 hover:bg-[#A8B2A1] hover:text-[#1F1F1F] transition-colors"
              >
                Get started
              </a>
            </div>

            {/* Premium */}
            <div className="pt-12 pb-0 md:py-0 md:pl-10 lg:pl-16 flex flex-col">
              <p className="text-[#D8D2C8] text-xs tracking-widest uppercase mb-4">
                Premium
              </p>
              <p className="text-[#1F1F1F] font-light leading-relaxed mb-8">
                For founders and executives who need full coverage.
              </p>
              <ul className="space-y-4 mb-12 flex-1">
                {[
                  "Unlimited requests",
                  "Full life and business support",
                  "Events and travel",
                  "Dedicated support",
                  "Weekly call",
                ].map((item) => (
                  <li key={item} className="text-[#1F1F1F] font-light text-sm leading-relaxed flex items-start gap-3">
                    <span className="text-[#D8D2C8] mt-0.5">—</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className="block text-center text-[#1F1F1F] text-xs tracking-widest uppercase border border-[#1F1F1F] px-8 py-4 hover:bg-[#1F1F1F] hover:text-[#F7F5F2] transition-colors"
              >
                Get started
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="bg-[#1F1F1F] px-6 md:px-16 py-20 md:py-32">
        <div className="max-w-7xl mx-auto">
          <p className="text-[#D8D2C8] text-xs tracking-widest uppercase mb-14 md:mb-20">
            Who it&apos;s for
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 lg:gap-16">
            <div>
              <h3 className="text-[#F7F5F2] text-sm tracking-widest uppercase font-light mb-5">
                Busy parents
              </h3>
              <p className="text-[#D8D2C8] font-light leading-relaxed">
                You&apos;re running a household and a career. We make sure nothing falls through the cracks.
              </p>
            </div>
            <div>
              <h3 className="text-[#F7F5F2] text-sm tracking-widest uppercase font-light mb-5">
                Founders
              </h3>
              <p className="text-[#D8D2C8] font-light leading-relaxed">
                Your time is your most valuable asset. Stop spending it on admin.
              </p>
            </div>
            <div>
              <h3 className="text-[#F7F5F2] text-sm tracking-widest uppercase font-light mb-5">
                Executives
              </h3>
              <p className="text-[#D8D2C8] font-light leading-relaxed">
                High performance requires a strong support system behind it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1F1F1F] border-t border-[#D8D2C8]/20 px-6 md:px-16 pt-16 md:pt-20 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 mb-12 md:mb-16 text-center md:text-left">
            <div>
              <p className="text-[#F7F5F2] text-xs tracking-widest uppercase">
                The Life Office
              </p>
            </div>
            <div className="md:text-center">
              <p className="text-[#D8D2C8] text-sm font-light">
                We handle it. You live it.
              </p>
            </div>
            <div className="md:text-right">
              <nav className="flex flex-col items-center md:items-end gap-3">
                <a href="#" className="text-[#D8D2C8] text-xs tracking-widest uppercase hover:text-[#F7F5F2] transition-colors">
                  Services
                </a>
                <a href="#" className="text-[#D8D2C8] text-xs tracking-widest uppercase hover:text-[#F7F5F2] transition-colors">
                  How it works
                </a>
                <a href="#packages" className="text-[#D8D2C8] text-xs tracking-widest uppercase hover:text-[#F7F5F2] transition-colors">
                  Packages
                </a>
                <a href="#packages" className="text-[#D8D2C8] text-xs tracking-widest uppercase hover:text-[#F7F5F2] transition-colors">
                  Work with us
                </a>
              </nav>
            </div>
          </div>
          <div className="border-t border-[#D8D2C8]/20 pt-8 text-center md:text-left">
            <p className="text-[#D8D2C8] text-xs font-light">
              &copy; {new Date().getFullYear()} The Life Office. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
