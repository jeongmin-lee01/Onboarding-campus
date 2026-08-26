"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RevertDialog } from "@/components/revert-dialog";

export function RevertButton({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        되돌리기
      </Button>
      <RevertDialog taskId={taskId} open={open} onOpenChange={setOpen} />
    </>
  );
}
