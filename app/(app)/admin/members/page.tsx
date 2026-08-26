import { createClient } from "@/lib/supabase/server";
import { RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, team_id, mentor_id, hire_date")
    .order("full_name", { ascending: true });

  const list = members ?? [];

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 py-8 md:px-8">
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          등록된 신입사원이 없습니다. 신입 등록에서 추가할 수 있습니다.
        </p>
      </div>
    );
  }

  const teamIds = Array.from(
    new Set(list.map((m) => m.team_id).filter((v): v is string => Boolean(v)))
  );
  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name").in("id", teamIds)
    : { data: [] as { id: string; name: string }[] };
  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const nameById = new Map(list.map((m) => [m.id, m.full_name]));

  const headerCellStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: "0.01em",
    color: "var(--text-faint)",
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 md:px-8">
      <h1
        className="mb-6"
        style={{
          fontSize: 24,
          lineHeight: "32px",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--text)",
        }}
      >
        구성원 목록
      </h1>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div
            className="flex h-9 items-center gap-4 px-2"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span className="w-24 shrink-0" style={headerCellStyle}>이름</span>
            <span className="w-48 shrink-0" style={headerCellStyle}>이메일</span>
            <span className="w-24 shrink-0" style={headerCellStyle}>역할</span>
            <span className="w-20 shrink-0" style={headerCellStyle}>소속 팀</span>
            <span className="w-20 shrink-0" style={headerCellStyle}>담당 사수</span>
            <span className="w-24 shrink-0" style={headerCellStyle}>입사일</span>
            <span className="flex-1" />
          </div>

          {list.map((m) => (
            <div
              key={m.id}
              className="flex h-11 items-center gap-4 px-2"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="w-24 shrink-0 truncate" style={{ fontSize: 14, color: "var(--text)" }}>
                {m.full_name}
              </span>
              <span
                className="w-48 shrink-0 truncate"
                style={{ fontSize: 13, color: "var(--text-muted)" }}
              >
                {m.email}
              </span>
              <span className="w-24 shrink-0">
                <RoleBadge role={m.role} />
              </span>
              <span className="w-20 shrink-0 truncate" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {m.team_id ? (teamNameById.get(m.team_id) ?? "-") : "-"}
              </span>
              <span className="w-20 shrink-0 truncate" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {m.mentor_id ? (nameById.get(m.mentor_id) ?? "-") : "-"}
              </span>
              <span
                className="mono w-24 shrink-0"
                style={{ fontSize: 13, color: "var(--text-muted)" }}
              >
                {m.hire_date ?? "-"}
              </span>
              <span className="flex flex-1 items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" disabled>
                  수정
                </Button>
                <span
                  className="shrink-0 rounded-sm px-2 py-0.5"
                  style={{
                    fontSize: 12,
                    color: "var(--text-faint)",
                    background: "var(--bg-sunken)",
                  }}
                >
                  준비 중
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
