"use client";

import { useEffect, useState } from "react";
import {
  diffDays,
  formatSeoulDateLabel,
  getSeoulToday,
  msUntilNextSeoulMidnight,
  PHASE_LABEL,
  PHASE_ORDER,
  type Phase,
} from "@/lib/dday";
import { TaskCard } from "@/components/task-card";
import { CompleteRequestButton } from "@/components/complete-request-button";
import type { PlanTask } from "@/lib/types";

type Row =
  | { type: "phase"; phase: Phase }
  | { type: "task"; task: PlanTask }
  | { type: "today" };

function buildRows(tasksByPhase: Record<string, PlanTask[]>, today: string): Row[] {
  const flatOrdered = PHASE_ORDER.flatMap((phase) => tasksByPhase[phase] ?? []);
  const firstFutureIdx = flatOrdered.findIndex((t) => diffDays(t.due_date, today) >= 0);

  const rows: Row[] = [];
  let taskCounter = 0;
  let todayInserted = false;

  for (const phase of PHASE_ORDER) {
    const tasks = tasksByPhase[phase];
    if (!tasks || tasks.length === 0) continue;
    rows.push({ type: "phase", phase });
    for (const task of tasks) {
      if (!todayInserted && taskCounter === firstFutureIdx) {
        rows.push({ type: "today" });
        todayInserted = true;
      }
      rows.push({ type: "task", task });
      taskCounter++;
    }
  }
  if (!todayInserted) rows.push({ type: "today" });

  return rows;
}

function TodayDivider({ today }: { today: string }) {
  return (
    <div className="flex items-center gap-3 pt-1 pb-4">
      <div className="h-px flex-1" style={{ background: "var(--text)" }} />
      <span
        className="mono shrink-0"
        style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}
      >
        오늘 ({formatSeoulDateLabel(today)})
      </span>
    </div>
  );
}

function RailGutter({ node }: { node?: "done" | "pending" }) {
  return (
    <div className="relative w-6 shrink-0 md:w-8">
      <div
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
        style={{ background: "var(--border)" }}
      />
      {node && (
        <div
          className="absolute top-[23px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full"
          style={
            node === "done"
              ? { background: "var(--st-done)" }
              : { background: "var(--bg)", border: "1px solid var(--border-strong)" }
          }
        />
      )}
    </div>
  );
}

export function Checklist({
  tasks,
  currentUserId,
  assigneeLabels,
  initialToday,
  readOnly = false,
}: {
  tasks: PlanTask[];
  currentUserId: string;
  /** task.id -> 메타 우측에 보여줄 담당자 텍스트. readOnly일 때는 모든 태스크에 대해 채워줘야 한다. */
  assigneeLabels: Record<string, string>;
  initialToday: string;
  /** true면 완료 요청 버튼을 렌더링하지 않는다 (사수/팀장/인사 등 제3자 조회용). */
  readOnly?: boolean;
}) {
  const [today, setToday] = useState(initialToday);

  useEffect(() => {
    const timer = setTimeout(() => {
      setToday(getSeoulToday());
    }, msUntilNextSeoulMidnight());
    return () => clearTimeout(timer);
  }, [today]);

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const todayCount = tasks.filter(
    (t) => t.status !== "done" && diffDays(t.due_date, today) === 0
  ).length;
  const overdueCount = tasks.filter(
    (t) => t.status !== "done" && diffDays(t.due_date, today) < 0
  ).length;

  if (total === 0) {
    return (
      <div className="py-12 text-center">
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>
          오늘 예정된 항목이 없습니다.
        </p>
      </div>
    );
  }

  const tasksByPhase: Record<string, PlanTask[]> = {};
  for (const task of tasks) {
    (tasksByPhase[task.phase] ??= []).push(task);
  }
  const rows = buildRows(tasksByPhase, today);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden"
            style={{ background: "var(--bg-sunken)", borderRadius: 999 }}
          >
            <div
              className="h-full"
              style={{
                width: total ? `${(doneCount / total) * 100}%` : "0%",
                background: "var(--accent)",
                borderRadius: 999,
              }}
            />
          </div>
          <span className="mono shrink-0" style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {doneCount}/{total}
          </span>
        </div>
        <div className="mt-2 flex gap-4">
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            오늘 할 일 {todayCount}건
          </span>
          {overdueCount > 0 && (
            <span style={{ fontSize: 13, color: "var(--st-overdue)" }}>
              지연 {overdueCount}건
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        {rows.map((row, i) => {
          if (row.type === "today") {
            return <TodayDivider key={`today-${i}`} today={today} />;
          }
          if (row.type === "phase") {
            return (
              <div key={`phase-${row.phase}`} className="flex gap-3 pb-2">
                <RailGutter />
                <div
                  className="flex-1 pt-2"
                  style={{
                    fontSize: 15,
                    lineHeight: "20px",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: "var(--text)",
                  }}
                >
                  {PHASE_LABEL[row.phase]}
                </div>
              </div>
            );
          }
          const task = row.task;
          const isMine = !readOnly && task.assignee_id === currentUserId;
          const canRequest = isMine && (task.status === "todo" || task.status === "rejected");
          return (
            <div key={task.id} className="flex gap-3 pb-3">
              <RailGutter node={task.status === "done" ? "done" : "pending"} />
              <div className="flex-1">
                <TaskCard
                  task={task}
                  today={today}
                  isMine={isMine}
                  assigneeLabel={assigneeLabels[task.id] ?? null}
                  action={canRequest ? <CompleteRequestButton taskId={task.id} /> : undefined}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
