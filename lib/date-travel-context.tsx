"use client";

import { createContext, useContext, useMemo, useState } from "react";

type DateTravelContextValue = {
  /** 실제 오늘 기준 상대일수. 0이면 실제 오늘과 같다. PRD F11: 표시 전용, DB에는 영향 없음. */
  offsetDays: number;
  goToPreviousDay: () => void;
  goToToday: () => void;
  goToNextDay: () => void;
};

const DateTravelContext = createContext<DateTravelContextValue | null>(null);

/** (app) 레이아웃에 한 번만 마운트한다. 헤더의 날짜 여행 토글과 D-day를 계산하는 모든 컴포넌트가 이 값을 공유한다. */
export function DateTravelProvider({ children }: { children: React.ReactNode }) {
  const [offsetDays, setOffsetDays] = useState(0);

  const value = useMemo<DateTravelContextValue>(
    () => ({
      offsetDays,
      goToPreviousDay: () => setOffsetDays((d) => d - 1),
      goToToday: () => setOffsetDays(0),
      goToNextDay: () => setOffsetDays((d) => d + 1),
    }),
    [offsetDays]
  );

  return <DateTravelContext.Provider value={value}>{children}</DateTravelContext.Provider>;
}

export function useDateTravel() {
  const ctx = useContext(DateTravelContext);
  if (!ctx) throw new Error("useDateTravel must be used within DateTravelProvider");
  return ctx;
}
