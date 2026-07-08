"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button, FormError, Input, Select } from "../../_components/ui";
import { addClient, type AddClientState } from "../actions";

const INITIAL: AddClientState = {};

export function AddClientButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(addClient, INITIAL);

  useEffect(() => {
    if (state.done) dialogRef.current?.close();
  }, [state.done]);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => dialogRef.current?.showModal()}>
        New client
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="add-client-title"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-auto w-full max-w-md rounded-xl border border-hairline bg-surface p-0 backdrop:bg-ink/40"
      >
        <form action={formAction} className="flex flex-col gap-3 p-6">
          <h2 id="add-client-title" className="font-serif text-lg">
            New client
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="mb-1 block text-xs text-muted">
                First name
              </label>
              <Input
                id="firstName"
                name="firstName"
                required
                defaultValue={state.firstName}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="mb-1 block text-xs text-muted">
                Last name
              </label>
              <Input
                id="lastName"
                name="lastName"
                required
                defaultValue={state.lastName}
                className="w-full"
              />
            </div>
          </div>
          <div>
            <label htmlFor="channel" className="mb-1 block text-xs text-muted">
              Channel
            </label>
            <Select
              id="channel"
              name="channel"
              defaultValue={state.channel ?? "whatsapp"}
              className="w-full"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </Select>
          </div>
          <div>
            <label htmlFor="address" className="mb-1 block text-xs text-muted">
              Number (E.164, e.g. +447700900123)
            </label>
            <Input
              id="address"
              name="address"
              required
              placeholder="+447700900123"
              defaultValue={state.address}
              className="w-full"
            />
          </div>
          <FormError message={state.error} />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="quiet" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" pendingLabel="Creating...">
              Create client
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
