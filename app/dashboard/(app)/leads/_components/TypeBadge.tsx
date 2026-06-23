// Partner vs Prospect identity — one consistent treatment used in the deck, board, and detail.
export function TypeBadge({ type }: { type: string | null }) {
  const partner = type === "partner";
  const label = partner ? "Partner" : "Prospect";
  const className = partner
    ? "bg-[#EBEFE8] text-[#46503E]"
    : "bg-[#F1ECE3] text-[#5C5648]";
  const dot = partner ? "#8E9C83" : "#C2B79F";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-[0.02em] ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} aria-hidden />
      {label}
    </span>
  );
}
