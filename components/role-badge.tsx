import { ROLE_LABEL } from "@/lib/roles";

export function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className="shrink-0 rounded-sm px-2 py-0.5"
      style={{
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.01em",
        background: "var(--bg-sunken)",
        color: "var(--text-muted)",
      }}
    >
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}
