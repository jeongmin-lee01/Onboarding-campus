"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  revalidatePath("/admin");
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
