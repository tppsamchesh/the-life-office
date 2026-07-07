"use client";

import { useActionState } from "react";

import {
  handBackConversation,
  takeOverConversation,
  type ActionState,
} from "../actions";

import { Button, FormError } from "../../_components/ui";

// Take-over / hand-back toggle. Both actions are conditional on the current
// pause flag, so a stale button press surfaces an error instead of clobbering.
export function StateControls({ conversationId, paused }: { conversationId: string; paused: boolean }) {
  const [state, formAction] = useActionState(
    paused ? handBackConversation : takeOverConversation,
    {} as ActionState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <FormError message={state.error} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <Button type="submit" variant="secondary" pendingLabel={paused ? "Handing back..." : "Taking over..."}>
        {paused ? "Hand back to assistant" : "I've got this"}
      </Button>
    </form>
  );
}
