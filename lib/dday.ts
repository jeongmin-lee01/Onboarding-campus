const SEOUL_TZ = "Asia/Seoul";

const seoulDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SEOUL_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 오늘 날짜를 Asia/Seoul 기준 'YYYY-MM-DD' 문자열로 반환한다. */
export function getSeoulToday(): string {
  return seoulDateFormatter.format(new Date());
}

/** 다음 자정(Asia/Seoul)까지 남은 ms. 화면을 열어둔 채로도 D-day가 갱신되도록 타이머에 쓴다. */
export function msUntilNextSeoulMidnight(): number {
  const now = new Date();
  const seoulNow = new Date(now.toLocaleString("en-US", { timeZone: SEOUL_TZ }));
  const nextMidnight = new Date(seoulNow);
  nextMidnight.setHours(24, 0, 5, 0);
  return nextMidnight.getTime() - seoulNow.getTime();
}

/** due_date('YYYY-MM-DD') - today('YYYY-MM-DD')를 일 단위로 계산한다. PRD F7. */
export function diffDays(dueDate: string, today: string): number {
  const due = new Date(`${dueDate}T00:00:00`);
  const base = new Date(`${today}T00:00:00`);
  return Math.round((due.getTime() - base.getTime()) / 86_400_000);
}

export function formatDday(diff: number): string {
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-Day";
  return `D+${Math.abs(diff)}`;
}

export type DdayTone = "done" | "overdue" | "soon" | "normal";

/** PRD F7 색상 규칙: done=초록, 지연=빨강, 0~2=주황, 3+=회색. */
export function getDdayTone(diff: number, status: string): DdayTone {
  if (status === "done") return "done";
  if (diff < 0) return "overdue";
  if (diff <= 2) return "soon";
  return "normal";
}

export const TONE_COLOR: Record<DdayTone, { fg: string; bg: string }> = {
  done: { fg: "var(--st-done)", bg: "var(--st-done-bg)" },
  overdue: { fg: "var(--st-overdue)", bg: "var(--st-overdue-bg)" },
  soon: { fg: "var(--st-soon)", bg: "var(--st-soon-bg)" },
  normal: { fg: "var(--st-normal)", bg: "var(--st-normal-bg)" },
};

export function formatSeoulDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}월 ${d}일`;
}

export const PHASE_ORDER = ["pre", "day1", "week1", "month1", "month3"] as const;
export type Phase = (typeof PHASE_ORDER)[number];

export const PHASE_LABEL: Record<Phase, string> = {
  pre: "입사 전",
  day1: "입사 당일",
  week1: "첫 주",
  month1: "1개월 차",
  month3: "3개월 차",
};

export const STATUS_TONE_COLOR: Record<string, { fg: string; bg: string }> = {
  todo: { fg: "var(--st-normal)", bg: "var(--st-normal-bg)" },
  pending: { fg: "var(--st-pending)", bg: "var(--st-pending-bg)" },
  done: { fg: "var(--st-done)", bg: "var(--st-done-bg)" },
  rejected: { fg: "var(--st-overdue)", bg: "var(--st-overdue-bg)" },
};

export const STATUS_LABEL: Record<string, string> = {
  todo: "할 일",
  pending: "승인 대기",
  done: "완료",
  rejected: "반려",
};
