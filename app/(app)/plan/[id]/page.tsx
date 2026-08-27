import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSeoulToday } from "@/lib/dday";
import { ROLE_LABEL } from "@/lib/roles";
import { Checklist } from "@/components/checklist";
import type { PlanTask } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: viewer } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const allowRevert = viewer?.role === "hr";

  const { data: plan } = await supabase
    .from("plans")
    .select("id, employee_id")
    .eq("id", id)
    .maybeSingle();

  if (!plan) notFound();

  const { data: employee } = await supabase
    .from("profiles")
    .select("full_name, team_id")
    .eq("id", plan.employee_id)
    .maybeSingle();

  if (!employee) notFound();

  let teamName = "";
  if (employee.team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("id", employee.team_id)
      .maybeSingle();
    teamName = team?.name ?? "";
  }

  const { data } = await supabase
    .from("plan_tasks")
    .select(
      "id, title, description, owner_role, assignee_id, due_date, phase, is_required, sort_order, status, reject_reason, completed_at"
    )
    .eq("plan_id", plan.id)
    .order("due_date", { ascending: true });
  const tasks: PlanTask[] = data ?? [];

  const assigneeIds = Array.from(
    new Set(tasks.filter((t) => t.assignee_id).map((t) => t.assignee_id as string))
  );

  const nameById = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", assigneeIds);
    for (const p of profiles ?? []) nameById.set(p.id, p.full_name);
  }

  const assigneeLabels: Record<string, string> = {};
  for (const task of tasks) {
    if (!task.assignee_id) continue;
    assigneeLabels[task.id] =
      task.assignee_id === plan.employee_id
        ? employee.full_name
        : (nameById.get(task.assignee_id) ??
          `${ROLE_LABEL[task.owner_role] ?? task.owner_role} 담당`);
  }

  return (
    <div className="mx-auto max-w-[880px] px-4 py-8 md:px-8">
      <div className="mb-6">
        <h1
          style={{
            fontSize: 24,
            lineHeight: "32px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          {employee.full_name}
        </h1>
        {teamName && (
          <p className="mt-1" style={{ fontSize: 14, color: "var(--text-muted)" }}>
            {teamName}
          </p>
        )}
      </div>
      <Checklist
        tasks={tasks}
        currentUserId={user.id}
        assigneeLabels={assigneeLabels}
        initialToday={getSeoulToday()}
        readOnly
        allowRevert={allowRevert}
        viewerRole={viewer?.role ?? ""}
      />
    </div>
  );
}
