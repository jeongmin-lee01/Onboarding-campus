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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { revertTask } from "@/lib/actions/plan-tasks";

export function RevertDialog({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setReason("");
      setError(null);
    }
  }

  function handleRevert() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("되돌리기 사유를 입력해야 합니다.");
      return;
    }
    startTransition(async () => {
      const result = await revertTask(taskId, trimmed);
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
          <DialogTitle>되돌리기 사유</DialogTitle>
          <DialogDescription>
            완료 처리를 취소하는 사유를 입력해야 처리할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          placeholder="되돌리기 사유를 입력하세요."
          rows={4}
          autoFocus
        />
        {error && (
          <p style={{ fontSize: 13, color: "var(--st-overdue)" }}>{error}</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            취소
          </Button>
          <Button type="button" variant="outline" disabled={isPending} onClick={handleRevert}>
            {isPending && <Loader2 className="animate-spin" />}
            되돌리기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
