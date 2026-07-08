# Dashboard Roadmap: Operating Clients Seamlessly

Goal: Meg operates her customers seamlessly from the dashboard, and feels at ease doing it.

Source material (2026-07-07 swarm reviews, 4 personas x 4 rounds each):
- [UX review](ux-review-meg-dashboard.md) — can she finish the work? 15 ranked issues.
- [UI review](ui-review-meg-dashboard.md) — does it feel calm and easy? 15 ranked issues.

Both reviews converge on the same conclusion: the foundations (state machine, realtime, push, activity log, Leads interaction patterns) are good; the gaps are unclosed loops and a missing shared visual system. The roadmap below fixes the system first, then the loops, then the shell.

## Build phases — STATUS: ALL SHIPPED (2026-07-08)

All three phases below were built via `superpowers:subagent-driven-development`, in strict order (Phase 1 → Phase 2 → Phase 3), each with a fresh implementer + reviewer per task and an Opus-tier final whole-branch review. All Critical/Important findings were resolved before moving to the next phase. Full history lives in `.superpowers/sdd/progress.md`. Pushed to `origin/main` and live in production.

Phase 1 must land first; both later plans depend on its tokens/primitives. Phase 2 and Phase 3 were drafted concurrently and both did full-file rewrites of `conversations/page.tsx`, `conversations/_components/ThreadView.tsx`, and `triage/page.tsx` — Phase 2 additionally extracted a new `conversations/_components/Composer.tsx` that Phase 3's plan didn't know about at write time. Phase 2 was built first, then Phase 3's Tasks 4, 5, and 6 were adapted to the actual post-Phase-2 file contents (per the reconciliation note at the top of that plan) rather than its literal line anchors.

### Phase 1 — Design system foundation ✅ SHIPPED
Plan: [superpowers/plans/2026-07-07-dashboard-design-system.md](superpowers/plans/2026-07-07-dashboard-design-system.md)

Design tokens in `globals.css` `@theme`, the five-step type scale (11px floor), and the shared primitive set in `app/dashboard/(app)/_components/ui.tsx` (Button with pending/disabled/focus faces, Chip, Input/Textarea/Select, SectionLabel, BackLink, DetailHeader, AllClear, EmptyCard, FormError). Converts all mutations to `useActionState` with inline errors that preserve drafts; adds `error.tsx`/`loading.tsx` boundaries; sweeps hard-coded hexes and ad-hoc buttons/chips onto the system.

Covers: UI issues 1 (button half), 2, 4, 5, 6, 9, 12; UX issue 5.

### Phase 2 — Thread as cockpit ✅ SHIPPED
Plan: [superpowers/plans/2026-07-07-thread-cockpit.md](superpowers/plans/2026-07-07-thread-cockpit.md)

Closes the conversation/triage loops: visible agent-paused state + "Send & hand back"; pending agent draft rendered inline in the thread with Approve / Edit & send; delivery status, failed-send badges and Retry; real unread via `last_read_at` (migration); race-proof keyed components and conditional mutations; triage sort/snooze/timestamps fixes; thread scroll-to-bottom, day dividers, sibling household chips; calm bubble and TaskCard re-typography.

Covers: UX issues 1, 2, 3, 6, 9, 13, 15; UI issues 1 (bubble half), 3, 11, 13 (grace part).

Highest-stakes phase (shares Supabase tables with the live concierge daemon). Caught and fixed a real Critical bug during build: `ThreadView` had no remount key despite a comment claiming one existed, so a typed draft in one client's thread could leak into, and potentially be sent to, a different client's thread on a fast switch. Fixed and independently re-verified by tracing the full component tree.

### Phase 3 — Calm shell, mobile & wayfinding ✅ SHIPPED
Plan: [superpowers/plans/2026-07-07-calm-shell-mobile.md](superpowers/plans/2026-07-07-calm-shell-mobile.md)

Responsive shell (sidebar collapse below `md`, Triage list-then-detail on mobile, dvh units, 44px touch targets); sidebar count chips that vanish at zero so the frame itself says "all clear"; permanent quarantine entry; realtime reconnect + focus refetch with a staleness pill; terracotta replaces fire-alarm red; AllClear empty states and product-voice placeholders; DetailHeader and per-page metadata titles everywhere; calendar grouping and activity capping.

Covers: UX issues 4, 8, 10; UI issues 7, 8 (master-detail half), 10, 13, 14, 15.

## Post-roadmap work

Once all three phases were live, Sam did a hands-on walkthrough of the deployed dashboard and surfaced two real gaps that neither swarm review had flagged (both assumed calendar browsing and client creation were solved problems, when they weren't): the Calendar page looked clickable but wasn't, and there was no way to create a new client record at all. Brainstormed into a design spec and built as its own small plan.

### Interactive Calendar + Add Client ✅ SHIPPED (2026-07-08)
Spec: [superpowers/specs/2026-07-08-calendar-and-add-client-design.md](superpowers/specs/2026-07-08-calendar-and-add-client-design.md)
Plan: [superpowers/plans/2026-07-08-calendar-and-add-client.md](superpowers/plans/2026-07-08-calendar-and-add-client.md)

A real month-grid calendar: click a day to filter the list below to that day's items (`?date=` URL param, consistent with `?task=`/`?conversation=` elsewhere), today pre-selected, month nav, "Next: X" pointer on empty days correctly scoped to the day being viewed. A "New client" button on the Clients page opens a modal (name + first WhatsApp/SMS channel), creating the client and its first contact channel together with rollback on failure. Independently re-verified against the concierge daemon's actual matching logic (`resolve_channel`/`primary_address`) to confirm a client created this way is genuinely reachable, not just assumed to work.

## Backlog (reviewed, deliberately deferred — next planning pass)

| Item | Source | Why deferred |
| --- | --- | --- |
| Compose/start a conversation from client pages + `tel:`/`sms:`/`mailto:` links | UX 7 | Needs daemon-side agreement on outbound-initiated conversation rows |
| Search everywhere + Cmd+K + Triage hotkeys (port ReviewDeck pattern) | UX 11 | Valuable but not blocking the core loop; needs Postgres FTS decision for message bodies |
| Push pipeline hardening (notificationclick await/fallback, `?next=` through login, `pushsubscriptionchange`, offline shell, test-notification button) | UX 12 | Push still needs real VAPID keys; harden alongside Twilio go-live |
| Client knowledge editing for *existing* clients (preferences/dates CRUD, freeform activity note, recurrence for anniversaries, keep passed dates until acknowledged) | UX 14 | Whole CRUD surface; creating a *new* client is now solved (see Post-roadmap work above), this is about editing an existing one's details |
| Leads ReviewDeck restyle into house grammar; redistribute its progress/kbd-hint care to Triage/Conversations | UI 8 (remainder) | Cosmetic-only on a page that already works; lowest risk to defer |

## Standing constraints for all phases

- This Next.js version has breaking changes: consult `node_modules/next/dist/docs/` before writing code (see `AGENTS.md`).
- The concierge daemon (VPS, systemd `tlo-concierge`) reads/writes the same Supabase tables; any change to `lib/conversations/state.ts` transitions must stay daemon-compatible.
- No new hex values outside the Phase 1 tokens; no type below 11px; every interactive element has visible hover, focus, and pending states.
- Message path is still blocked on TLO's own Twilio number; delivery-status UI must handle the "queued forever" case gracefully.
