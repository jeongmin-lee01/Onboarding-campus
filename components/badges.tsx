"use client";

import {
  addOffsetDays,
  diffDays,
  formatDday,
  getDdayTone,
  TONE_COLOR,
  STATUS_TONE_COLOR,
  STATUS_LABEL,
} from "@/lib/dday";
import { useDateTravel } from "@/lib/date-travel-context";

export function DdayBadge({
  dueDate,
  status,
  today,
}: {
  dueDate: string;
  status: string;
  /** 서버가 계산한 실제 오늘. 날짜 여행 오프셋은 이 컴포넌트 안에서 더한다. */
  today: string;
}) {
  const { offsetDays } = useDateTravel();
  const displayToday = offsetDays === 0 ? today : addOffsetDays(today, offsetDays);
  const diff = diffDays(dueDate, displayToday);
  const tone = getDdayTone(diff, status);
  const { fg, bg } = TONE_COLOR[tone];
  const label = formatDday(diff);

  return (
    <span
      className="mono shrink-0 rounded-sm px-2 py-0.5"
      style={{
        fontSize: 12,
        fontWeight: label === "D-Day" ? 600 : 500,
        color: fg,
        background: bg,
      }}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { fg, bg } = STATUS_TONE_COLOR[status] ?? STATUS_TONE_COLOR.todo;
  return (
    <span
      className="shrink-0 rounded-sm px-2 py-0.5"
      style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.01em", color: fg, background: bg }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function RequiredBadge() {
  return (
    <span
      className="shrink-0 rounded-sm px-2 py-0.5"
      style={{
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.01em",
        color: "var(--text-muted)",
        background: "var(--bg-sunken)",
      }}
    >
      필수
    </span>
  );
}
