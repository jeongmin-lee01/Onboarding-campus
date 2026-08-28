"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddTaskDialog } from "@/components/add-task-dialog";

export function AddTaskButton({ planId }: { planId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        태스크 추가
      </Button>
      <AddTaskDialog planId={planId} open={open} onOpenChange={setOpen} />
    </>
  );
}
