import Link from "next/link";
import { formatHireDayLabel } from "@/lib/dday";
import { PendingTaskCard } from "@/components/pending-task-card";
import type { TaskWithPlan } from "@/lib/plan-progress";

type Group = {
  employeeId: string;
  employeeName: string;
  planId: string;
  hireDate: string | null;
  tasks: TaskWithPlan[];
  oldestRequestedAt: number;
};

function requestedAt(task: TaskWithPlan): number {
  return task.completed_at ? new Date(task.completed_at).getTime() : Infinity;
}

function buildGroups({
  allTasks,
  nameById,
  employeeIdByPlan,
  planIdByEmployee,
  hireDateById,
}: {
  allTasks: TaskWithPlan[];
  nameById: Map<string, string>;
  employeeIdByPlan: Map<string, string>;
  planIdByEmployee: Map<string, string>;
  hireDateById: Map<string, string | null>;
}): Group[] {
  const pendingTasks = allTasks.filter((t) => t.status === "pending");

  const byEmployee = new Map<string, TaskWithPlan[]>();
  for (const task of pendingTasks) {
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
    const sortedTasks = [...tasks].sort((a, b) => requestedAt(a) - requestedAt(b));
    groups.push({
      employeeId,
      employeeName: nameById.get(employeeId) ?? "",
      planId,
      hireDate: hireDateById.get(employeeId) ?? null,
      tasks: sortedTasks,
      oldestRequestedAt: Math.min(...tasks.map(requestedAt)),
    });
  }

  groups.sort((a, b) => a.oldestRequestedAt - b.oldestRequestedAt);
  return groups;
}

/** /team 전용 승인 대기 섹션. 담당 신입별로 묶어서 가장 오래 기다린 요청이 있는 신입부터 보여준다. */
export function TeamPendingSection(props: {
  allTasks: TaskWithPlan[];
  nameById: Map<string, string>;
  employeeIdByPlan: Map<string, string>;
  planIdByEmployee: Map<string, string>;
  hireDateById: Map<string, string | null>;
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
        승인 대기 {totalCount}건
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
                <PendingTaskCard
                  key={task.id}
                  task={task}
                  today={today}
                  menteeName={group.employeeName}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
