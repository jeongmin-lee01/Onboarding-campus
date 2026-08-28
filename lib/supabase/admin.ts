import { createClient } from "@supabase/supabase-js";

/**
 * service_role 키로 RLS를 우회하는 관리자 클라이언트.
 * 신입 등록(F10)에서 새 로그인 계정(auth.users)을 만들 때만
 * 서버 액션 안에서 사용한다. 클라이언트 컴포넌트로 절대 가져오지 않는다.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
