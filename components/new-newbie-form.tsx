"use client";

import { useActionState, useMemo, useState } from "react";
import { createNewbie } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Team = { id: string; name: string };
type Mentor = { id: string; full_name: string; team_id: string | null };
type Template = { id: string; name: string };

type ActionState = { error: string } | undefined;

export function NewNewbieForm({
  teams,
  mentors,
  templates,
}: {
  teams: Team[];
  mentors: Mentor[];
  templates: Template[];
}) {
  const [teamId, setTeamId] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    (_prev, formData) => createNewbie(formData),
    undefined
  );

  const teamItems = teams.map((t) => ({ value: t.id, label: t.name }));
  const templateItems = templates.map((t) => ({ value: t.id, label: t.name }));

  const teamMentors = useMemo(
    () => mentors.filter((m) => m.team_id === teamId),
    [mentors, teamId]
  );
  const mentorItems = teamMentors.map((m) => ({ value: m.id, label: m.full_name }));

  return (
    <form action={formAction} className="flex max-w-[420px] flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">이름</Label>
        <Input id="full_name" name="full_name" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">이메일</Label>
        <Input id="email" name="email" type="email" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="team_id">팀</Label>
        <Select
          name="team_id"
          items={teamItems}
          value={teamId}
          onValueChange={(value) => {
            setTeamId(value as string);
            setMentorId("");
          }}
        >
          <SelectTrigger id="team_id" className="w-full">
            <SelectValue placeholder="팀을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {teamItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mentor_id">담당 사수</Label>
        <Select
          name="mentor_id"
          items={mentorItems}
          value={mentorId}
          onValueChange={(value) => setMentorId(value as string)}
          disabled={!teamId}
        >
          <SelectTrigger id="mentor_id" className="w-full">
            <SelectValue
              placeholder={teamId ? "사수를 선택하세요 (선택 사항)" : "팀을 먼저 선택하세요"}
            />
          </SelectTrigger>
          <SelectContent>
            {teamMentors.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {teamId && teamMentors.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
            이 팀에는 등록된 사수가 없습니다. 비워두면 사수 담당 태스크는 담당자 없이 생성됩니다.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hire_date">입사일</Label>
        <Input id="hire_date" name="hire_date" type="date" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="template_id">템플릿</Label>
        <Select
          name="template_id"
          items={templateItems}
          value={templateId}
          onValueChange={(value) => setTemplateId(value as string)}
        >
          <SelectTrigger id="template_id" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {templateItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state?.error && (
        <p style={{ fontSize: 13, color: "var(--st-overdue)" }}>{state.error}</p>
      )}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "등록 중..." : "등록"}
      </Button>
    </form>
  );
}
