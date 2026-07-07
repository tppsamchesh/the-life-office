"use client";

import { useActionState } from "react";

import { sendReply, type ReplyState } from "../actions";

import { Button, FormError, Textarea } from "../../_components/ui";

// Reply box with two intents: a plain send pauses the assistant for this
// thread; "Send & hand back" answers and immediately returns it to the
// assistant. On error the draft is preserved (the textarea is keyed by the
// returned body so React 19's automatic form reset cannot wipe it).
export function Composer({ conversationId }: { conversationId: string }) {
  const [state, formAction] = useActionState(sendReply, {} as ReplyState);

  return (
    <form action={formAction} className="border-t border-hairline px-4 py-3">
      <FormError message={state.error} />
      <div className="flex gap-2">
        <input type="hidden" name="conversationId" value={conversationId} />
        <Textarea
          key={state.body ?? "fresh"}
          name="body"
          rows={2}
          required
          placeholder="Reply as Meg..."
          defaultValue={state.body ?? ""}
          className="flex-1 resize-none text-base md:text-sm"
        />
        <div className="flex flex-col items-stretch gap-1.5 self-end">
          <Button
            type="submit"
            variant="primary"
            name="intent"
            value="send"
            pendingLabel="Sending..."
            className="min-h-11 md:min-h-0"
          >
            Send
          </Button>
          <Button
            type="submit"
            variant="secondary"
            name="intent"
            value="send_hand_back"
            pendingLabel="Sending..."
            className="min-h-11 md:min-h-0"
          >
            Send &amp; hand back
          </Button>
        </div>
      </div>
    </form>
  );
}
