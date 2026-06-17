export const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7A766E] mb-3";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[10px] border border-[#E7E2D9] bg-white px-4 py-3.5 ${className}`}>
      {title ? <h3 className={SECTION_LABEL}>{title}</h3> : null}
      {children}
    </div>
  );
}

export function Chip({ children, sage = false }: { children: React.ReactNode; sage?: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] tracking-[0.03em] ${
        sage ? "bg-[#A8B2A1] text-[#1F1F1F]" : "border border-[#D8D2C8] bg-white text-[#6B665D]"
      }`}
    >
      {children}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-[#A39E94]">{children}</p>;
}
