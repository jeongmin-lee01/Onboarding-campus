import { createClient } from "@/lib/supabase/server";
import { getSeoulToday } from "@/lib/dday";
import { fetchPlanTasksByEmployee, summarizeTasks } from "@/lib/plan-progress";
import { MemberRow } from "@/components/member-row";
import { PendingTaskCard } from "@/components/pending-task-card";
import { MyWorkSection } from "@/components/my-work-section";

export const dynamic = "force-dynamic";

export default async function MentorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const today = getSeoulToday();

  const { data: mentees } = await supabase
    .from("profiles")
    .select("id, full_name, team_id, hire_date")
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

  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name").in("id", teamIds)
    : { data: [] as { id: string; name: string }[] };
  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const { planIdByEmployee, employeeIdByPlan, tasksByEmployee, allTasks } =
    await fetchPlanTasksByEmployee(supabase, menteeIds);

  const nameById = new Map(menteeList.map((m) => [m.id, m.full_name]));
  const hireDateById = new Map(menteeList.map((m) => [m.id, m.hire_date]));
  const pendingTasks = allTasks
    .filter((t) => t.status === "pending")
    .map((task) => ({
      task,
      menteeName: nameById.get(employeeIdByPlan.get(task.plan_id) ?? "") ?? "",
    }));

  return (
    <div className="mx-auto max-w-[880px] px-4 py-8 md:px-8">
      <MyWorkSection
        allTasks={allTasks}
        nameById={nameById}
        employeeIdByPlan={employeeIdByPlan}
        planIdByEmployee={planIdByEmployee}
        hireDateById={hireDateById}
        currentUserId={user.id}
        today={today}
      />

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
        <div className="overflow-x-auto">
          {menteeList.map((mentee) => {
            const tasks = tasksByEmployee.get(mentee.id) ?? [];
            const { total, done, overdueCount, worstTask } = summarizeTasks(tasks, today);
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
                worstTask={worstTask}
                today={today}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
