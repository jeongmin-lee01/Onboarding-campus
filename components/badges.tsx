import {
  diffDays,
  formatDday,
  getDdayTone,
  TONE_COLOR,
  STATUS_TONE_COLOR,
  STATUS_LABEL,
} from "@/lib/dday";

export function DdayBadge({
  dueDate,
  status,
  today,
}: {
  dueDate: string;
  status: string;
  today: string;
}) {
  const diff = diffDays(dueDate, today);
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
