-- ============================================================
-- 05_mentor_plan_assignee_rls.sql
-- STEP 4 — /plan/[id] 상세 화면에서 사수가 담당 신입의 플랜을 볼 때,
-- 그 플랜 안에 있는 hr/팀장 담당 태스크의 담당자 이름(예: 최인사, 박팀장)도
-- 보여주려면 사수가 그 사람들의 profiles 행(이름)을 조회할 수 있어야 한다.
--
-- 04번과 같은 함정을 피하기 위해 반드시 SECURITY DEFINER 함수를 거친다.
-- (profiles 정책 안에서 plan_tasks/plans를 직접 조회하면, 그 테이블들의
-- 정책이 다시 profiles를 조회해서 순환 참조가 생긴다 — 지난번에 겪은 문제.)
--
-- 실행 순서: 01, 02, 03, 04 다음
-- ============================================================

create or replace function public.is_assignee_in_my_mentee_plan(target_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.plan_tasks pt
    join public.plans pl on pl.id = pt.plan_id
    join public.profiles emp on emp.id = pl.employee_id
    where pt.assignee_id = target_profile_id
      and emp.mentor_id = auth.uid()
  )
$$;

create policy "profiles_select_mentee_plan_assignees" on public.profiles
  for select using (
    public.is_assignee_in_my_mentee_plan(profiles.id)
  );
