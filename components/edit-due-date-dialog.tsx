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
import { Button } from "@/components/ui/button";
import { updatePlanTaskDueDate } from "@/lib/actions/plan-tasks";

export function EditDueDateDialog({
  taskId,
  currentDueDate,
  open,
  onOpenChange,
}: {
  taskId: string;
  currentDueDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dueDate, setDueDate] = useState(currentDueDate);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setDueDate(currentDueDate);
      setError(null);
    }
  }

  function handleSave() {
    if (!dueDate) {
      setError("마감일을 입력해야 합니다.");
      return;
    }
    startTransition(async () => {
      const result = await updatePlanTaskDueDate(taskId, dueDate);
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
          <DialogTitle>마감일 수정</DialogTitle>
          <DialogDescription>
            마감일을 바꾸면 속한 시기(단계)도 자동으로 다시 계산됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`due-date-${taskId}`}>마감일</Label>
          <Input
            id={`due-date-${taskId}`}
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              if (error) setError(null);
            }}
            autoFocus
          />
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
