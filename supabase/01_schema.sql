-- ============================================================
-- 01_schema.sql
-- PRD 6장 테이블 6개 생성
-- 실행 순서: 1번째
-- ============================================================

create extension if not exists pgcrypto;

-- 6.1 teams
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader_id uuid
);

-- 6.2 profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('newbie', 'mentor', 'leader', 'hr')),
  team_id uuid references public.teams (id),
  mentor_id uuid references public.profiles (id),
  hire_date date
);

-- teams.leader_id -> profiles.id (순환 참조라 profiles 생성 이후에 추가)
alter table public.teams
  add constraint teams_leader_id_fkey foreign key (leader_id) references public.profiles (id);

-- 6.3 templates
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text
);

-- 6.4 template_tasks
create table public.template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  title text not null,
  description text,
  -- PRD 6.4 설명은 newbie/mentor/hr 3종이지만, 6.9 시드 표(#18, #20)에
  -- leader 값이 실제로 쓰여서 leader까지 포함한다.
  owner_role text not null check (owner_role in ('newbie', 'mentor', 'hr', 'leader')),
  offset_days integer not null,
  phase text not null check (phase in ('pre', 'day1', 'week1', 'month1', 'month3')),
  is_required boolean not null default true,
  sort_order integer not null default 0
);

-- 6.5 plans
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  template_id uuid references public.templates (id),
  start_date date not null,
  status text not null default 'active' check (status in ('active', 'done'))
);

-- 6.6 plan_tasks
create table public.plan_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  title text not null,
  description text,
  owner_role text not null check (owner_role in ('newbie', 'mentor', 'hr', 'leader')),
  assignee_id uuid references public.profiles (id),
  due_date date not null,
  phase text not null check (phase in ('pre', 'day1', 'week1', 'month1', 'month3')),
  is_required boolean not null default true,
  sort_order integer not null default 0,
  status text not null default 'todo' check (status in ('todo', 'pending', 'done', 'rejected')),
  completed_at timestamptz,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  reject_reason text
);

create index on public.profiles (team_id);
create index on public.profiles (mentor_id);
create index on public.template_tasks (template_id);
create index on public.plans (employee_id);
create index on public.plan_tasks (plan_id);
create index on public.plan_tasks (assignee_id);
