"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeTaskDirectly } from "@/lib/actions/plan-tasks";
import { useToast } from "@/components/toast";

export function CompleteNowButton({ taskId }: { taskId: string }) {
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  return (
    <Button
      type="button"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const { error } = await completeTaskDirectly(taskId);
          if (!error) showToast("완료됨");
        })
      }
    >
      {isPending && <Loader2 className="animate-spin" />}
      완료
    </Button>
  );
}
