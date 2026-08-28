# 온보딩 체크리스트

입사일만 입력하면 개인별 온보딩 체크리스트가 자동 생성되고, 신입사원·사수·팀장·인사담당자 4개 역할이 각자의 권한 범위에서 진행 상황을 관리하는 웹 애플리케이션입니다.

이 프로젝트가 증명하는 것 3가지:

1. **역할 기반 접근 제어(RBAC)** — UI에서 숨기는 게 아니라 Postgres RLS로 DB 레벨에서 실제로 차단됩니다.
2. **날짜 자동 계산** — 입사일 기준 상대일정(`offset_days`)이 실제 날짜로 변환되고, D-day가 렌더링 시점에 계산됩니다.
3. **승인 워크플로** — 신입의 완료 요청과 사수·팀장·인사의 승인/반려가 상태로 관리됩니다.

제품 사양은 `PRD.md`, 디자인 사양은 `design.md`를 참조하세요.

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 15 (App Router), TypeScript (strict) |
| 스타일 | Tailwind CSS, shadcn/ui |
| DB · 인증 | Supabase (Postgres + Auth + RLS), `@supabase/ssr` |
| 배포 | Vercel |

## 로컬 개발 환경 설정

### 1. 패키지 설치

```bash
npm install
```

### 2. Supabase 프로젝트 준비

[supabase.com](https://supabase.com)에서 새 프로젝트를 만들고, **SQL Editor**에서 `supabase/` 폴더의 파일을 **아래 순서 그대로** 실행합니다.

| 순서 | 파일 | 내용 |
|---|---|---|
| 1 | `01_schema.sql` | PRD 6장 테이블 6개 생성 |
| 2 | `02_functions_rls.sql` | 권한 함수(`current_user_role` 등) + RLS 정책 |
| 3 | `03_seed.sql` | 팀 2개, 데모 계정 6개, 템플릿 태스크 20개, 신입 3명 플랜 |
| 4 | `04_my_checklist_rls.sql` | 신입 체크리스트 담당자 이름 조회 RLS 보완 |
| 5 | `05_mentor_plan_assignee_rls.sql` | 사수가 플랜 상세에서 담당자 이름을 보기 위한 RLS 보완 |
| 6 | `06_dashboard_plan_assignee_rls.sql` | 5번을 팀장·인사담당자까지 일반화 |

`03_seed.sql`이 `auth.users`에 직접 계정을 만드는 데서 에러가 나면, 파일 상단 주석에 적힌 대체 순서(대시보드에서 계정 생성 후 나머지 블록만 실행)를 따르세요.

### 3. 환경변수

`.env.local.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.

```bash
cp .env.local.example .env.local
```

| 변수 | 위치 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API | 클라이언트·서버 공용 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API | 클라이언트·서버 공용 |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` secret | **서버 전용.** 신입 등록(F10) 시 새 로그인 계정을 만들 때만 쓴다 |

`SUPABASE_SERVICE_ROLE_KEY`는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다 — 브라우저에 노출되면 RLS를 우회한 전체 DB 접근 권한이 새어나갑니다.

### 4. 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속 → 로그인 화면 하단 드롭다운에서 데모 계정을 선택합니다.

## 데모 계정

비밀번호는 전부 `demo1234`입니다.

| 이름 | 이메일 | 역할 |
|---|---|---|
| 최인사 | hr@demo.com | 인사담당자 |
| 박팀장 | leader@demo.com | 팀장 (개발팀) |
| 이사수 | mentor@demo.com | 사수 (개발팀) |
| 김신입 | newbie@demo.com | 신입사원 — 온보딩 진행 중 |
| 정신입 | newbie2@demo.com | 신입사원 — 입사 예정 (D-5) |
| 한신입 | newbie3@demo.com | 신입사원 — 온보딩 마무리 단계 (마케팅팀) |

시드의 모든 날짜는 `current_date` 기준 상대값이라, 시간이 지나도 "지연"·"임박" 상태가 항상 오늘 기준으로 재현됩니다.

## 스크립트

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 빌드 결과 실행
npm run lint    # ESLint
```

## 배포

Vercel에 배포합니다. 환경변수 3개(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)를 Vercel 프로젝트 설정에도 동일하게 등록해야 합니다.
