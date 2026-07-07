import { Chip } from "../../_components/ui";

// Partner vs Prospect identity — one consistent treatment used in the deck, board, and detail.
export function TypeBadge({ type }: { type: string | null }) {
  const partner = type === "partner";
  return (
    <Chip tone={partner ? "sage" : "neutral"} dot>
      {partner ? "Partner" : "Prospect"}
    </Chip>
  );
}
