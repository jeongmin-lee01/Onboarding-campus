/** design.md 6.4 진행률 막대. 채우는 애니메이션은 넣지 않는다. */
export function ProgressBar({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  return (
    <div
      className={`h-1.5 overflow-hidden ${className ?? ""}`}
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
  );
}
