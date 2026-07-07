import { normalizeAiBrief } from "@/lib/triage/ai-brief";
import { formatGBP, timeAgo } from "@/lib/triage/format";
import { taskTitle, type InboxTask } from "@/lib/triage/queries";

import { Chip, SectionLabel } from "../../_components/ui";
import { ConversationChips } from "./ConversationChips";
import { TaskActions } from "./TaskActions";

export function TaskCard({
  task,
  nextTaskId = null,
}: {
  task: InboxTask;
  nextTaskId?: string | null;
}) {
  const brief = normalizeAiBrief(task.ai_brief);
  const isProactive = task.source === "proactive";

  return (
    <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
      <ConversationChips requestType={task.request_type} conversationId={task.conversation_id} />
      <div className="mb-4 flex items-center justify-between">
        <Chip tone={isProactive ? "sage" : "neutral"}>{task.source ?? "task"}</Chip>
        {task.created_at ? (
          <span className="text-xs text-muted">{timeAgo(task.created_at)}</span>
        ) : null}
      </div>

      <h2 className="font-serif text-2xl">{taskTitle(task)}</h2>
      <SectionLabel className="mb-5 mt-1">{task.request_type}</SectionLabel>

      {task.raw_message ? (
        <div className="mb-5">
          <SectionLabel>Client&apos;s message</SectionLabel>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{task.raw_message}</p>
        </div>
      ) : null}

      <div className="mb-5 rounded-r-lg border-l-[3px] border-sage bg-canvas px-4 py-3">
        <SectionLabel>{isProactive ? "AI Spotted" : "Brief"}</SectionLabel>
        {task.request_summary ? (
          <p className="mt-1.5 text-[15px] leading-relaxed">{task.request_summary}</p>
        ) : null}
        {brief.facts.length ? (
          <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[13px]">
            {brief.facts.map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-faint">{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {brief.options.length ? (
        <div className="mb-5 overflow-hidden rounded-lg border border-hairline">
          <SectionLabel className="bg-inset px-4 py-2">Research findings</SectionLabel>
          {brief.options.map((o) => (
            <div
              key={o.name}
              className={`flex items-start gap-3 border-t border-hairline px-4 py-3 first:border-t-0 ${
                o.recommended ? "bg-canvas" : ""
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  o.recommended ? "bg-sage" : "bg-edge"
                }`}
              />
              <div className="flex-1">
                <div className="text-[15px] font-semibold">{o.name}</div>
                {o.summary ? <div className="text-xs text-muted">{o.summary}</div> : null}
                {o.why ? <div className="mt-0.5 text-xs text-muted">{o.why}</div> : null}
              </div>
              <div className="whitespace-nowrap text-right text-[15px] font-semibold">
                {typeof o.cost === "number" ? formatGBP(o.cost) : ""}
                {o.recommended ? (
                  <span className="mt-1 block">
                    <Chip tone="sage">Recommended</Chip>
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {brief.recommendationReasoning ? (
        <div className="mb-3 rounded-lg bg-canvas px-4 py-3">
          <SectionLabel>Recommendation</SectionLabel>
          <p className="mt-1 text-sm leading-relaxed">{brief.recommendationReasoning}</p>
        </div>
      ) : null}
      {brief.noteForMeg ? (
        <p className="mb-5 text-xs text-muted">Note for Meg: {brief.noteForMeg}</p>
      ) : null}

      {task.draft_message ? (
        <div className="rounded-lg border border-edge p-4">
          <div className="mb-2 flex items-center justify-between">
            <SectionLabel>Draft message</SectionLabel>
            {task.draft_channel ? <Chip tone="neutral">{task.draft_channel}</Chip> : null}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {task.meg_edited_message ?? task.draft_message}
          </p>
        </div>
      ) : null}

      <TaskActions
        key={task.id}
        taskId={task.id}
        nextTaskId={nextTaskId}
        draftMessage={task.meg_edited_message ?? task.draft_message ?? ""}
        notes={task.meg_notes}
      />
    </div>
  );
}
