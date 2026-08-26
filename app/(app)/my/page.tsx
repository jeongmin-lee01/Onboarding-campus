import { createClient } from "@/lib/supabase/server";
import { getSeoulToday } from "@/lib/dday";
import { ROLE_LABEL } from "@/lib/roles";
import { Checklist } from "./checklist";
import type { PlanTask } from "./types";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("employee_id", user.id)
    .maybeSingle();

  let tasks: PlanTask[] = [];
  if (plan) {
    const { data } = await supabase
      .from("plan_tasks")
      .select(
        "id, title, description, owner_role, assignee_id, due_date, phase, is_required, sort_order, status, reject_reason"
      )
      .eq("plan_id", plan.id)
      .order("due_date", { ascending: true });
    tasks = data ?? [];
  }

  const otherAssigneeIds = Array.from(
    new Set(
      tasks
        .filter((t) => t.assignee_id && t.assignee_id !== user.id)
        .map((t) => t.assignee_id as string)
    )
  );

  const nameById = new Map<string, string>();
  if (otherAssigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", otherAssigneeIds);
    for (const p of profiles ?? []) nameById.set(p.id, p.full_name);
  }

  const assigneeLabels: Record<string, string> = {};
  for (const task of tasks) {
    if (!task.assignee_id || task.assignee_id === user.id) continue;
    assigneeLabels[task.id] =
      nameById.get(task.assignee_id) ??
      `${ROLE_LABEL[task.owner_role] ?? task.owner_role} 담당`;
  }

  return (
    <div className="mx-auto max-w-[880px] px-4 py-8 md:px-8">
      <Checklist
        tasks={tasks}
        currentUserId={user.id}
        assigneeLabels={assigneeLabels}
        initialToday={getSeoulToday()}
      />
    </div>
  );
}
