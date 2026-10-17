-- 데모 신입 3명의 입사일을 시드 당시 기준(오늘 -2 / +5 / -35일)으로 다시 맞춘다.
-- 시간이 지나 지연 일수(D+N)가 커졌을 때 SQL Editor에서 실행한다. 몇 번 실행해도 결과가 같다.
--
-- 바뀌는 것: profiles.hire_date, plans.start_date, plan_tasks.due_date (같은 일수만큼 함께 이동)
-- 바뀌지 않는 것: 태스크 상태(done 등), 담당자, 삭제되는 데이터 없음. 데모 계정 3명 외 구성원은 건드리지 않는다.

do $$
declare
  r record;
  v_delta int;
begin
  for r in
    select * from (values
      ('newbie@demo.com',  -2),
      ('newbie2@demo.com',  5),
      ('newbie3@demo.com', -35)
    ) as t(email, day_offset)
  loop
    select (current_date + r.day_offset) - hire_date
      into v_delta
      from public.profiles
     where email = r.email and hire_date is not null;

    if v_delta is null or v_delta = 0 then
      continue;
    end if;

    update public.plan_tasks
       set due_date = due_date + v_delta
     where plan_id in (
       select pl.id from public.plans pl
         join public.profiles p on p.id = pl.employee_id
        where p.email = r.email
     );

    update public.plans
       set start_date = start_date + v_delta
     where employee_id = (select id from public.profiles where email = r.email);

    update public.profiles
       set hire_date = hire_date + v_delta
     where email = r.email;
  end loop;
end $$;
