import Link from "next/link";

export function ConversationChips({
  requestType, conversationId,
}: {
  requestType: string | null;
  conversationId: string | null;
}) {
  const typed = requestType === "brief" || requestType === "nudge";
  if (!typed && !conversationId) return null;
  return (
    <div className="mb-3 flex items-center gap-2">
      {typed ? (
        <span className="rounded-full border border-[#D8D2C8] bg-[#EFEBE4] px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-[#6B665D]">
          {requestType}
        </span>
      ) : null}
      {conversationId ? (
        <Link
          href={`/dashboard/conversations?conversation=${conversationId}`}
          className="text-xs text-[#6B665D] underline hover:text-[#1F1F1F]"
        >
          View conversation
        </Link>
      ) : null}
    </div>
  );
}
