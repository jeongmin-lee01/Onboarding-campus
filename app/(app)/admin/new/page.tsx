import { createClient } from "@/lib/supabase/server";
import { NewNewbieForm } from "@/components/new-newbie-form";

export const dynamic = "force-dynamic";

export default async function NewNewbiePage() {
  const supabase = await createClient();

  const [{ data: teams }, { data: mentors }, { data: templates }] = await Promise.all([
    supabase.from("teams").select("id, name").order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, team_id")
      .eq("role", "mentor")
      .order("full_name", { ascending: true }),
    supabase.from("templates").select("id, name").order("name", { ascending: true }),
  ]);

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
        신입 등록
      </h1>
      <NewNewbieForm teams={teams ?? []} mentors={mentors ?? []} templates={templates ?? []} />
    </div>
  );
}
