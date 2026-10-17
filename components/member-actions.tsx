"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/toast";
import { deleteNewbie, updateNewbie } from "@/lib/actions/admin";

type Team = { id: string; name: string };
type Mentor = { id: string; full_name: string; team_id: string | null };
type Member = {
  id: string;
  full_name: string;
  team_id: string | null;
  mentor_id: string | null;
  hire_date: string | null;
};

const NO_MENTOR = "none";

/** /admin/members 신입 행의 수정·삭제 버튼과 확인 창. PRD F13(신입 대상) + 신입 삭제. */
export function MemberActions({
  member,
  teams,
  mentors,
}: {
  member: Member;
  teams: Team[];
  mentors: Mentor[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        수정
      </Button>
      <Button type="button" variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
        삭제
      </Button>
      <EditMemberDialog
        member={member}
        teams={teams}
        mentors={mentors}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteMemberDialog member={member} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

function EditMemberDialog({
  member,
  teams,
  mentors,
  open,
  onOpenChange,
}: {
  member: Member;
  teams: Team[];
  mentors: Mentor[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const showToast = useToast();
  const [fullName, setFullName] = useState(member.full_name);
  const [teamId, setTeamId] = useState(member.team_id ?? "");
  const [mentorId, setMentorId] = useState(member.mentor_id ?? NO_MENTOR);
  const [hireDate, setHireDate] = useState(member.hire_date ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const teamItems = teams.map((t) => ({ value: t.id, label: t.name }));
  const teamMentors = useMemo(() => mentors.filter((m) => m.team_id === teamId), [mentors, teamId]);
  const mentorItems = [
    { value: NO_MENTOR, label: "지정 안 함" },
    ...teamMentors.map((m) => ({ value: m.id, label: m.full_name })),
  ];

  function handleClose(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setFullName(member.full_name);
      setTeamId(member.team_id ?? "");
      setMentorId(member.mentor_id ?? NO_MENTOR);
      setHireDate(member.hire_date ?? "");
      setError(null);
    }
  }

  function handleSave() {
    if (!fullName.trim() || !teamId || !hireDate) {
      setError("이름·팀·입사일을 모두 입력해야 합니다.");
      return;
    }
    startTransition(async () => {
      const result = await updateNewbie(member.id, {
        fullName,
        teamId,
        mentorId: mentorId === NO_MENTOR ? null : mentorId,
        hireDate,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      setError(null);
      showToast("저장됨");
    });
  }

  const dateChanged = Boolean(member.hire_date) && hireDate !== member.hire_date;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>신입 정보 수정</DialogTitle>
          <DialogDescription>
            팀이나 사수를 바꾸면 아직 끝나지 않은 사수·팀장 담당 태스크의 담당자도 함께 바뀝니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`name-${member.id}`}>이름</Label>
          <Input
            id={`name-${member.id}`}
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (error) setError(null);
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`team-${member.id}`}>팀</Label>
          <Select
            items={teamItems}
            value={teamId}
            onValueChange={(value) => {
              setTeamId(value as string);
              setMentorId(NO_MENTOR);
              if (error) setError(null);
            }}
          >
            <SelectTrigger id={`team-${member.id}`} className="w-full">
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
          <Label htmlFor={`mentor-${member.id}`}>담당 사수</Label>
          <Select
            items={mentorItems}
            value={mentorId}
            onValueChange={(value) => {
              setMentorId(value as string);
              if (error) setError(null);
            }}
            disabled={!teamId}
          >
            <SelectTrigger id={`mentor-${member.id}`} className="w-full">
              <SelectValue placeholder="팀을 먼저 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {mentorItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`hire-${member.id}`}>입사일</Label>
          <Input
            id={`hire-${member.id}`}
            type="date"
            value={hireDate}
            onChange={(e) => {
              setHireDate(e.target.value);
              if (error) setError(null);
            }}
          />
          {dateChanged && (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              입사일을 바꾸면 온보딩 일정의 모든 마감일이 같은 일수만큼 함께 이동합니다.
            </p>
          )}
        </div>

        {error && <p style={{ fontSize: 13, color: "var(--st-overdue)" }}>{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            취소
          </Button>
          <Button type="button" disabled={isPending} onClick={handleSave}>
            {isPending && <Loader2 className="animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMemberDialog({
  member,
  open,
  onOpenChange,
}: {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const showToast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose(next: boolean) {
    onOpenChange(next);
    if (!next) setError(null);
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteNewbie(member.id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      showToast("삭제됨");
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member.full_name} 삭제</DialogTitle>
          <DialogDescription>
            로그인 계정과 온보딩 일정, 모든 태스크가 함께 삭제됩니다. 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        {error && <p style={{ fontSize: 13, color: "var(--st-overdue)" }}>{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            취소
          </Button>
          <Button type="button" variant="danger" disabled={isPending} onClick={handleDelete}>
            {isPending && <Loader2 className="animate-spin" />}
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
