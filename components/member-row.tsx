import Link from "next/link";

/** design.md 6.5 대시보드 인원 행. /mentor·/team·/admin에서 공통으로 쓴다. */
export function MemberRow({
  name,
  teamLabel,
  planId,
  done,
  total,
  overdueCount,
}: {
  name: string;
  teamLabel: string;
  planId: string;
  done: number;
  total: number;
  overdueCount: number;
}) {
  return (
    <Link
      href={`/plan/${planId}`}
      className="flex h-11 items-center gap-4 px-2 transition-colors duration-150 hover:bg-[var(--bg-subtle)]"
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
      <div
        className="h-1.5 flex-1 overflow-hidden"
        style={{ background: "var(--bg-sunken)", borderRadius: 999 }}
      >
        <div
          className="h-full"
          style={{
            width: total ? `${(done / total) * 100}%` : "0%",
            background: "var(--accent)",
            borderRadius: 999,
          }}
        />
      </div>
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
    </Link>
  );
}
