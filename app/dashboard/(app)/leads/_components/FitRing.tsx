// A circular fit-score gauge: sage arc filled to the score, number set inside.
// The signature visual of the Leads UI. Renders a muted dashed ring for unscored leads.
export function FitRing({
  score,
  size = 60,
  stroke = 4,
}: {
  score: number | null;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const has = score != null;
  const pct = Math.max(0, Math.min(100, score ?? 0)) / 100;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#E7E2D9"
          strokeWidth={stroke}
          strokeDasharray={has ? undefined : "2.5 4"}
        />
        {has ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#94A089"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)" }}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-serif leading-none text-[#3A372F]"
          style={{ fontSize: Math.round(size * 0.32) }}
        >
          {has ? score : "–"}
        </span>
      </div>
    </div>
  );
}
