import { normalizeAiBrief } from "@/lib/triage/ai-brief";
import { formatGBP, timeAgo } from "@/lib/triage/format";
import { taskTitle, type InboxTask } from "@/lib/triage/queries";

import { TaskActions } from "./TaskActions";

const LABEL = "text-[10px] tracking-[0.14em] uppercase text-[#A39E94]";

export function TaskCard({ task }: { task: InboxTask }) {
  const brief = normalizeAiBrief(task.ai_brief);
  const isProactive = task.source === "proactive";

  return (
    <div className="rounded-xl border border-[#E4DFD6] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.12em] ${
            isProactive
              ? "bg-[#A8B2A1] text-[#1F1F1F]"
              : "border border-[#C9C2B5] text-[#6B665D]"
          }`}
        >
          {(task.source ?? "").toUpperCase()}
        </span>
        {task.created_at ? (
          <span className="font-serif text-sm italic text-[#A39E94]">
            {timeAgo(task.created_at)}
          </span>
        ) : null}
      </div>

      <h2 className="font-serif text-2xl">{taskTitle(task)}</h2>
      <p className={`${LABEL} mt-1 mb-5`}>{task.request_type}</p>

      {task.raw_message ? (
        <div className="mb-5">
          <div className={LABEL}>Client&apos;s message</div>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[#3A372F]">{task.raw_message}</p>
        </div>
      ) : null}

      <div className="mb-5 rounded-r-lg border-l-[3px] border-[#A8B2A1] bg-[#F7F5F2] px-4 py-3">
        <div className={LABEL}>{isProactive ? "AI Spotted" : "Brief"}</div>
        {task.request_summary ? (
          <p className="mt-1.5 text-[15px] leading-relaxed">{task.request_summary}</p>
        ) : null}
        {brief.facts.length ? (
          <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[13px]">
            {brief.facts.map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-[#A39E94]">{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {brief.options.length ? (
        <div className="mb-5 overflow-hidden rounded-lg border border-[#E7E2D9]">
          <div className={`${LABEL} bg-[#F2EEE7] px-4 py-2`}>Research findings</div>
          {brief.options.map((o) => (
            <div
              key={o.name}
              className={`flex items-start gap-3 border-t border-[#EFEAE2] px-4 py-3 first:border-t-0 ${
                o.recommended ? "bg-[#FBFAF7]" : ""
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  o.recommended ? "bg-[#A8B2A1]" : "bg-[#D8D2C8]"
                }`}
              />
              <div className="flex-1">
                <div className="text-[15px] font-semibold">{o.name}</div>
                {o.summary ? <div className="text-[12.5px] text-[#8A857B]">{o.summary}</div> : null}
                {o.why ? <div className="mt-0.5 text-[11px] italic text-[#A8B2A1]">{o.why}</div> : null}
              </div>
              <div className="whitespace-nowrap text-right text-[15px] font-semibold">
                {typeof o.cost === "number" ? formatGBP(o.cost) : ""}
                {o.recommended ? (
                  <span className="block text-[9px] font-semibold text-[#A8B2A1]">Recommended</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {brief.recommendationReasoning ? (
        <div className="mb-3 rounded-lg bg-[#F7F5F2] px-4 py-3">
          <div className={LABEL}>Recommendation</div>
          <p className="mt-1 text-[14px] leading-relaxed">{brief.recommendationReasoning}</p>
        </div>
      ) : null}
      {brief.noteForMeg ? (
        <p className="mb-5 text-[12.5px] italic text-[#8A857B]">Note for Meg: {brief.noteForMeg}</p>
      ) : null}

      {task.draft_message ? (
        <div className="rounded-lg border border-[#E4DFD6] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className={LABEL}>Draft message</span>
            {task.draft_channel ? (
              <span className="rounded-full border border-[#C9C2B5] px-2.5 py-0.5 text-[10px] text-[#6B665D]">
                {task.draft_channel}
              </span>
            ) : null}
          </div>
          <p className="font-mono text-[13px] leading-relaxed text-[#3A372F] whitespace-pre-wrap">
            {task.meg_edited_message ?? task.draft_message}
          </p>
          <div className="mt-2 text-right text-[11px] text-[#B7B1A6]">
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
