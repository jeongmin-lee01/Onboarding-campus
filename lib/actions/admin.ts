"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addOffsetDays } from "@/lib/dday";

const DEMO_PASSWORD = "demo1234";

type ActionResult = { error: string } | undefined;

/**
 * PRD F10 + 6.8 플랜 생성 로직.
 * 1. 새 신입의 로그인 계정을 만든다 (profiles.id가 auth.users.id를 참조하므로 먼저 필요하다).
 * 2. profiles·plans를 만든다.
 * 3. 템플릿의 template_tasks를 전부 불러와 offset_days로 due_date를 계산하고,
 *    owner_role에 따라 담당자를 정해 plan_tasks에 일괄 삽입한다.
 * 중간에 실패하면 만들어 둔 계정을 지운다 (profiles/plans/plan_tasks는 전부 그 계정에
 * cascade로 연결돼 있어 계정 하나만 지우면 함께 정리된다).
 */
export async function createNewbie(formData: FormData): Promise<ActionResult> {
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
  if (actor?.role !== "hr") return { error: "권한이 없습니다." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const teamId = String(formData.get("team_id") ?? "");
  const mentorId = String(formData.get("mentor_id") ?? "") || null;
  const hireDate = String(formData.get("hire_date") ?? "");
  const templateId = String(formData.get("template_id") ?? "");

  if (!fullName || !email || !teamId || !hireDate || !templateId) {
    return { error: "이름·이메일·팀·입사일·템플릿을 모두 입력해야 합니다." };
  }

  const admin = createAdminClient();

  const { data: created, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (createUserError || !created.user) {
    return { error: createUserError?.message ?? "계정 생성에 실패했습니다." };
  }
  const newbieId = created.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: newbieId,
    full_name: fullName,
    email,
    role: "newbie",
    team_id: teamId,
    mentor_id: mentorId,
    hire_date: hireDate,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(newbieId);
    return { error: "구성원 등록에 실패했습니다." };
  }

  const { data: plan, error: planError } = await admin
    .from("plans")
    .insert({ employee_id: newbieId, template_id: templateId, start_date: hireDate, status: "active" })
    .select("id")
    .single();
  if (planError || !plan) {
    await admin.auth.admin.deleteUser(newbieId);
    return { error: "온보딩 일정 생성에 실패했습니다." };
  }

  const { data: templateTasks, error: templateTasksError } = await admin
    .from("template_tasks")
    .select("title, description, owner_role, offset_days, phase, is_required, sort_order")
    .eq("template_id", templateId);
  if (templateTasksError || !templateTasks || templateTasks.length === 0) {
    await admin.auth.admin.deleteUser(newbieId);
    return { error: "템플릿에 태스크가 없습니다." };
  }

  const { data: team } = await admin
    .from("teams")
    .select("leader_id")
    .eq("id", teamId)
    .maybeSingle();

  // PRD 6.8-3: owner_role -> 담당자. newbie=신입 본인, mentor=선택한 사수,
  // hr=지금 등록하는 인사담당자, leader=해당 팀의 팀장.
  const assigneeByRole: Record<string, string | null> = {
    newbie: newbieId,
    mentor: mentorId,
    hr: user.id,
    leader: team?.leader_id ?? null,
  };

  const planTasks = templateTasks.map((tt) => ({
    plan_id: plan.id,
    title: tt.title,
    description: tt.description,
    owner_role: tt.owner_role,
    assignee_id: assigneeByRole[tt.owner_role] ?? null,
    due_date: addOffsetDays(hireDate, tt.offset_days),
    phase: tt.phase,
    is_required: tt.is_required,
    sort_order: tt.sort_order,
    status: "todo",
  }));

  const { error: tasksError } = await admin.from("plan_tasks").insert(planTasks);
  if (tasksError) {
    await admin.auth.admin.deleteUser(newbieId);
    return { error: "태스크 생성에 실패했습니다." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/members");
  redirect(`/plan/${plan.id}`);
}
