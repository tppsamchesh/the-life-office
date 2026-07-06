// Mirrors agent/concierge/concierge/state.py. If you change one, change both.
export type ConversationState = "idle" | "awaiting_meg" | "agent_active" | "meg_active";

export type ConvState = {
  state: ConversationState;
  agent_paused: boolean;
  grace_deadline: string | null;
};

export function onMegSend(): ConvState {
  return { state: "meg_active", agent_paused: true, grace_deadline: null };
}

export function takeOver(): ConvState {
  return onMegSend();
}

export function onHandBack(): ConvState {
  return { state: "idle", agent_paused: false, grace_deadline: null };
}

export function onInbound(current: ConvState, nowIso: string, graceSeconds: number): ConvState {
  if (current.agent_paused) {
    return { state: "meg_active", agent_paused: true, grace_deadline: null };
  }
  const deadline = new Date(new Date(nowIso).getTime() + graceSeconds * 1000).toISOString();
  return { state: "awaiting_meg", agent_paused: false, grace_deadline: deadline };
}
