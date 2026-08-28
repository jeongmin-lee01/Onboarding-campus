import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSeoulToday } from "@/lib/dday";
import { fetchPlanTasksByEmployee, summarizeTasks } from "@/lib/plan-progress";
import { MemberRow } from "@/components/member-row";
import { ProgressBar } from "@/components/progress-bar";
import { PendingTaskCard } from "@/components/pending-task-card";
import { MyWorkSection } from "@/components/my-work-section";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const today = getSeoulToday();

  const { data: newbies } = await supabase
    .from("profiles")
    .select("id, full_name, team_id, hire_date")
    .eq("role", "newbie")
    .order("full_name", { ascending: true });

  const members = newbies ?? [];

  if (members.length === 0) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1
            style={{
              fontSize: 24,
              lineHeight: "32px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            전사 대시보드
          </h1>
          <Button nativeButton={false} render={<Link href="/admin/new" />}>신입 등록</Button>
        </div>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          등록된 신입사원이 없습니다. 신입 등록에서 추가할 수 있습니다.
        </p>
      </div>
    );
  }

  const teamIds = Array.from(
    new Set(members.map((m) => m.team_id).filter((v): v is string => Boolean(v)))
  );
  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name").in("id", teamIds)
    : { data: [] as { id: string; name: string }[] };
  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const memberIds = members.map((m) => m.id);
  const { planIdByEmployee, employeeIdByPlan, tasksByEmployee, allTasks } =
    await fetchPlanTasksByEmployee(supabase, memberIds);

  const overallTotal = allTasks.length;
  const overallDone = allTasks.filter((t) => t.status === "done").length;

  const nameById = new Map(members.map((m) => [m.id, m.full_name]));
  const hireDateById = new Map(members.map((m) => [m.id, m.hire_date]));
  const pendingTasks = allTasks
    .filter((t) => t.status === "pending")
    .map((task) => ({
      task,
      menteeName: nameById.get(employeeIdByPlan.get(task.plan_id) ?? "") ?? "",
    }));

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <h1
          style={{
            fontSize: 24,
            lineHeight: "32px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          전사 대시보드
        </h1>
        <Button nativeButton={false} render={<Link href="/admin/new" />}>신입 등록</Button>
      </div>

      <div className="mt-6">
        <MyWorkSection
          allTasks={allTasks}
          nameById={nameById}
          employeeIdByPlan={employeeIdByPlan}
          planIdByEmployee={planIdByEmployee}
          hireDateById={hireDateById}
          currentUserId={user.id}
          today={today}
        />
      </div>

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
          전사 현황
        </h2>

        <div className="mb-8 flex items-center gap-3">
          <ProgressBar done={overallDone} total={overallTotal} className="flex-1" />
          <span className="mono shrink-0" style={{ fontSize: 13, color: "var(--text-muted)" }}>
            전사 {overallDone}/{overallTotal}
          </span>
        </div>

        <div className="overflow-x-auto">
          {members.map((m) => {
            const tasks = tasksByEmployee.get(m.id) ?? [];
            const { total, done, overdueCount, worstTask } = summarizeTasks(tasks, today);
            const planId = planIdByEmployee.get(m.id);
            if (!planId) return null;
            return (
              <MemberRow
                key={m.id}
                name={m.full_name}
                teamLabel={m.team_id ? (teamNameById.get(m.team_id) ?? "") : ""}
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
