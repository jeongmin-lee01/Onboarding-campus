"use client";

import { useState, useTransition } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addPlanTask } from "@/lib/actions/plan-tasks";

const OWNER_ROLE_OPTIONS = [
  { value: "newbie", label: "신입" },
  { value: "mentor", label: "사수" },
  { value: "hr", label: "인사담당자" },
];

export function AddTaskDialog({
  planId,
  open,
  onOpenChange,
}: {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [ownerRole, setOwnerRole] = useState("newbie");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setDescription("");
    setDueDate("");
    setOwnerRole("newbie");
    setError(null);
  }

  function handleClose(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError("제목을 입력해야 합니다.");
      return;
    }
    if (!dueDate) {
      setError("마감일을 입력해야 합니다.");
      return;
    }
    startTransition(async () => {
      const result = await addPlanTask(planId, { title, description, dueDate, ownerRole });
      if (result?.error) {
        setError(result.error);
        return;
      }
      handleClose(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>태스크 추가</DialogTitle>
          <DialogDescription>온보딩 일정에 새 항목을 추가합니다.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-task-title">제목</Label>
          <Input
            id="add-task-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-task-description">설명</Label>
          <Textarea
            id="add-task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-task-due-date">마감일</Label>
          <Input
            id="add-task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              if (error) setError(null);
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-task-owner-role">담당자</Label>
          <Select
            items={OWNER_ROLE_OPTIONS}
            value={ownerRole}
            onValueChange={(value) => setOwnerRole(value as string)}
          >
            <SelectTrigger id="add-task-owner-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OWNER_ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p style={{ fontSize: 13, color: "var(--st-overdue)" }}>{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            취소
          </Button>
          <Button type="button" disabled={isPending} onClick={handleSubmit}>
            {isPending && <Loader2 className="animate-spin" />}
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
