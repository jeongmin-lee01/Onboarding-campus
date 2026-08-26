import { createClient } from "@/lib/supabase/server";
import { getSeoulToday, diffDays } from "@/lib/dday";
import { MemberRow } from "@/components/member-row";
import { PendingTaskCard } from "./pending-task-card";
import type { PlanTask } from "@/lib/types";

export const dynamic = "force-dynamic";

type TaskWithPlan = PlanTask & { plan_id: string };

export default async function MentorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const today = getSeoulToday();

  const { data: mentees } = await supabase
    .from("profiles")
    .select("id, full_name, team_id")
    .eq("mentor_id", user.id)
    .order("full_name", { ascending: true });

  const menteeList = mentees ?? [];

  if (menteeList.length === 0) {
    return (
      <div className="mx-auto max-w-[880px] px-4 py-8 md:px-8">
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>담당 신입이 없습니다.</p>
      </div>
    );
  }

  const menteeIds = menteeList.map((m) => m.id);
  const teamIds = Array.from(
    new Set(menteeList.map((m) => m.team_id).filter((v): v is string => Boolean(v)))
  );

  const [{ data: teams }, { data: plans }] = await Promise.all([
    teamIds.length
      ? supabase.from("teams").select("id, name").in("id", teamIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from("plans").select("id, employee_id").in("employee_id", menteeIds),
  ]);

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const planList = plans ?? [];
  const planIdByEmployee = new Map(planList.map((p) => [p.employee_id, p.id]));
  const employeeIdByPlan = new Map(planList.map((p) => [p.id, p.employee_id]));
  const planIds = planList.map((p) => p.id);

  const { data: allTasks } = planIds.length
    ? await supabase
        .from("plan_tasks")
        .select(
          "id, plan_id, title, description, owner_role, assignee_id, due_date, phase, is_required, sort_order, status, reject_reason"
        )
        .in("plan_id", planIds)
        .order("due_date", { ascending: true })
    : { data: [] as TaskWithPlan[] };

  const tasks: TaskWithPlan[] = allTasks ?? [];

  const tasksByEmployee = new Map<string, TaskWithPlan[]>();
  for (const task of tasks) {
    const employeeId = employeeIdByPlan.get(task.plan_id);
    if (!employeeId) continue;
    const list = tasksByEmployee.get(employeeId);
    if (list) list.push(task);
    else tasksByEmployee.set(employeeId, [task]);
  }

  const nameById = new Map(menteeList.map((m) => [m.id, m.full_name]));
  const pendingTasks = tasks
    .filter((t) => t.status === "pending")
    .map((t) => ({
      task: t,
      menteeName: nameById.get(employeeIdByPlan.get(t.plan_id) ?? "") ?? "",
    }));

  return (
    <div className="mx-auto max-w-[880px] px-4 py-8 md:px-8">
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
          승인 대기
        </h2>
        {pendingTasks.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            승인을 기다리는 항목이 없습니다.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingTasks.map(({ task, menteeName }) => (
              <PendingTaskCard key={task.id} task={task} today={today} menteeName={menteeName} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2
          className="mb-1"
          style={{
            fontSize: 15,
            lineHeight: "20px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--text)",
          }}
        >
          담당 신입
        </h2>
        <div>
          {menteeList.map((mentee) => {
            const menteeTasks = tasksByEmployee.get(mentee.id) ?? [];
            const total = menteeTasks.length;
            const done = menteeTasks.filter((t) => t.status === "done").length;
            const overdueCount = menteeTasks.filter(
              (t) => t.status !== "done" && diffDays(t.due_date, today) < 0
            ).length;
            const planId = planIdByEmployee.get(mentee.id);
            if (!planId) return null;
            return (
              <MemberRow
                key={mentee.id}
                name={mentee.full_name}
                teamLabel={mentee.team_id ? (teamNameById.get(mentee.team_id) ?? "") : ""}
                planId={planId}
                done={done}
                total={total}
                overdueCount={overdueCount}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
