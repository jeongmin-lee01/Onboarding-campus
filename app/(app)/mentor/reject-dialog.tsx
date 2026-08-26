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
import { rejectTask } from "@/lib/actions/plan-tasks";

export function RejectDialog({
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

  function handleReject() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("반려 사유를 입력해야 합니다.");
      return;
    }
    startTransition(async () => {
      const result = await rejectTask(taskId, trimmed);
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
          <DialogTitle>반려 사유</DialogTitle>
          <DialogDescription>반려 사유를 입력해야 처리할 수 있습니다.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          placeholder="반려 사유를 입력하세요."
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
          <Button type="button" variant="danger" disabled={isPending} onClick={handleReject}>
            {isPending && <Loader2 className="animate-spin" />}
            반려
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
