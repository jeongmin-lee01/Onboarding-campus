"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { diffDays, phaseFromOffset } from "@/lib/dday";

export async function requestCompletion(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const { error } = await supabase
    .from("plan_tasks")
    .update({ status: "pending", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("assignee_id", user.id);

  if (error) {
    return { error: "완료 요청에 실패했습니다." };
  }

  revalidatePath("/my");
  revalidatePath("/mentor");
  revalidatePath("/admin");
  revalidatePath("/team");
  return { error: null };
}

export async function approveTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const { error } = await supabase
    .from("plan_tasks")
    .update({ status: "done", approved_by: user.id, approved_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("status", "pending");

  if (error) {
    return { error: "승인에 실패했습니다." };
  }

  revalidatePath("/mentor");
  revalidatePath("/team");
  revalidatePath("/admin");
  return { error: null };
}

export async function rejectTask(taskId: string, reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) {
    return { error: "반려 사유를 입력해야 합니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const { error } = await supabase
    .from("plan_tasks")
    .update({ status: "rejected", reject_reason: trimmed })
    .eq("id", taskId)
    .eq("status", "pending");

  if (error) {
    return { error: "반려 처리에 실패했습니다." };
  }

  revalidatePath("/mentor");
  revalidatePath("/team");
  revalidatePath("/admin");
  return { error: null };
}

/** 사수/팀장/인사담당자가 자기 담당 태스크를 승인 단계 없이 바로 완료 처리한다. 신입 완료요청→승인 흐름과는 별개다. */
export async function completeTaskDirectly(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "newbie") {
    return { error: "권한이 없습니다." };
  }

  const { data, error } = await supabase
    .from("plan_tasks")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("assignee_id", user.id)
    .neq("status", "done")
    .select("plan_id")
    .single();

  if (error || !data) {
    return { error: "완료 처리에 실패했습니다." };
  }

  revalidatePath(`/plan/${data.plan_id}`);
  revalidatePath("/mentor");
  revalidatePath("/team");
  revalidatePath("/admin");
  return { error: null };
}

/**
 * 사수/팀장/인사담당자가 담당 플랜에 태스크를 수동으로 추가한다.
 * template_tasks는 건드리지 않는다 — 이 플랜 하나에만 plan_task를 새로 만든다.
 * phase는 offset(마감일 - 플랜 시작일)로 자동 계산하고, sort_order는 같은 phase의 마지막 값 + 1을 쓴다.
 */
export async function addPlanTask(
  planId: string,
  input: { title: string; description: string; dueDate: string; ownerRole: string }
) {
  const title = input.title.trim();
  if (!title) return { error: "제목을 입력해야 합니다." };
  if (!input.dueDate) return { error: "마감일을 입력해야 합니다." };
  if (!["newbie", "mentor", "hr"].includes(input.ownerRole)) {
    return { error: "담당자를 선택해야 합니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { data: actor } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!actor || !["mentor", "leader", "hr"].includes(actor.role)) {
    return { error: "권한이 없습니다." };
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("id, employee_id, start_date")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) return { error: "온보딩 일정을 찾을 수 없습니다." };

  let assigneeId: string | null = null;
  if (input.ownerRole === "newbie") {
    assigneeId = plan.employee_id;
  } else if (input.ownerRole === "mentor") {
    const { data: employee } = await supabase
      .from("profiles")
      .select("mentor_id")
      .eq("id", plan.employee_id)
      .maybeSingle();
    assigneeId = employee?.mentor_id ?? null;
  } else {
    // hr: 이 플랜에 이미 있는 인사담당자 담당 태스크의 담당자를 그대로 재사용한다.
    const { data: hrTask } = await supabase
      .from("plan_tasks")
      .select("assignee_id")
      .eq("plan_id", planId)
      .eq("owner_role", "hr")
      .not("assignee_id", "is", null)
      .limit(1)
      .maybeSingle();
    assigneeId = hrTask?.assignee_id ?? null;
  }

  const phase = phaseFromOffset(diffDays(input.dueDate, plan.start_date));

  const { data: lastTask } = await supabase
    .from("plan_tasks")
    .select("sort_order")
    .eq("plan_id", planId)
    .eq("phase", phase)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (lastTask?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("plan_tasks").insert({
    plan_id: planId,
    title,
    description: input.description.trim() || null,
    owner_role: input.ownerRole,
    assignee_id: assigneeId,
    due_date: input.dueDate,
    phase,
    is_required: false,
    sort_order: sortOrder,
    status: "todo",
  });
  if (error) return { error: "태스크 추가에 실패했습니다." };

  revalidatePath(`/plan/${planId}`);
  revalidatePath("/mentor");
  revalidatePath("/team");
  revalidatePath("/admin");
  return { error: null };
}

/**
 * 사수/팀장/인사담당자가 마감일만 바꾼다. 제목·설명은 이번 범위에서 제외.
 * done 상태는 여기서 막는다 — plan_tasks_update_* RLS는 상태를 구분하지 않고 열려 있어서
 * (인사담당자의 done→rejected 되돌리기 기능이 그 위에서 동작하기 때문에) 여기서 애플리케이션
 * 단에서 막아야 한다. newbie도 같은 이유로 여기서 막는다 — 신입 본인 태스크에 대한 update RLS는
 * 완료 요청(status 변경)용으로 열려 있을 뿐 컬럼을 제한하지 않는다.
 */
export async function updatePlanTaskDueDate(taskId: string, dueDate: string) {
  if (!dueDate) return { error: "마감일을 입력해야 합니다." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { data: actor } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!actor || !["mentor", "leader", "hr"].includes(actor.role)) {
    return { error: "권한이 없습니다." };
  }

  const { data: task } = await supabase
    .from("plan_tasks")
    .select("plan_id, status")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: "태스크를 찾을 수 없습니다." };
  if (task.status === "done") return { error: "완료된 태스크는 수정할 수 없습니다." };

  const { data: plan } = await supabase
    .from("plans")
    .select("start_date")
    .eq("id", task.plan_id)
    .maybeSingle();
  if (!plan) return { error: "온보딩 일정을 찾을 수 없습니다." };

  const phase = phaseFromOffset(diffDays(dueDate, plan.start_date));

  const { data, error } = await supabase
    .from("plan_tasks")
    .update({ due_date: dueDate, phase })
    .eq("id", taskId)
    .neq("status", "done")
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "마감일 수정에 실패했습니다." };

  revalidatePath(`/plan/${task.plan_id}`);
  revalidatePath("/mentor");
  revalidatePath("/team");
  revalidatePath("/admin");
  revalidatePath("/my");
  return { error: null };
}

export async function revertTask(taskId: string, reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) {
    return { error: "되돌리기 사유를 입력해야 합니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const { data, error } = await supabase
    .from("plan_tasks")
    .update({
      status: "rejected",
      reject_reason: trimmed,
      approved_by: null,
      approved_at: null,
    })
    .eq("id", taskId)
    .eq("status", "done")
    .select("plan_id")
    .single();

  if (error || !data) {
    return { error: "되돌리기에 실패했습니다." };
  }

  revalidatePath(`/plan/${data.plan_id}`);
  revalidatePath("/admin");
  revalidatePath("/team");
  revalidatePath("/mentor");
  return { error: null };
}
