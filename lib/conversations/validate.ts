// Validation for the reply composer. Returns an error message instead of
// silently no-oping so the form can surface it inline.
export function validateReplyBody(raw: unknown): { body: string } | { error: string } {
  const body = typeof raw === "string" ? raw.trim() : "";
  if (!body) return { error: "Reply can't be empty." };
  return { body };
}
