"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DdayBadge, RequiredBadge } from "@/components/badges";
import { approveTask } from "@/lib/actions/plan-tasks";
import { RejectDialog } from "./reject-dialog";
import type { PlanTask } from "@/lib/types";

export function PendingTaskCard({
  task,
  today,
  menteeName,
}: {
  task: PlanTask;
  today: string;
  menteeName: string;
}) {
  const [isApproving, startApprove] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
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

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button type="button" variant="danger" size="sm" onClick={() => setRejectOpen(true)}>
          반려
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isApproving}
          onClick={() => startApprove(async () => { await approveTask(task.id); })}
        >
          {isApproving && <Loader2 className="animate-spin" />}
          승인
        </Button>
      </div>

      <RejectDialog taskId={task.id} open={rejectOpen} onOpenChange={setRejectOpen} />
    </div>
  );
}
