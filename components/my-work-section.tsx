import Link from "next/link";
import { diffDays, formatHireDayLabel } from "@/lib/dday";
import { DdayBadge, RequiredBadge } from "@/components/badges";
import { CompleteNowButton } from "@/components/complete-now-button";
import type { TaskWithPlan } from "@/lib/plan-progress";

type Group = {
  employeeId: string;
  employeeName: string;
  planId: string;
  hireDate: string | null;
  tasks: TaskWithPlan[];
};

function buildGroups({
  allTasks,
  nameById,
  employeeIdByPlan,
  planIdByEmployee,
  hireDateById,
  currentUserId,
  today,
}: {
  allTasks: TaskWithPlan[];
  nameById: Map<string, string>;
  employeeIdByPlan: Map<string, string>;
  planIdByEmployee: Map<string, string>;
  hireDateById: Map<string, string | null>;
  currentUserId: string;
  today: string;
}): Group[] {
  const myTasks = allTasks.filter(
    (t) => t.assignee_id === currentUserId && (t.status === "todo" || t.status === "rejected")
  );

  const byEmployee = new Map<string, TaskWithPlan[]>();
  for (const task of myTasks) {
    const employeeId = employeeIdByPlan.get(task.plan_id);
    if (!employeeId) continue;
    const list = byEmployee.get(employeeId);
    if (list) list.push(task);
    else byEmployee.set(employeeId, [task]);
  }

  const groups: Group[] = [];
  for (const [employeeId, tasks] of byEmployee) {
    const planId = planIdByEmployee.get(employeeId);
    if (!planId) continue;
    const sortedTasks = [...tasks].sort(
      (a, b) => diffDays(a.due_date, today) - diffDays(b.due_date, today)
    );
    groups.push({
      employeeId,
      employeeName: nameById.get(employeeId) ?? "",
      planId,
      hireDate: hireDateById.get(employeeId) ?? null,
      tasks: sortedTasks,
    });
  }

  groups.sort((a, b) => {
    const worstA = Math.min(...a.tasks.map((t) => diffDays(t.due_date, today)));
    const worstB = Math.min(...b.tasks.map((t) => diffDays(t.due_date, today)));
    return worstA - worstB;
  });

  return groups;
}

/** 사수·팀장·인사 화면 공통 "내가 할 일" 섹션. 담당 신입별로 묶어서 즉시완료 버튼과 함께 보여준다. */
export function MyWorkSection(props: {
  allTasks: TaskWithPlan[];
  nameById: Map<string, string>;
  employeeIdByPlan: Map<string, string>;
  planIdByEmployee: Map<string, string>;
  hireDateById: Map<string, string | null>;
  currentUserId: string;
  today: string;
}) {
  const groups = buildGroups(props);
  if (groups.length === 0) return null;

  const totalCount = groups.reduce((sum, g) => sum + g.tasks.length, 0);
  const { today } = props;

  return (
    <section className="mb-10">
      <h2
        className="mb-3"
        style={{
          fontSize: 15,
          lineHeight: "20px",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: "var(--text)",
        }}
      >
        내가 할 일 {totalCount}건
      </h2>
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.employeeId}>
            <Link
              href={`/plan/${group.planId}`}
              className="mb-2 inline-flex items-center gap-2 transition-colors duration-150 hover:text-[var(--text)]"
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                {group.employeeName}
              </span>
              {group.hireDate && (
                <span className="mono" style={{ fontSize: 13, color: "var(--text-faint)" }}>
                  {formatHireDayLabel(group.hireDate, today)}
                </span>
              )}
            </Link>
            <div
              className="flex flex-col gap-2 pl-4"
              style={{ borderLeft: "1px solid var(--border)" }}
            >
              {group.tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border p-4"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--border)",
                    borderLeft:
                      task.status === "rejected" ? "3px solid var(--st-overdue)" : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
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
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
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

                  {task.status === "rejected" && task.reject_reason && (
                    <p
                      className="mt-2"
                      style={{ fontSize: 13, lineHeight: "18px", color: "var(--st-overdue)" }}
                    >
                      반려 사유: {task.reject_reason}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-end">
                    <CompleteNowButton taskId={task.id} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
