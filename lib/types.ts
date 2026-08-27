export type PlanTask = {
  id: string;
  title: string;
  description: string | null;
  owner_role: string;
  assignee_id: string | null;
  due_date: string;
  phase: string;
  is_required: boolean;
  sort_order: number;
  status: string;
  reject_reason: string | null;
  completed_at: string | null;
};
