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
  return { error: null };
}
