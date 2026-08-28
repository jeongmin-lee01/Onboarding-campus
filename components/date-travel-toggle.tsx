"use client";

import { useDateTravel } from "@/lib/date-travel-context";

const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

/** PRD F11 / design.md 5.1. 표시 전용 — DB는 절대 바꾸지 않는다. */
export function DateTravelToggle() {
  const { offsetDays, goToPreviousDay, goToToday, goToNextDay } = useDateTravel();
  const isToday = offsetDays === 0;

  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
      <button
        type="button"
        onClick={goToPreviousDay}
        className={`rounded-md px-1 py-1 whitespace-nowrap transition-colors duration-150 hover:bg-[var(--bg-sunken)] sm:px-1.5 ${focusRing}`}
        style={{ fontSize: 13, color: "var(--text-muted)" }}
        aria-label="하루 전으로"
      >
        <span className="sm:hidden">◀</span>
        <span className="hidden sm:inline">◀ 어제</span>
      </button>
      <span className="hidden sm:inline" style={{ fontSize: 13, color: "var(--text-faint)" }}>
        ·
      </span>
      <button
        type="button"
        onClick={goToToday}
        disabled={isToday}
        className={`rounded-md px-1 py-1 whitespace-nowrap transition-colors duration-150 hover:bg-[var(--bg-sunken)] disabled:pointer-events-none sm:px-1.5 ${focusRing}`}
        style={{ fontSize: 13, fontWeight: isToday ? 600 : 400, color: "var(--text)" }}
        aria-label="오늘로 돌아가기"
      >
        오늘
      </button>
      <span className="hidden sm:inline" style={{ fontSize: 13, color: "var(--text-faint)" }}>
        ·
      </span>
      <button
        type="button"
        onClick={goToNextDay}
        className={`rounded-md px-1 py-1 whitespace-nowrap transition-colors duration-150 hover:bg-[var(--bg-sunken)] sm:px-1.5 ${focusRing}`}
        style={{ fontSize: 13, color: "var(--text-muted)" }}
        aria-label="하루 다음으로"
      >
        <span className="sm:hidden">▶</span>
        <span className="hidden sm:inline">내일 ▶</span>
      </button>
    </div>
  );
}
