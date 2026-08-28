import { DdayBadge, StatusBadge, RequiredBadge } from "@/components/badges";
import type { PlanTask } from "@/lib/types";

export function TaskCard({
  task,
  today,
  isMine,
  assigneeLabel,
  action,
  highlighted = false,
}: {
  task: PlanTask;
  today: string;
  isMine: boolean;
  /** isMine이 아닐 때 메타 우측에 보여줄 담당자 이름(또는 역할). */
  assigneeLabel: string | null;
  /** 메타 우측 액션 슬롯. 없으면 아무것도 렌더링하지 않는다. */
  action?: React.ReactNode;
  /** true면 지연 목록에서 점프해 온 직후라 카드 테두리가 파랗게 반짝인다. */
  highlighted?: boolean;
}) {
  const isDone = task.status === "done";
  const isRejected = task.status === "rejected";

  return (
    <div
      className={`rounded-lg border p-4 transition-colors duration-150 hover:bg-[var(--bg-subtle)] ${highlighted ? "highlight-flash" : ""}`}
      style={{
        background: isMine ? "var(--bg)" : "var(--bg-subtle)",
        borderColor: "var(--border)",
        borderLeft: isRejected ? "3px solid var(--st-overdue)" : undefined,
        outline: "2px solid transparent",
        outlineOffset: 2,
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
        {action}
      </div>
    </div>
  );
}
