import Link from "next/link";

export const metadata = {
  title: "Services — The Life Office",
};

export default function ServicesPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-24 bg-[#1F1F1F] min-h-screen">
      <div className="text-center">
        <div className="w-12 h-16 border border-[#A8B2A1] rounded-full flex flex-col items-center justify-center mx-auto mb-12">
          <span className="font-serif text-[#A8B2A1] text-sm leading-none">T</span>
          <span className="font-serif text-[#A8B2A1] text-sm leading-none">L</span>
        </div>
        <h1 className="font-serif text-[#F7F5F2] text-4xl md:text-5xl lg:text-6xl font-light tracking-wide mb-6">
          Services
        </h1>
        <p className="text-[#D8D2C8] text-sm font-light leading-relaxed mb-14 max-w-xs mx-auto">
          Something exceptional is on its way.
        </p>
        <Link
          href="/"
          className="text-[#F7F5F2] text-xs tracking-widest uppercase border border-[#F7F5F2]/30 px-8 py-4 hover:border-[#F7F5F2]/70 transition-colors"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
