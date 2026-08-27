import { diffDays } from "@/lib/dday";
import type { createClient } from "@/lib/supabase/server";
import type { PlanTask } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type TaskWithPlan = PlanTask & { plan_id: string };

/** 여러 명(employeeIds)의 plans/plan_tasks를 한 번에 불러와 사람별로 묶는다. /mentor, /team, /admin에서 공용으로 쓴다. */
export async function fetchPlanTasksByEmployee(
  supabase: SupabaseServerClient,
  employeeIds: string[]
) {
  const planIdByEmployee = new Map<string, string>();
  const employeeIdByPlan = new Map<string, string>();
  const tasksByEmployee = new Map<string, TaskWithPlan[]>();

  if (employeeIds.length === 0) {
    return { planIdByEmployee, employeeIdByPlan, tasksByEmployee, allTasks: [] as TaskWithPlan[] };
  }

  const { data: plans } = await supabase
    .from("plans")
    .select("id, employee_id")
    .in("employee_id", employeeIds);

  const planList = plans ?? [];
  for (const p of planList) {
    planIdByEmployee.set(p.employee_id, p.id);
    employeeIdByPlan.set(p.id, p.employee_id);
  }

  const planIds = planList.map((p) => p.id);
  const { data: allTasksData } = planIds.length
    ? await supabase
        .from("plan_tasks")
        .select(
          "id, plan_id, title, description, owner_role, assignee_id, due_date, phase, is_required, sort_order, status, reject_reason, completed_at"
        )
        .in("plan_id", planIds)
        .order("due_date", { ascending: true })
    : { data: [] as TaskWithPlan[] };

  const allTasks: TaskWithPlan[] = allTasksData ?? [];

  for (const task of allTasks) {
    const employeeId = employeeIdByPlan.get(task.plan_id);
    if (!employeeId) continue;
    const list = tasksByEmployee.get(employeeId);
    if (list) list.push(task);
    else tasksByEmployee.set(employeeId, [task]);
  }

  return { planIdByEmployee, employeeIdByPlan, tasksByEmployee, allTasks };
}

/** 한 사람의 태스크 목록에서 진행률/지연 건수/가장 급한 태스크를 계산한다. plan_id 없이도 쓸 수 있게 PlanTask 기준으로 받는다. */
export function summarizeTasks(tasks: PlanTask[], today: string) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const nonDone = tasks.filter((t) => t.status !== "done");
  const overdueCount = nonDone.filter((t) => diffDays(t.due_date, today) < 0).length;

  const worstTask = nonDone.length
    ? nonDone.reduce((worst, t) =>
        diffDays(t.due_date, today) < diffDays(worst.due_date, today) ? t : worst
      )
    : null;

  return { total, done, overdueCount, worstTask };
}
