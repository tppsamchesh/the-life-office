"use client";

import { useActionState } from "react";

import { Button, FormError, Select } from "../../../_components/ui";
import {
  claimQuarantined,
  ignoreQuarantined,
  type QuarantineActionState,
} from "../actions";

export type ClientOption = {
  id: string;
  first_name: string;
  last_name: string | null;
  family_members: { id: string; first_name: string }[];
};

const INITIAL: QuarantineActionState = {};

export function QuarantineActions({
  quarantineId,
  clients,
}: {
  quarantineId: string;
  clients: ClientOption[];
}) {
  const [claimState, claimAction] = useActionState(claimQuarantined, INITIAL);
  const [ignoreState, ignoreAction] = useActionState(ignoreQuarantined, INITIAL);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <form action={claimAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="quarantineId" value={quarantineId} />
          <Select name="clientId" required defaultValue="" aria-label="Choose client">
            <option value="" disabled>Choose client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.last_name}, {c.first_name}</option>
            ))}
          </Select>
          <Select name="familyMemberId" defaultValue="" aria-label="Family member">
            <option value="">The client themself</option>
            {clients.flatMap((c) =>
              c.family_members.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} ({c.last_name})</option>
              )),
            )}
          </Select>
          <Button type="submit" variant="primary" pendingLabel="Claiming…">
            Claim
          </Button>
        </form>
        <form action={ignoreAction}>
          <input type="hidden" name="quarantineId" value={quarantineId} />
          <Button type="submit" variant="quiet" pendingLabel="Removing…">
            Ignore
          </Button>
        </form>
      </div>
      <FormError message={claimState.error ?? ignoreState.error} />
    </div>
  );
}
