import { normalizeAiBrief } from "@/lib/triage/ai-brief";
import { formatGBP, timeAgo } from "@/lib/triage/format";
import { taskTitle, type InboxTask } from "@/lib/triage/queries";

import { Chip } from "../../_components/ui";
import { ConversationChips } from "./ConversationChips";
import { TaskActions } from "./TaskActions";

const LABEL = "text-[11px] font-medium uppercase tracking-wide text-muted";

export function TaskCard({ task }: { task: InboxTask }) {
  const brief = normalizeAiBrief(task.ai_brief);
  const isProactive = task.source === "proactive";

  return (
    <div className="rounded-xl border border-hairline bg-surface p-6 shadow-sm">
      <ConversationChips requestType={task.request_type} conversationId={task.conversation_id} />
      <div className="mb-4 flex items-center justify-between">
        <Chip tone={isProactive ? "sage" : "neutral"}>{task.source ?? ""}</Chip>
        {task.created_at ? (
          <span className="font-serif text-sm italic text-muted">
            {timeAgo(task.created_at)}
          </span>
        ) : null}
      </div>

      <h2 className="font-serif text-2xl">{taskTitle(task)}</h2>
      <p className={`${LABEL} mt-1 mb-5`}>{task.request_type}</p>

      {task.raw_message ? (
        <div className="mb-5">
          <div className={LABEL}>Client&apos;s message</div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink">{task.raw_message}</p>
        </div>
      ) : null}

      <div className="mb-5 rounded-r-md border-l-[3px] border-sage bg-inset px-4 py-3">
        <div className={LABEL}>{isProactive ? "AI Spotted" : "Brief"}</div>
        {task.request_summary ? (
          <p className="mt-1.5 text-sm leading-relaxed">{task.request_summary}</p>
        ) : null}
        {brief.facts.length ? (
          <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            {brief.facts.map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-muted">{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {brief.options.length ? (
        <div className="mb-5 overflow-hidden rounded-xl border border-hairline">
          <div className={`${LABEL} bg-inset px-4 py-2`}>Research findings</div>
          {brief.options.map((o) => (
            <div
              key={o.name}
              className={`flex items-start gap-3 border-t border-hairline px-4 py-3 first:border-t-0 ${
                o.recommended ? "bg-inset" : ""
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  o.recommended ? "bg-sage-deep" : "bg-edge"
                }`}
              />
              <div className="flex-1">
                <div className="text-sm font-semibold">{o.name}</div>
                {o.summary ? <div className="text-xs text-muted">{o.summary}</div> : null}
                {o.why ? <div className="mt-0.5 text-[11px] italic text-muted">{o.why}</div> : null}
              </div>
              <div className="whitespace-nowrap text-right text-sm font-semibold">
                {typeof o.cost === "number" ? formatGBP(o.cost) : ""}
                {o.recommended ? (
                  <span className="block text-[11px] font-semibold text-sage-deep">Recommended</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {brief.recommendationReasoning ? (
        <div className="mb-3 rounded-xl bg-inset px-4 py-3">
          <div className={LABEL}>Recommendation</div>
          <p className="mt-1 text-sm leading-relaxed">{brief.recommendationReasoning}</p>
        </div>
      ) : null}
      {brief.noteForMeg ? (
        <p className="mb-5 text-xs italic text-muted">Note for Meg: {brief.noteForMeg}</p>
      ) : null}

      {task.draft_message ? (
        <div className="rounded-xl border border-hairline p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className={LABEL}>Draft message</span>
            {task.draft_channel ? (
              <Chip>{task.draft_channel}</Chip>
            ) : null}
          </div>
          <p className="font-mono text-sm leading-relaxed text-ink whitespace-pre-wrap">
            {task.meg_edited_message ?? task.draft_message}
          </p>
          <div className="mt-2 text-right text-[11px] text-muted">
            {(task.meg_edited_message ?? task.draft_message).length} chars
          </div>
        </div>
      ) : null}

      <TaskActions
        taskId={task.id}
        draftMessage={task.meg_edited_message ?? task.draft_message ?? ""}
        notes={task.meg_notes}
      />
    </div>
  );
}
