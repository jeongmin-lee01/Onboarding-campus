import {
  diffDays,
  formatDday,
  getDdayTone,
  TONE_COLOR,
  STATUS_TONE_COLOR,
  STATUS_LABEL,
} from "@/lib/dday";
import { CompleteRequestButton } from "./complete-request-button";
import type { PlanTask } from "./types";

function DdayBadge({ dueDate, status, today }: { dueDate: string; status: string; today: string }) {
  const diff = diffDays(dueDate, today);
  const tone = getDdayTone(diff, status);
  const { fg, bg } = TONE_COLOR[tone];
  const label = formatDday(diff);

  return (
    <span
      className="mono shrink-0 rounded-sm px-2 py-0.5"
      style={{
        fontSize: 12,
        fontWeight: label === "D-Day" ? 600 : 500,
        color: fg,
        background: bg,
      }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { fg, bg } = STATUS_TONE_COLOR[status] ?? STATUS_TONE_COLOR.todo;
  return (
    <span
      className="shrink-0 rounded-sm px-2 py-0.5"
      style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.01em", color: fg, background: bg }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function RequiredBadge() {
  return (
    <span
      className="shrink-0 rounded-sm px-2 py-0.5"
      style={{
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.01em",
        color: "var(--text-muted)",
        background: "var(--bg-sunken)",
      }}
    >
      필수
    </span>
  );
}

export function TaskCard({
  task,
  today,
  isMine,
  assigneeLabel,
}: {
  task: PlanTask;
  today: string;
  isMine: boolean;
  /** 본인 담당이 아닐 때 메타 우측에 보여줄 담당자 이름(또는 역할). */
  assigneeLabel: string | null;
}) {
  const isDone = task.status === "done";
  const isRejected = task.status === "rejected";
  const canRequest = isMine && (task.status === "todo" || task.status === "rejected");

  return (
    <div
      className="rounded-lg border p-4 transition-colors duration-150 hover:bg-[var(--bg-subtle)]"
      style={{
        background: isMine ? "var(--bg)" : "var(--bg-subtle)",
        borderColor: "var(--border)",
        borderLeft: isRejected ? "3px solid var(--st-overdue)" : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          style={{
            fontSize: 15,
            lineHeight: "22px",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: isDone ? "var(--text-muted)" : "var(--text)",
          }}
        >
          {task.title}
        </h3>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {task.status !== "todo" && <StatusBadge status={task.status} />}
          <DdayBadge dueDate={task.due_date} status={task.status} today={today} />
          {task.is_required && <RequiredBadge />}
        </div>
      </div>

      {task.description && (
        <p
          className="mt-1"
          style={{ fontSize: 14, lineHeight: "22px", color: "var(--text-muted)" }}
        >
          {task.description}
        </p>
      )}

      {isRejected && task.reject_reason && (
        <p className="mt-2" style={{ fontSize: 13, lineHeight: "18px", color: "var(--st-overdue)" }}>
          반려 사유: {task.reject_reason}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span style={{ fontSize: 13, lineHeight: "18px", color: "var(--text-faint)" }}>
          {isMine ? "내 담당" : assigneeLabel}
        </span>
        {canRequest && <CompleteRequestButton taskId={task.id} />}
      </div>
    </div>
  );
}
