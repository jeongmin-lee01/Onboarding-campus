import { DdayBadge, RequiredBadge } from "@/components/badges";
import { CompleteRequestButton } from "@/components/complete-request-button";
import type { PlanTask } from "@/lib/types";

export function MyTaskCard({
  task,
  today,
  menteeName,
}: {
  task: PlanTask;
  today: string;
  menteeName: string;
}) {
  const isRejected = task.status === "rejected";

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        background: "var(--bg)",
        borderColor: "var(--border)",
        borderLeft: isRejected ? "3px solid var(--st-overdue)" : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p style={{ fontSize: 13, lineHeight: "18px", color: "var(--text-faint)" }}>
            {menteeName}
          </p>
          <h3
            style={{
              fontSize: 15,
              lineHeight: "22px",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "var(--text)",
            }}
          >
            {task.title}
          </h3>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <DdayBadge dueDate={task.due_date} status={task.status} today={today} />
          {task.is_required && <RequiredBadge />}
        </div>
      </div>

      {task.description && (
        <p className="mt-1" style={{ fontSize: 14, lineHeight: "22px", color: "var(--text-muted)" }}>
          {task.description}
        </p>
      )}

      {isRejected && task.reject_reason && (
        <p className="mt-2" style={{ fontSize: 13, lineHeight: "18px", color: "var(--st-overdue)" }}>
          반려 사유: {task.reject_reason}
        </p>
      )}

      <div className="mt-3 flex items-center justify-end">
        <CompleteRequestButton taskId={task.id} />
      </div>
    </div>
  );
}
