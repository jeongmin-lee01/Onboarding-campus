import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/roles";
import { signOut } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";

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

      <div className="flex items-center gap-3">
        {name && (
          <span className="flex items-center gap-2">
            <span style={{ fontSize: 14, color: "var(--text)" }}>{name}</span>
            <span
              className="rounded-sm px-2 py-0.5"
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
