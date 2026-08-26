"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/roles";

type ActionResult = { error: string } | undefined;

async function signInAndRedirect(
  email: string,
  password: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const home = (profile?.role && ROLE_HOME[profile.role]) || "/login";
  redirect(home);
}

export async function signInWithPassword(
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해 주세요." };
  }

  return signInAndRedirect(email, password);
}

export async function signInWithDemoAccount(
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("demoEmail") ?? "");
  return signInAndRedirect(email, "demo1234");
}
