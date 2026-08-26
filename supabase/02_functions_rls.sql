-- ============================================================
-- 02_functions_rls.sql
-- PRD 5장 권한 매트릭스 -> RLS 정책
-- PRD 5.2 무한재귀 방지 함수 포함
-- 실행 순서: 2번째 (01_schema.sql 다음)
-- ============================================================

-- ---- PRD 5.2 필수 함수 ----
-- profiles 테이블 정책 안에서 profiles를 직접 SELECT하면
-- "infinite recursion detected in policy" 에러가 난다.
-- 아래 두 함수는 SECURITY DEFINER로 RLS를 우회해서 이 문제를 피한다.

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_team()
returns uuid language sql stable security definer set search_path = public as $$
  select team_id from public.profiles where id = auth.uid()
$$;

-- ---- RLS 활성화 (6개 테이블 전부) ----
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.templates enable row level security;
alter table public.template_tasks enable row level security;
alter table public.plans enable row level security;
alter table public.plan_tasks enable row level security;

-- ============================================================
-- teams
-- 팀 이름은 어느 화면에서든(선택 드롭다운 등) 필요하므로 로그인한
-- 사용자는 전부 조회 가능하게 둔다. 수정 기능은 P0에 없다.
-- ============================================================
create policy "teams_select_all" on public.teams
  for select using (auth.uid() is not null);

-- ============================================================
-- profiles
-- 조회: 본인 / hr(전사) / mentor(담당 신입) / leader(소속 팀)
-- 등록: hr만 (F10 신입 등록)
-- 수정: P0 범위 밖 (F13은 P1) -> 정책 없음 = 아무도 수정 불가
-- ============================================================
create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_hr" on public.profiles
  for select using (public.current_user_role() = 'hr');

create policy "profiles_select_mentor_own_newbies" on public.profiles
  for select using (
    public.current_user_role() = 'mentor' and mentor_id = auth.uid()
  );

create policy "profiles_select_leader_team" on public.profiles
  for select using (
    public.current_user_role() = 'leader' and team_id = public.current_user_team()
  );

create policy "profiles_insert_hr" on public.profiles
  for insert with check (public.current_user_role() = 'hr');

-- ============================================================
-- templates / template_tasks
-- 조회: leader, hr만 (신입/사수는 템플릿을 볼 수 없다)
-- ============================================================
create policy "templates_select_leader_hr" on public.templates
  for select using (public.current_user_role() in ('leader', 'hr'));

create policy "template_tasks_select_leader_hr" on public.template_tasks
  for select using (public.current_user_role() in ('leader', 'hr'));

-- ============================================================
-- plans
-- 조회: 본인(신입) / mentor(담당 신입) / leader(소속 팀) / hr(전사)
-- 등록: hr만 (F10)
-- ============================================================
create policy "plans_select_self" on public.plans
  for select using (employee_id = auth.uid());

create policy "plans_select_mentor" on public.plans
  for select using (
    public.current_user_role() = 'mentor'
    and exists (
      select 1 from public.profiles p
      where p.id = plans.employee_id and p.mentor_id = auth.uid()
    )
  );

create policy "plans_select_leader" on public.plans
  for select using (
    public.current_user_role() = 'leader'
    and exists (
      select 1 from public.profiles p
      where p.id = plans.employee_id and p.team_id = public.current_user_team()
    )
  );

create policy "plans_select_hr" on public.plans
  for select using (public.current_user_role() = 'hr');

create policy "plans_insert_hr" on public.plans
  for insert with check (public.current_user_role() = 'hr');

-- ============================================================
-- plan_tasks
-- 조회: 신입(본인 플랜 전체) / mentor(담당 신입 플랜) / leader(팀 내) / hr(전사)
-- 수정(완료요청/승인/반려): 신입 본인 담당분 / mentor 본인 담당·담당신입분 / leader 팀 내 / hr 전체
-- 추가: mentor(담당 신입 플랜) / leader(팀 내) / hr(전체). 신입은 추가 불가
-- ============================================================
create policy "plan_tasks_select_newbie" on public.plan_tasks
  for select using (
    exists (
      select 1 from public.plans pl
      where pl.id = plan_tasks.plan_id and pl.employee_id = auth.uid()
    )
  );

create policy "plan_tasks_select_mentor" on public.plan_tasks
  for select using (
    public.current_user_role() = 'mentor'
    and exists (
      select 1 from public.plans pl
      join public.profiles p on p.id = pl.employee_id
      where pl.id = plan_tasks.plan_id and p.mentor_id = auth.uid()
    )
  );

create policy "plan_tasks_select_leader" on public.plan_tasks
  for select using (
    public.current_user_role() = 'leader'
    and exists (
      select 1 from public.plans pl
      join public.profiles p on p.id = pl.employee_id
      where pl.id = plan_tasks.plan_id and p.team_id = public.current_user_team()
    )
  );

create policy "plan_tasks_select_hr" on public.plan_tasks
  for select using (public.current_user_role() = 'hr');

create policy "plan_tasks_update_newbie_own" on public.plan_tasks
  for update
  using (assignee_id = auth.uid())
  with check (assignee_id = auth.uid());

create policy "plan_tasks_update_mentor" on public.plan_tasks
  for update using (
    public.current_user_role() = 'mentor'
    and (
      assignee_id = auth.uid()
      or exists (
        select 1 from public.plans pl
        join public.profiles p on p.id = pl.employee_id
        where pl.id = plan_tasks.plan_id and p.mentor_id = auth.uid()
      )
    )
  );

create policy "plan_tasks_update_leader" on public.plan_tasks
  for update using (
    public.current_user_role() = 'leader'
    and exists (
      select 1 from public.plans pl
      join public.profiles p on p.id = pl.employee_id
      where pl.id = plan_tasks.plan_id and p.team_id = public.current_user_team()
    )
  );

create policy "plan_tasks_update_hr" on public.plan_tasks
  for update using (public.current_user_role() = 'hr');

create policy "plan_tasks_insert_mentor" on public.plan_tasks
  for insert with check (
    public.current_user_role() = 'mentor'
    and exists (
      select 1 from public.plans pl
      join public.profiles p on p.id = pl.employee_id
      where pl.id = plan_tasks.plan_id and p.mentor_id = auth.uid()
    )
  );

create policy "plan_tasks_insert_leader" on public.plan_tasks
  for insert with check (
    public.current_user_role() = 'leader'
    and exists (
      select 1 from public.plans pl
      join public.profiles p on p.id = pl.employee_id
      where pl.id = plan_tasks.plan_id and p.team_id = public.current_user_team()
    )
  );

create policy "plan_tasks_insert_hr" on public.plan_tasks
  for insert with check (public.current_user_role() = 'hr');
