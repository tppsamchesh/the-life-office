"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

/* Shared dashboard primitives — the single source for button, chip, input,
   label, and empty-state recipes. Import from here instead of redefining
   per-file BTN/FIELD/LABEL constants.

   className is for LAYOUT ONLY (flex-1, self-start, max-w-xs, mt-2…).
   Never pass color, size, or state classes — use a variant/tone instead. */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1";

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-sage text-ink font-medium hover:bg-[#96A08F] active:bg-[#8A947F]",
  secondary: "border border-edge bg-surface hover:bg-inset",
  quiet: "text-muted hover:bg-inset",
  danger: "border border-alert/40 text-alert hover:bg-alert-tint",
};

// Uses useFormStatus: when submitted inside a <form action={…}> it disables
// itself, dims to opacity-60, and swaps its label to pendingLabel.
// Outside a form (type="button" togglers) pending is always false.
export function Button({
  variant = "primary",
  pendingLabel,
  className = "",
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      disabled={disabled || pending}
      className={`rounded-md px-3 py-2 text-sm transition-colors ${FOCUS_RING} disabled:cursor-default ${
        pending ? "opacity-60" : "disabled:opacity-50"
      } ${BUTTON_VARIANT[variant]} ${className}`}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

type ChipTone = "neutral" | "sage" | "amber" | "alert";

const CHIP_TONE: Record<ChipTone, string> = {
  neutral: "border border-edge text-muted",
  sage: "bg-sage-tint text-sage-deep",
  amber: "bg-amber-tint text-amber",
  alert: "bg-alert-tint text-alert",
};

const CHIP_DOT: Record<ChipTone, string> = {
  neutral: "bg-muted",
  sage: "bg-sage-deep",
  amber: "bg-amber",
  alert: "bg-alert",
};

// The one chip grammar app-wide. Sentence case children; no uppercase.
export function Chip({
  tone = "neutral",
  dot = false,
  children,
}: {
  tone?: ChipTone;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${CHIP_TONE[tone]}`}
    >
      {dot ? <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${CHIP_DOT[tone]}`} /> : null}
      {children}
    </span>
  );
}

const FIELD_BASE = `rounded-md border border-edge bg-surface px-3 py-2 text-ink placeholder:text-faint hover:border-edge-strong ${FOCUS_RING}`;

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD_BASE} text-sm ${className}`} />;
}

// text-base on mobile keeps iOS Safari from auto-zooming on focus.
export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${FIELD_BASE} text-base sm:text-sm ${className}`} />;
}

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${FIELD_BASE} text-sm ${className}`}>
      {children}
    </select>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{children}</p>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`text-sm text-muted transition-colors hover:text-ink ${FOCUS_RING}`}>
      ← {children}
    </Link>
  );
}

export function DetailHeader({
  back,
  title,
  chip,
  meta,
}: {
  back?: { href: string; label: string };
  title: string;
  chip?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {back ? (
        <div className="mb-2">
          <BackLink href={back.href}>{back.label}</BackLink>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl">{title}</h1>
        {chip ?? null}
      </div>
      {meta ? <p className="mt-1 text-xs text-muted">{meta}</p> : null}
    </div>
  );
}

// The rewarding "nothing needs you" state, ported from the leads ReviewDeck's
// "All caught up" card. Use for cleared queues; use EmptyCard for genuine no-data.
export function AllClear({ title = "All clear", hint }: { title?: string; hint?: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-hairline bg-surface px-8 py-16 text-center">
      <p className="font-serif text-2xl text-ink">
        <span aria-hidden className="mr-2.5 inline-block h-2 w-2 rounded-full bg-sage align-middle" />
        {title}
      </p>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

// Muted neutral card for genuine no-data (not for cleared queues).
export function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface px-6 py-12 text-center text-sm text-muted">
      {children}
    </div>
  );
}

// Renders nothing when there is no message.
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p aria-live="polite" className="text-sm text-alert">
      {message}
    </p>
  );
}

/* Carried over from clients/_components/ui.tsx (token-mapped) so its
   consumers can migrate here. */

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-hairline bg-surface px-4 py-3.5 ${className}`}>
      {title ? (
        <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">
          {title}
        </h3>
      ) : null}
      {children}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}
