-- ============================================================
-- 04_my_checklist_rls.sql  (수정판 — 이전에 실행했다면 반드시 다시 실행할 것)
--
-- 문제: 이전 버전은 profiles 정책 안에서 plan_tasks/plans를 직접 조회했다.
-- 그런데 plan_tasks/plans의 정책들도 profiles를 다시 조회하기 때문에
-- profiles → plan_tasks → profiles로 순환이 생겨
-- "infinite recursion detected in policy for relation profiles" 에러가 나고,
-- 그 결과 로그인 후 역할 조회가 전부 실패해서 로그인 화면이 계속
-- 자기 자신으로 리다이�렉트되는 문제(ERR_TOO_MANY_REDIRECTS)가 발생했다.
--
-- 해결: PRD 5.2와 같은 방식으로 SECURITY DEFINER 함수를 거쳐 RLS를
-- 우회해서 순환을 끊는다.
--
-- 실행 순서: 01, 02, 03 다음. 이전 버전을 이미 실행했어도 안전하게
-- 다시 실행할 수 있다 (먼저 문제가 있던 정책을 지운다).
-- ============================================================

drop policy if exists "profiles_select_own_plan_assignees" on public.profiles;

create or replace function public.is_assignee_in_my_plan(target_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.plan_tasks pt
    join public.plans pl on pl.id = pt.plan_id
    where pt.assignee_id = target_profile_id
      and pl.employee_id = auth.uid()
  )
$$;

create policy "profiles_select_own_plan_assignees" on public.profiles
  for select using (
    public.is_assignee_in_my_plan(profiles.id)
  );
