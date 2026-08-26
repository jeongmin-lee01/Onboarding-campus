-- ============================================================
-- 03_seed.sql
-- PRD 6.9 시드 데이터 (팀 2개, 계정 6개, 템플릿 태스크 20개, 신입 3명 플랜)
-- 실행 순서: 3번째 (01, 02 다음)
--
-- 주의: auth.users에 직접 insert하는 것은 Supabase Auth 내부 테이블을
-- 다루는 방식이다. 데모/개발용 시드로 널리 쓰이는 방법이지만,
-- 만약 이 블록에서 에러가 나면 아래 순서로 대체할 수 있다.
--   Supabase 대시보드 > Authentication > Add user 에서
--   6개 계정을 이메일/비밀번호(demo1234)로 직접 만든 다음,
--   이 파일의 teams / profiles / templates / plan_tasks 부분만
--   따로 실행한다 (그때는 auth.users insert 블록만 건너뛴다).
-- ============================================================

-- ---- 1) teams ----
insert into public.teams (id, name) values
  ('11111111-1111-1111-1111-111111111111', '개발팀'),
  ('22222222-2222-2222-2222-222222222222', '마케팅팀');

-- ---- 2) auth.users + auth.identities + profiles (계정 6개, 비밀번호 demo1234) ----
do $$
declare
  v_hr uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_leader uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  v_mentor uuid := 'aaaaaaaa-0000-0000-0000-000000000003';
  v_newbie1 uuid := 'aaaaaaaa-0000-0000-0000-000000000004';
  v_newbie2 uuid := 'aaaaaaaa-0000-0000-0000-000000000005';
  v_newbie3 uuid := 'aaaaaaaa-0000-0000-0000-000000000006';
  v_team_dev uuid := '11111111-1111-1111-1111-111111111111';
  v_team_mkt uuid := '22222222-2222-2222-2222-222222222222';
  v_template uuid := '33333333-3333-3333-3333-333333333333';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', v_hr, 'authenticated', 'authenticated', 'hr@demo.com', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_leader, 'authenticated', 'authenticated', 'leader@demo.com', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_mentor, 'authenticated', 'authenticated', 'mentor@demo.com', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_newbie1, 'authenticated', 'authenticated', 'newbie@demo.com', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_newbie2, 'authenticated', 'authenticated', 'newbie2@demo.com', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_newbie3, 'authenticated', 'authenticated', 'newbie3@demo.com', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '')
  on conflict (id) do nothing;

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values
    (gen_random_uuid(), v_hr::text, v_hr, jsonb_build_object('sub', v_hr::text, 'email', 'hr@demo.com'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_leader::text, v_leader, jsonb_build_object('sub', v_leader::text, 'email', 'leader@demo.com'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_mentor::text, v_mentor, jsonb_build_object('sub', v_mentor::text, 'email', 'mentor@demo.com'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_newbie1::text, v_newbie1, jsonb_build_object('sub', v_newbie1::text, 'email', 'newbie@demo.com'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_newbie2::text, v_newbie2, jsonb_build_object('sub', v_newbie2::text, 'email', 'newbie2@demo.com'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_newbie3::text, v_newbie3, jsonb_build_object('sub', v_newbie3::text, 'email', 'newbie3@demo.com'), 'email', now(), now(), now())
  on conflict (id) do nothing;

  -- profiles
  -- 한신입(마케팅팀)은 데모 계정에 마케팅팀 사수가 없어 mentor_id를 비워둔다 (nullable).
  insert into public.profiles (id, full_name, email, role, team_id, mentor_id, hire_date) values
    (v_hr, '최인사', 'hr@demo.com', 'hr', null, null, null),
    (v_leader, '박팀장', 'leader@demo.com', 'leader', v_team_dev, null, null),
    (v_mentor, '이사수', 'mentor@demo.com', 'mentor', v_team_dev, null, null),
    (v_newbie1, '김신입', 'newbie@demo.com', 'newbie', v_team_dev, v_mentor, current_date - 2),
    (v_newbie2, '정신입', 'newbie2@demo.com', 'newbie', v_team_dev, v_mentor, current_date + 5),
    (v_newbie3, '한신입', 'newbie3@demo.com', 'newbie', v_team_mkt, null, current_date - 35);

  update public.teams set leader_id = v_leader where id = v_team_dev;

  -- ---- 3) templates + template_tasks (PRD 6.9 범용 템플릿 20개) ----
  insert into public.templates (id, name, description) values
    (v_template, '범용 온보딩 템플릿', '업종 무관 범용 온보딩 체크리스트');

  insert into public.template_tasks
    (template_id, title, description, owner_role, offset_days, phase, is_required, sort_order)
  values
    (v_template, '근로계약서 검토 및 서명', '계약서를 확인하고 서명해 주세요.', 'newbie', -3, 'pre', true, 1),
    (v_template, '신분증·통장 사본 제출', null, 'newbie', -3, 'pre', true, 2),
    (v_template, '업무용 계정 발급 요청', null, 'hr', -2, 'pre', true, 3),
    (v_template, '노트북·장비 준비', null, 'hr', -1, 'pre', true, 4),
    (v_template, '좌석 배정 및 출입증 신청', null, 'hr', -1, 'pre', true, 5),
    (v_template, '환영 메시지 발송', null, 'mentor', -1, 'pre', true, 6),
    (v_template, '출입증 수령', null, 'newbie', 0, 'day1', true, 7),
    (v_template, '장비 수령 및 초기 세팅', null, 'newbie', 0, 'day1', true, 8),
    (v_template, '팀 소개 및 자리 안내', null, 'mentor', 0, 'day1', true, 9),
    (v_template, '사내 시스템 계정 로그인 확인', null, 'newbie', 0, 'day1', true, 10),
    (v_template, '조직도·업무 프로세스 안내', null, 'mentor', 1, 'week1', true, 11),
    (v_template, '사내 규정·보안 교육 이수', null, 'newbie', 2, 'week1', true, 12),
    (v_template, '복리후생 안내', null, 'hr', 3, 'week1', true, 13),
    (v_template, '팀 주간 회의 참관', null, 'newbie', 4, 'week1', true, 14),
    (v_template, '사수와 첫 1:1 미팅', null, 'mentor', 5, 'week1', true, 15),
    (v_template, '첫 업무 과제 배정', null, 'mentor', 7, 'week1', true, 16),
    (v_template, '2주 차 적응 점검 미팅', null, 'mentor', 14, 'month1', true, 17),
    (v_template, '1개월 차 피드백 면담', null, 'leader', 30, 'month1', true, 18),
    (v_template, '수습 중간 점검', null, 'hr', 45, 'month3', true, 19),
    (v_template, '수습 종료 평가', null, 'leader', 90, 'month3', true, 20);

  -- ---- 4) plans (신입 3명) ----
  insert into public.plans (employee_id, template_id, start_date, status) values
    (v_newbie1, v_template, current_date - 2, 'active'),
    (v_newbie2, v_template, current_date + 5, 'active'),
    (v_newbie3, v_template, current_date - 35, 'active');
end $$;

-- ---- 5) plan_tasks: template_tasks를 각 플랜으로 복제 (PRD 6.8 로직) ----
insert into public.plan_tasks (
  plan_id, title, description, owner_role, assignee_id, due_date,
  phase, is_required, sort_order, status
)
select
  pl.id,
  tt.title,
  tt.description,
  tt.owner_role,
  case tt.owner_role
    when 'newbie' then pl.employee_id
    when 'mentor' then emp.mentor_id
    when 'hr' then (select id from public.profiles where role = 'hr' limit 1)
    when 'leader' then (select leader_id from public.teams where id = emp.team_id)
  end,
  pl.start_date + tt.offset_days,
  tt.phase,
  tt.is_required,
  tt.sort_order,
  'todo'
from public.plans pl
join public.profiles emp on emp.id = pl.employee_id
join public.template_tasks tt on tt.template_id = pl.template_id;

-- ---- 6) 화면이 비어 보이지 않도록 일부 상태를 미리 채운다 ----

-- 김신입: 입사 2일 차. 이미 지난 사전입사 항목(#1,#2)은 완료, 하나는 승인 대기.
update public.plan_tasks pt
set status = 'done',
    completed_at = now() - interval '3 days',
    approved_by = (select id from public.profiles where email = 'mentor@demo.com'),
    approved_at = now() - interval '2 days'
where pt.plan_id = (select id from public.plans where employee_id = (select id from public.profiles where email = 'newbie@demo.com'))
  and pt.sort_order in (1, 2);

update public.plan_tasks pt
set status = 'pending',
    completed_at = now() - interval '1 hour'
where pt.plan_id = (select id from public.plans where employee_id = (select id from public.profiles where email = 'newbie@demo.com'))
  and pt.sort_order = 7;

-- 한신입: 입사 35일 차. 이미 마감이 지난 항목(offset 30 이하, sort_order 1~18)은 완료 처리.
update public.plan_tasks pt
set status = 'done',
    completed_at = now() - interval '10 days',
    approved_by = (select id from public.profiles where email = 'hr@demo.com'),
    approved_at = now() - interval '9 days'
where pt.plan_id = (select id from public.plans where employee_id = (select id from public.profiles where email = 'newbie3@demo.com'))
  and pt.sort_order between 1 and 18;
