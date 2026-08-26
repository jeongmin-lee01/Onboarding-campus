import { createClient } from "@/lib/supabase/server";
import { getSeoulToday } from "@/lib/dday";
import { fetchPlanTasksByEmployee, summarizeTasks } from "@/lib/plan-progress";
import { MemberRow } from "@/components/member-row";
import { MyTaskCard } from "@/components/my-task-card";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const today = getSeoulToday();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", user.id)
    .maybeSingle();

  const teamId = myProfile?.team_id;

  let teamName = "";
  let members: { id: string; full_name: string }[] = [];

  if (teamId) {
    const [{ data: team }, { data: newbies }] = await Promise.all([
      supabase.from("teams").select("name").eq("id", teamId).maybeSingle(),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("team_id", teamId)
        .eq("role", "newbie")
        .order("full_name", { ascending: true }),
    ]);
    teamName = team?.name ?? "";
    members = newbies ?? [];
  }

  const memberIds = members.map((m) => m.id);
  const { planIdByEmployee, employeeIdByPlan, tasksByEmployee, allTasks } =
    await fetchPlanTasksByEmployee(supabase, memberIds);

  const nameById = new Map(members.map((m) => [m.id, m.full_name]));
  const myTasks = allTasks
    .filter((t) => t.assignee_id === user.id && (t.status === "todo" || t.status === "rejected"))
    .map((task) => ({
      task,
      menteeName: nameById.get(employeeIdByPlan.get(task.plan_id) ?? "") ?? "",
    }));

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 md:px-8">
      <h1
        className="mb-6"
        style={{
          fontSize: 24,
          lineHeight: "32px",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--text)",
        }}
      >
        팀 진행 현황
      </h1>

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
          내가 처리할 항목
        </h2>
        {myTasks.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            내가 처리할 항목이 없습니다.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {myTasks.map(({ task, menteeName }) => (
              <MyTaskCard key={task.id} task={task} today={today} menteeName={menteeName} />
            ))}
          </div>
        )}
      </section>

      {members.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          등록된 신입사원이 없습니다.
        </p>
      ) : (
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
                teamLabel={teamName}
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
      )}
    </div>
  );
}
