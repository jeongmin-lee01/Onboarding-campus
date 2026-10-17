"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addOffsetDays, diffDays } from "@/lib/dday";

const DEMO_PASSWORD = "demo1234";

type ActionResult = { error: string } | undefined;

/** 로그인한 사용자가 인사담당자인지 확인한다. 아니면 에러 메시지를 돌려준다. */
async function assertHr(): Promise<{ error: string } | { error?: undefined }> {
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
  return {};
}

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

/**
 * PRD F13 중 신입 대상: 이름·팀·사수·입사일 변경.
 * - 입사일을 바꾸면 일정 시작일과 모든 태스크 마감일을 같은 일수만큼 함께 옮긴다
 *   (마감일 = 시작일 + offset_days 관계와 phase가 그대로 유지된다).
 * - 팀·사수를 바꾸면 아직 끝나지 않은 사수·팀장 몫 태스크의 담당자를 새 담당자로 바꾼다.
 */
export async function updateNewbie(
  newbieId: string,
  input: { fullName: string; teamId: string; mentorId: string | null; hireDate: string }
): Promise<ActionResult> {
  const auth = await assertHr();
  if (auth.error) return { error: auth.error };

  const fullName = input.fullName.trim();
  const { teamId, mentorId, hireDate } = input;
  if (!fullName || !teamId || !hireDate) {
    return { error: "이름·팀·입사일을 모두 입력해야 합니다." };
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("role, hire_date")
    .eq("id", newbieId)
    .maybeSingle();
  if (!target || target.role !== "newbie") {
    return { error: "신입사원만 수정할 수 있습니다." };
  }

  if (mentorId) {
    const { data: mentor } = await admin
      .from("profiles")
      .select("role, team_id")
      .eq("id", mentorId)
      .maybeSingle();
    if (!mentor || mentor.role !== "mentor" || mentor.team_id !== teamId) {
      return { error: "선택한 팀의 사수만 지정할 수 있습니다." };
    }
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: fullName, team_id: teamId, mentor_id: mentorId, hire_date: hireDate })
    .eq("id", newbieId);
  if (profileError) return { error: "구성원 정보를 저장하지 못했습니다." };

  const { data: plans } = await admin.from("plans").select("id").eq("employee_id", newbieId);
  const planIds = (plans ?? []).map((p) => p.id);

  if (planIds.length > 0) {
    const delta = target.hire_date ? diffDays(hireDate, target.hire_date) : 0;
    if (delta !== 0) {
      const { error: planError } = await admin
        .from("plans")
        .update({ start_date: hireDate })
        .in("id", planIds);
      if (planError) return { error: "온보딩 일정 시작일을 바꾸지 못했습니다." };

      const { data: tasks } = await admin
        .from("plan_tasks")
        .select("id, due_date")
        .in("plan_id", planIds);
      const results = await Promise.all(
        (tasks ?? []).map((t) =>
          admin
            .from("plan_tasks")
            .update({ due_date: addOffsetDays(t.due_date, delta) })
            .eq("id", t.id)
        )
      );
      if (results.some((r) => r.error)) {
        return { error: "일부 태스크의 마감일을 바꾸지 못했습니다." };
      }
    }

    // 끝나지 않은 사수·팀장 몫 태스크의 담당자를 새 사수·팀장으로 교체한다.
    const { data: team } = await admin.from("teams").select("leader_id").eq("id", teamId).maybeSingle();
    const [mentorRes, leaderRes] = await Promise.all([
      admin
        .from("plan_tasks")
        .update({ assignee_id: mentorId })
        .in("plan_id", planIds)
        .eq("owner_role", "mentor")
        .neq("status", "done"),
      admin
        .from("plan_tasks")
        .update({ assignee_id: team?.leader_id ?? null })
        .in("plan_id", planIds)
        .eq("owner_role", "leader")
        .neq("status", "done"),
    ]);
    if (mentorRes.error || leaderRes.error) {
      return { error: "태스크 담당자를 바꾸지 못했습니다." };
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/members");
  revalidatePath("/mentor");
  revalidatePath("/team");
  revalidatePath("/my");
  return undefined;
}

/**
 * 신입 삭제. 계정(auth.users)을 지우면 profiles → plans → plan_tasks가 cascade로 함께 지워진다.
 * 다만 plan_tasks.assignee_id/approved_by가 이 신입을 가리키고 있으면 삭제가 막히므로
 * (cascade 순서 때문에 "Database error deleting user"가 난다) 먼저 그 연결을 비운다.
 */
export async function deleteNewbie(newbieId: string): Promise<ActionResult> {
  const auth = await assertHr();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("role")
    .eq("id", newbieId)
    .maybeSingle();
  if (!target || target.role !== "newbie") {
    return { error: "신입사원만 삭제할 수 있습니다." };
  }

  const [assigneeRes, approverRes] = await Promise.all([
    admin.from("plan_tasks").update({ assignee_id: null }).eq("assignee_id", newbieId),
    admin.from("plan_tasks").update({ approved_by: null }).eq("approved_by", newbieId),
  ]);
  if (assigneeRes.error || approverRes.error) {
    return { error: "태스크 담당자 연결을 해제하지 못했습니다." };
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(newbieId);
  if (deleteError) return { error: "신입사원을 삭제하지 못했습니다." };

  revalidatePath("/admin");
  revalidatePath("/admin/members");
  revalidatePath("/mentor");
  revalidatePath("/team");
  return undefined;
}
