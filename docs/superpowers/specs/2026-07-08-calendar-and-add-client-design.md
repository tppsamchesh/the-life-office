# Interactive Calendar + Add Client Design

Two small, independent features for Meg's dashboard, requested after a walkthrough of the shipped three-phase UX/UI improvement roadmap surfaced two real gaps: the Calendar page looks like a clickable calendar but isn't one, and there's no way to add a new client at all.

## 1. Interactive Calendar

### Problem

`app/dashboard/(app)/calendar/page.tsx` renders a flat list of upcoming dates grouped by horizon (this week / this month / later). Only the small household-name text on each row is a link (to the client); the rest of the row, including the date and category, has no interaction at all despite looking like a clickable card. There is no way to browse by month or see "what's happening on this specific day."

### Design

A month-grid calendar sits above the existing list. Clicking a day filters the list below to that day's items. The grid and the list both read from the same data `getCalendarEntries()` already fetches server-side; no new queries.

**State:** the selected day lives in the URL as `?date=YYYY-MM-DD` (consistent with this app's existing pattern of URL-driven selection, e.g. `?task=` on Triage, `?conversation=` on Conversations). No date param means "today" (the default on first load, per explicit product decision below).

**`CalendarGrid` (new client component, `app/dashboard/(app)/calendar/_components/CalendarGrid.tsx`):**
- Renders a standard 7-column month grid (Mon-Sun) for a `visibleMonth` held in local component state (does not need to round-trip through the URL; navigating months is a pure client-side view change over already-fetched data).
- Each day cell shows the day number and, if `entries` includes 1+ items for that date, a small dot (reusing the same `Chip`-adjacent dot styling used elsewhere in this app, sage-deep tone, not a new visual language).
- The selected day (from `?date=`) gets a visible accent (border-l-sage + bg-surface, matching the existing "active" treatment used on Triage/Conversations list rows).
- Today's cell gets its own subtle marker (a ring or bold day-number) distinct from "selected," so Meg can tell the two apart when she's browsing away from today.
- Prev/next month buttons (44px touch targets, `ChevronLeft`/`ChevronRight` or text arrows consistent with existing iconless button style in this app) change only `visibleMonth`; they never trigger a refetch.
- On mobile (< 768px): same grid, smaller cells (day number + dot only, no extra content). No separate mobile-only layout; verified against the same breakpoint conventions the calm-shell-mobile plan already established.

**List below the grid:**
- Replaces the current horizon-grouped sections with a single filtered view: all entries whose `date` matches the selected `?date=`.
- Empty day state: not a bare "nothing here." Since today will usually have zero items, show a calm empty message plus a "Next: {label}, {formatted date}" pointer to the soonest upcoming entry (computed client-side from the already-fetched `entries` array: the earliest date `>= today`), so Meg always has something to click toward. This reuses the existing `EmptyCard` container but with richer content, not the plain `AllClear`/`EmptyCard` one-liner used elsewhere (this is genuine no-data-for-this-day, not an achievement state).
- A "Show all upcoming" text link clears `?date=` back to... actually, since removing the param defaults back to "today", this needs a distinct state: introduce `?date=all` to represent "show everything, horizon-grouped" (the pre-existing default view). Clicking a day sets `?date=YYYY-MM-DD`; clicking "Show all upcoming" sets `?date=all`; a bare page visit is equivalent to today's date, computed server-side at render time from the server's clock (calendar entries are date-only strings already, so this doesn't need timezone-aware `Intl` formatting the way message timestamps do elsewhere in this app, but should still use the same date-only comparison helpers already in `lib/clients/dates.ts`/`lib/clients/calendar-view.ts` rather than raw `Date` math).
- When `?date=all`, render exactly what's on the page today (This week / This month / Later, unchanged) so no existing behavior is lost, just reachable via one extra click instead of being the only view.

### Out of scope
- No per-date detail view, editing, or dismissal (clicking a day filters the list; clicking an entry still only links to the client, as today).
- No recurring-event authoring UI (unchanged from today: dates come from `lifecycle_dates`, this feature only changes how they're browsed).
- No calendar event creation from this page.

## 2. Add Client

### Problem

`app/dashboard/(app)/clients/actions.ts` has exactly one action, `addChannel`, which adds a phone number to an *existing* client. There is no way to create a new client record from the dashboard at all.

### Design

A "New client" button on the Clients list page (`app/dashboard/(app)/clients/page.tsx`, top-right next to the household count) opens a centered modal dialog containing a short form: first name, last name, preferred channel (WhatsApp or SMS), and that channel's number.

**Why a modal, and why these fields:** confirmed directly with the product owner. A modal keeps client creation a quick, un-navigated action from the list Meg already lives on; a dedicated page was considered but rejected as unnecessary ceremony for four fields. The field set mirrors `addChannel`'s existing validation exactly (E.164 phone starting with `+`, channel restricted to `whatsapp`/`sms`) rather than expanding the reachability model to email/iMessage in the same pass. A client with a name but no way to reach them isn't useful to Meg, so name-only creation was explicitly rejected: the form requires the first channel up front.

**`AddClientButton` + `AddClientModal` (new client components, `app/dashboard/(app)/clients/_components/`):**
- `AddClientButton` is a small trigger (`Button variant="secondary"`) that renders `AddClientModal` and manages open/closed state.
- `AddClientModal` uses a native `<dialog>` element (built-in modal semantics: Escape-to-close, no focus-trap library needed, `::backdrop` for the dim overlay) styled with this app's existing tokens (`bg-surface`, `border-hairline`, `rounded-xl`), not a new visual language.
- Form fields: `Input` for first/last name, `Select` for channel (`whatsapp` | `sms`, matching `addChannel`'s allowed set), `Input` for the number with a placeholder showing the expected E.164 format (`+447700900123`).
- Uses `useActionState` + the new `createClient` action; on `{error}` the modal stays open with the message via `FormError` and every typed field preserved via `defaultValue`; on success (`{}`) the modal closes (a `useEffect` watching the action state, or returning a `redirect`-free success signal the button component listens for) and the page revalidates to show the new card.

**`createClient` server action (new export in `clients/actions.ts`, alongside `addChannel`):**
1. Validate first/last name are non-empty (trimmed), and validate the channel/address pair with the exact same rule `addChannel` uses today (`address.startsWith("+")`, `channel` in `["whatsapp", "sms"]`).
2. Insert into `clients`: `{ first_name, last_name, status: "active" }`. All other client columns (email, preferences, addresses, etc.) stay `null`, exactly as a client created any other way would have them, since this flow doesn't touch that data.
3. Insert into `client_channels`: `{ client_id: <from step 2>, channel, address, is_primary: true }` (this is the client's first channel, so `is_primary: true`, unlike `addChannel`'s `false` default for additional numbers).
4. If step 3 fails, delete the `clients` row created in step 2 before returning the error, so a failed channel insert never leaves an orphaned, unreachable client behind. (Two-step insert, not a transaction: this schema has no Postgres function/RPC for a combined insert today, and introducing one is out of scope for a four-field form. The rollback-on-failure delete is the pragmatic equivalent.)
5. On success, `revalidatePath("/dashboard/clients")` and return `{}`.

### Out of scope
- No family members, preferences, lifecycle dates, or notes in this flow (all filled in later from the client detail page, exactly as today).
- No duplicate-client detection (matches the rest of this app: no existing entity has duplicate-checking on create).
- No email/iMessage channel support in this form (only WhatsApp/SMS, matching `addChannel`'s current validation; widening the channel model is a separate, larger change).

## Self-review

- **Placeholder scan:** none. Every requirement above has a concrete mechanism, not a TBD.
- **Internal consistency:** the calendar's `?date=all` fallback and the add-client rollback-on-failure were both decisions made during this self-review to close gaps the initial conversational design left implicit (what does "clear the filter" actually set the URL to; what happens to the orphaned client row if the channel insert fails). Both are now explicit above.
- **Scope:** both features are small and independent; no decomposition needed. They'll share one implementation plan since both are quick, low-risk additions to already-shipped pages, not because they're related in any deeper sense.
- **Ambiguity check:** "today" for the calendar's default is computed server-side from the server clock using the same date-only helpers already in this codebase (not a new timezone concern, since calendar entries are date-only strings already treated as UTC-day values elsewhere in this app).
