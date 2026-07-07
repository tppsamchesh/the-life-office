"use client";

import { useActionState } from "react";

import { Button, FormError, Input, Select } from "../../_components/ui";
import { addChannel, type ChannelActionState } from "../actions";

const INITIAL: ChannelActionState = {};

export function AddChannelForm({
  clientId,
  familyMemberId,
  familyMembers,
}: {
  clientId: string;
  familyMemberId?: string;
  familyMembers: { id: string; first_name: string }[];
}) {
  const [state, formAction] = useActionState(addChannel, INITIAL);

  return (
    <form action={formAction} className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="clientId" value={clientId} />
        {familyMemberId ? (
          <input type="hidden" name="familyMemberId" value={familyMemberId} />
        ) : (
          <Select name="familyMemberId" defaultValue="" aria-label="Family member">
            <option value="">The client themself</option>
            {familyMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.first_name}</option>
            ))}
          </Select>
        )}
        <Select name="channel" defaultValue="whatsapp" aria-label="Channel">
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
        </Select>
        <Input
          name="address"
          required
          placeholder="+447700900123"
          aria-label="Phone number"
          defaultValue={state.address ?? ""}
        />
        <Button type="submit" variant="secondary" pendingLabel="Adding…">
          Add number
        </Button>
      </div>
      <FormError message={state.error} />
    </form>
  );
}
