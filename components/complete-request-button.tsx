"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestCompletion } from "@/lib/actions/plan-tasks";

export function CompleteRequestButton({ taskId }: { taskId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(async () => { await requestCompletion(taskId); })}
    >
      {isPending && <Loader2 className="animate-spin" />}
      완료 요청
    </Button>
  );
}
