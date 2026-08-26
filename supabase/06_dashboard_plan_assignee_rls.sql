-- ============================================================
-- 06_dashboard_plan_assignee_rls.sql
-- STEP 5 — /team, /admin에서도 /plan/[id]로 들어갈 수 있게 됐다.
-- 팀장·인사담당자가 그 화면에서 담당자 이름(예: 최인사, 박팀장)을 보려면
-- 04·05번과 같은 이유로 profiles 조회 권한이 필요하다.
--
-- 04(본인 플랜), 05(사수→담당 신입)를 이 정책 하나로 일반화한다
-- (본인 / 담당 신입 / 같은 팀 팀장 / 인사담당자 모두 포함).
-- 기존 두 정책은 이 정책의 부분집합이라 남겨둬도 무해하지만,
-- 중복 관리를 피하기 위해 지우고 이 정책 하나로 교체한다.
--
-- 04, 05와 같은 이유로 SECURITY DEFINER 함수를 거쳐 순환 참조를 피한다.
-- 실행 순서: 01~05 다음
-- ============================================================

drop policy if exists "profiles_select_own_plan_assignees" on public.profiles;
drop policy if exists "profiles_select_mentee_plan_assignees" on public.profiles;

create or replace function public.can_view_employee_plan(target_employee_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    target_employee_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = target_employee_id and p.mentor_id = auth.uid()
    )
    or (
      public.current_user_role() = 'leader'
      and exists (
        select 1 from public.profiles p
        where p.id = target_employee_id and p.team_id = public.current_user_team()
      )
    )
    or public.current_user_role() = 'hr'
$$;

create or replace function public.is_assignee_in_a_visible_plan(target_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.plan_tasks pt
    join public.plans pl on pl.id = pt.plan_id
    where pt.assignee_id = target_profile_id
      and public.can_view_employee_plan(pl.employee_id)
  )
$$;

create policy "profiles_select_visible_plan_assignees" on public.profiles
  for select using (
    public.is_assignee_in_a_visible_plan(profiles.id)
  );
