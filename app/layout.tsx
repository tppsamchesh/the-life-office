import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "The Life Office",
  description: "Life and business support for people who don't have time to think about either.",
};

function TLMonogram({ size = "sm", color = "warm-white" }: { size?: "sm" | "lg"; color?: "warm-white" | "sage" }) {
  const borderColor = color === "sage" ? "border-[#A8B2A1]" : "border-[#F7F5F2]";
  const textColor = color === "sage" ? "text-[#A8B2A1]" : "text-[#F7F5F2]";
  const dims = size === "lg" ? "w-10 h-14" : "w-6 h-8";
  const fontSize = size === "lg" ? "text-[11px]" : "text-[8px]";
  return (
    <div className={`${dims} ${borderColor} border rounded-full flex flex-col items-center justify-center shrink-0`}>
      <span className={`font-serif ${textColor} ${fontSize} leading-none`}>T</span>
      <span className={`font-serif ${textColor} ${fontSize} leading-none`}>L</span>
    </div>
  );
}

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "How it works", href: "/how-it-works" },
  { label: "The Journal", href: "/the-journal" },
  { label: "The Edit", href: "/the-edit" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#1F1F1F] text-[#F7F5F2] font-sans">

        {/* Hidden checkbox — powers the mobile nav overlay via CSS peer */}
        <input
          type="checkbox"
          id="nav-open"
          className="peer absolute opacity-0 w-0 h-0 pointer-events-none"
        />

        {/* Mobile nav overlay — slides down when checkbox is checked */}
        <div className="fixed inset-0 z-[60] bg-[#1F1F1F] flex flex-col items-center justify-center
                        -translate-y-full peer-checked:translate-y-0
                        transition-transform duration-300 ease-in-out
                        md:hidden">

          {/* Close button */}
          <label
            htmlFor="nav-open"
            className="absolute top-6 right-5 cursor-pointer w-10 h-10 flex items-center justify-center"
            aria-label="Close menu"
          >
            <span className="absolute h-px w-5 bg-[#F7F5F2] rotate-45"></span>
            <span className="absolute h-px w-5 bg-[#F7F5F2] -rotate-45"></span>
          </label>

          {/* Nav links */}
          <nav className="flex flex-col items-center gap-8 mb-12">
            {navLinks.map(({ label, href }) => (
              <label key={href} htmlFor="nav-open" className="cursor-pointer">
                <Link
                  href={href}
                  className="font-serif text-[#F7F5F2] text-3xl font-light tracking-wide hover:text-[#A8B2A1] transition-colors"
                >
                  {label}
                </Link>
              </label>
            ))}
          </nav>

          {/* Work with us CTA */}
          <label htmlFor="nav-open" className="cursor-pointer">
            <Link
              href="/#work-with-us"
              className="inline-block bg-[#A8B2A1] text-[#1F1F1F] text-xs tracking-widest uppercase px-10 py-4 hover:bg-[#96a08f] transition-colors"
            >
              Work with us
            </Link>
          </label>

        </div>

        {/* NAV */}
        <nav className="site-nav sticky top-0 z-50 border-b border-[#A8B2A1]/20">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 py-4 md:py-5 flex items-center justify-between gap-6">

            {/* Logo + wordmark */}
            <Link href="/" className="flex items-center gap-3 text-[#F7F5F2] hover:text-[#A8B2A1] transition-colors shrink-0">
              <TLMonogram size="sm" color="warm-white" />
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-xs tracking-widest uppercase">The Life Office</span>
                <span className="text-[8px] tracking-wider text-[#D8D2C8] mt-0.5">We handle it. You live it.</span>
              </div>
            </Link>

            {/* Centre nav links — desktop only */}
            <div className="hidden lg:flex items-center gap-8 xl:gap-12">
              {navLinks.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-[#D8D2C8] text-[10px] tracking-widest uppercase hover:text-[#A8B2A1] transition-colors whitespace-nowrap"
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4 shrink-0">

              {/* Hamburger — mobile only */}
              <label
                htmlFor="nav-open"
                className="md:hidden cursor-pointer flex flex-col gap-[5px] w-5 py-1"
                aria-label="Open menu"
              >
                <span className="block h-px w-full bg-[#F7F5F2]"></span>
                <span className="block h-px w-full bg-[#F7F5F2]"></span>
                <span className="block h-px w-full bg-[#F7F5F2]"></span>
              </label>

              {/* CTA — desktop only */}
              <Link
                href="/#work-with-us"
                className="hidden md:inline-block bg-[#A8B2A1] text-[#1F1F1F] text-xs tracking-widest uppercase px-6 py-3 hover:bg-[#96a08f] transition-colors whitespace-nowrap"
              >
                Work with us
              </Link>

            </div>

          </div>
        </nav>

        {/* PAGE CONTENT */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* FOOTER */}
        <footer id="work-with-us" className="bg-[#1F1F1F] border-t border-[#A8B2A1]/20 px-6 md:px-16 pt-14 md:pt-20 pb-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 mb-12 md:mb-16 text-center md:text-left">

              {/* Left: monogram + wordmark */}
              <div className="flex flex-col items-center md:items-start gap-3">
                <div className="flex items-center gap-3">
                  <TLMonogram size="sm" color="warm-white" />
                  <span className="text-[#F7F5F2] text-xs tracking-widest uppercase">The Life Office</span>
                </div>
              </div>

              {/* Centre: tagline */}
              <div className="flex items-start justify-center">
                <p className="text-[#D8D2C8] text-sm font-light">We handle it. You live it.</p>
              </div>

              {/* Right: nav links */}
              <div className="md:text-right">
                <nav className="flex flex-col items-center md:items-end gap-3">
                  {navLinks.map(({ label, href }) => (
                    <Link
                      key={href}
                      href={href}
                      className="text-[#D8D2C8] text-xs tracking-widest uppercase hover:text-[#A8B2A1] transition-colors"
                    >
                      {label}
                    </Link>
                  ))}
                  <Link
                    href="/#work-with-us"
                    className="text-[#A8B2A1] text-xs tracking-widest uppercase hover:text-[#F7F5F2] transition-colors"
                  >
                    Work with us
                  </Link>
                </nav>
              </div>

            </div>

            {/* Copyright */}
            <div className="border-t border-[#A8B2A1]/20 pt-8 text-center md:text-left">
              <p className="font-serif italic text-[#D8D2C8] text-sm mb-3">
                Quietly accepting a select number of new clients.
              </p>
              <p className="text-[#D8D2C8] text-xs font-light">
                &copy; {new Date().getFullYear()} The Life Office. All rights reserved.
              </p>
            </div>

          </div>
        </footer>

      </body>
    </html>
  );
}
