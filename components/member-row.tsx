import Link from "next/link";
import { ProgressBar } from "@/components/progress-bar";
import { DdayBadge } from "@/components/badges";

/** design.md 6.5 대시보드 인원 행. /mentor·/team·/admin에서 공통으로 쓴다. */
export function MemberRow({
  name,
  teamLabel,
  planId,
  done,
  total,
  overdueCount,
  worstTask,
  today,
}: {
  name: string;
  teamLabel: string;
  planId: string;
  done: number;
  total: number;
  overdueCount: number;
  /** 미완료 태스크 중 가장 급한 것. 없으면 표시하지 않는다. */
  worstTask: { due_date: string; status: string } | null;
  today: string;
}) {
  return (
    <Link
      href={`/plan/${planId}`}
      className="flex h-11 min-w-[560px] items-center gap-4 px-2 transition-colors duration-150 hover:bg-[var(--bg-subtle)]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <span
        className="w-24 shrink-0 truncate"
        style={{ fontSize: 14, color: "var(--text)" }}
      >
        {name}
      </span>
      <span
        className="w-20 shrink-0 truncate"
        style={{ fontSize: 13, color: "var(--text-muted)" }}
      >
        {teamLabel}
      </span>
      <ProgressBar done={done} total={total} className="flex-1" />
      <span className="mono w-14 shrink-0 text-right" style={{ fontSize: 13, color: "var(--text-muted)" }}>
        {done}/{total}
      </span>
      {overdueCount > 0 && (
        <span
          className="shrink-0 rounded-sm px-2 py-0.5"
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--st-overdue)",
            background: "var(--st-overdue-bg)",
          }}
        >
          지연 {overdueCount}
        </span>
      )}
      {worstTask && (
        <DdayBadge dueDate={worstTask.due_date} status={worstTask.status} today={today} />
      )}
    </Link>
  );
}
