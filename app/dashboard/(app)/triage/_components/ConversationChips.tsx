import Link from "next/link";

import { Chip } from "../../_components/ui";

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
      {typed ? <Chip>{requestType}</Chip> : null}
      {conversationId ? (
        <Link
          href={`/dashboard/conversations?conversation=${conversationId}`}
          className="text-xs text-muted underline hover:text-ink"
        >
          View conversation
        </Link>
      ) : null}
    </div>
  );
}
