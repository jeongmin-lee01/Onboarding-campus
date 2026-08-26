import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/role-badge";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name = "";
  let role = "";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    name = profile?.full_name ?? "";
    role = profile?.role ?? "";
  }

  return (
    <header
      className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b px-4 md:px-8"
      style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-6">
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--text)",
          }}
        >
          온보딩
        </span>
        {role === "hr" && (
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="transition-colors duration-150 hover:text-[var(--text)]"
              style={{ fontSize: 14, color: "var(--text-muted)" }}
            >
              전사 대시보드
            </Link>
            <Link
              href="/admin/members"
              className="transition-colors duration-150 hover:text-[var(--text)]"
              style={{ fontSize: 14, color: "var(--text-muted)" }}
            >
              구성원 목록
            </Link>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {name && (
          <span className="flex items-center gap-2">
            <span style={{ fontSize: 14, color: "var(--text)" }}>{name}</span>
            <RoleBadge role={role} />
          </span>
        )}
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      </div>
    </header>
  );
}
