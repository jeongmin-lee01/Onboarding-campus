"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EditDueDateDialog } from "@/components/edit-due-date-dialog";

export function EditDueDateButton({ taskId, dueDate }: { taskId: string; dueDate: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        수정
      </Button>
      <EditDueDateDialog taskId={taskId} currentDueDate={dueDate} open={open} onOpenChange={setOpen} />
    </>
  );
}
