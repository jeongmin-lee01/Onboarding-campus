import { createClient } from "@/lib/supabase/server";
import { getSeoulToday } from "@/lib/dday";
import { fetchPlanTasksByEmployee, summarizeTasks } from "@/lib/plan-progress";
import { MemberRow } from "@/components/member-row";
import { MyWorkSection } from "@/components/my-work-section";

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
  let members: { id: string; full_name: string; hire_date: string | null }[] = [];

  if (teamId) {
    const [{ data: team }, { data: newbies }] = await Promise.all([
      supabase.from("teams").select("name").eq("id", teamId).maybeSingle(),
      supabase
        .from("profiles")
        .select("id, full_name, hire_date")
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
  const hireDateById = new Map(members.map((m) => [m.id, m.hire_date]));

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

      <MyWorkSection
        allTasks={allTasks}
        nameById={nameById}
        employeeIdByPlan={employeeIdByPlan}
        planIdByEmployee={planIdByEmployee}
        hireDateById={hireDateById}
        currentUserId={user.id}
        today={today}
      />

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
