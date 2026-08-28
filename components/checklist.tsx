"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  diffDays,
  formatDday,
  formatSeoulDateLabel,
  getSeoulToday,
  msUntilNextSeoulMidnight,
  PHASE_LABEL,
  PHASE_ORDER,
  type Phase,
} from "@/lib/dday";
import { TaskCard } from "@/components/task-card";
import { CompleteRequestButton } from "@/components/complete-request-button";
import { RevertButton } from "@/components/revert-button";
import { EditDueDateButton } from "@/components/edit-due-date-button";
import { canViewTask } from "@/lib/roles";
import { summarizeTasks } from "@/lib/plan-progress";
import type { PlanTask } from "@/lib/types";

export type TaskFilter = "all" | "active" | "done";

const FILTER_OPTIONS: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "active", label: "진행 필요" },
  { value: "done", label: "완료" },
];

const ACTIVE_STATUSES = new Set(["todo", "pending", "rejected"]);

function filterTasks(tasks: PlanTask[], filter: TaskFilter): PlanTask[] {
  if (filter === "all") return tasks;
  if (filter === "done") return tasks.filter((t) => t.status === "done");
  return tasks.filter((t) => ACTIVE_STATUSES.has(t.status));
}

function isPastDone(task: PlanTask, today: string): boolean {
  return task.status === "done" && diffDays(task.due_date, today) < 0;
}

type Row =
  | { type: "phase"; phase: Phase }
  | { type: "task"; task: PlanTask }
  | { type: "today" }
  | { type: "collapse-toggle"; count: number };

function buildRows(tasksByPhase: Record<string, PlanTask[]>, today: string): Row[] {
  const flatOrdered = PHASE_ORDER.flatMap((phase) => tasksByPhase[phase] ?? []);
  const firstFutureIdx = flatOrdered.findIndex((t) => diffDays(t.due_date, today) >= 0);

  const rows: Row[] = [];
  let taskCounter = 0;
  let todayInserted = false;

  for (const phase of PHASE_ORDER) {
    const tasks = tasksByPhase[phase];
    if (!tasks || tasks.length === 0) continue;
    rows.push({ type: "phase", phase });
    for (const task of tasks) {
      if (!todayInserted && taskCounter === firstFutureIdx) {
        rows.push({ type: "today" });
        todayInserted = true;
      }
      rows.push({ type: "task", task });
      taskCounter++;
    }
  }
  if (!todayInserted) rows.push({ type: "today" });

  return rows;
}

/** 오늘 이전 + 완료된 태스크를 하나의 펼치기 토글 뒤로 접는다. 정렬·타임라인 구조는 바꾸지 않는다. */
function applyPastDoneCollapse(rows: Row[], today: string, showPastDone: boolean): Row[] {
  const collapsedCount = rows.filter(
    (r) => r.type === "task" && isPastDone(r.task, today)
  ).length;
  if (collapsedCount === 0) return rows;

  const result: Row[] = [];
  let toggleInserted = false;
  for (const row of rows) {
    if (row.type === "task" && isPastDone(row.task, today)) {
      if (!toggleInserted) {
        result.push({ type: "collapse-toggle", count: collapsedCount });
        toggleInserted = true;
      }
      if (showPastDone) result.push(row);
      continue;
    }
    result.push(row);
  }
  return result;
}

/** 접힌 태스크만 있던 phase 헤더(밑에 남는 행이 없는 경우)를 숨긴다. */
function dropEmptyPhaseHeaders(rows: Row[]): Row[] {
  return rows.filter((row, i) => {
    if (row.type !== "phase") return true;
    for (let j = i + 1; j < rows.length && rows[j].type !== "phase"; j++) {
      if (rows[j].type === "task" || rows[j].type === "collapse-toggle") return true;
    }
    return false;
  });
}

function TodayDivider({
  today,
  innerRef,
}: {
  today: string;
  innerRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={innerRef} className="flex items-center gap-3 pt-1 pb-4">
      <div className="h-px flex-1" style={{ background: "var(--text)" }} />
      <span
        className="mono shrink-0"
        style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}
      >
        오늘 ({formatSeoulDateLabel(today)})
      </span>
    </div>
  );
}

function RailGutter({ node }: { node?: "done" | "pending" }) {
  return (
    <div className="relative w-6 shrink-0 md:w-8">
      <div
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
        style={{ background: "var(--border)" }}
      />
      {node && (
        <div
          className="absolute top-[23px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full"
          style={
            node === "done"
              ? { background: "var(--st-done)" }
              : { background: "var(--bg)", border: "1px solid var(--border-strong)" }
          }
        />
      )}
    </div>
  );
}

function CollapseToggleRow({
  count,
  expanded,
  onToggle,
}: {
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex gap-3 pb-3">
      <RailGutter />
      <div className="flex-1 pt-1">
        <button
          type="button"
          onClick={onToggle}
          className="transition-colors duration-150 hover:text-[var(--text)]"
          style={{ fontSize: 13, color: "var(--text-muted)" }}
        >
          {expanded ? "이전 완료 항목 접기" : `이전 완료 항목 ${count}개 보기`}
        </button>
      </div>
    </div>
  );
}

function FilterChips({
  value,
  onChange,
}: {
  value: TaskFilter;
  onChange: (filter: TaskFilter) => void;
}) {
  return (
    <div className="mb-4 flex gap-1.5">
      {FILTER_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="transition-colors duration-150"
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: "4px 12px",
              borderRadius: "var(--r-md)",
              border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
              background: selected ? "var(--accent)" : "var(--bg)",
              color: selected ? "var(--primary-foreground)" : "var(--text-muted)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ActionQueue({
  overdueTasks,
  todayCount,
  today,
  onJump,
}: {
  overdueTasks: PlanTask[];
  todayCount: number;
  today: string;
  onJump: (taskId: string) => void;
}) {
  if (overdueTasks.length === 0 && todayCount === 0) return null;

  return (
    <div
      className="mb-6 rounded-lg border p-4"
      style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}
    >
      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
        {overdueTasks.length > 0 && (
          <span style={{ color: "var(--st-overdue)" }}>지연 {overdueTasks.length}건</span>
        )}
        {overdueTasks.length > 0 && todayCount > 0 && " · "}
        {todayCount > 0 && <span>오늘 할 일 {todayCount}건</span>}
      </p>
      {overdueTasks.length > 0 && (
        <ul className="mt-3 flex flex-col gap-0.5">
          {overdueTasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onJump(task.id)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-[var(--bg-sunken)]"
              >
                <span style={{ fontSize: 13, color: "var(--text)" }}>{task.title}</span>
                <span
                  className="mono shrink-0"
                  style={{ fontSize: 12, color: "var(--st-overdue)" }}
                >
                  {formatDday(diffDays(task.due_date, today))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Checklist({
  tasks,
  currentUserId,
  assigneeLabels,
  initialToday,
  readOnly = false,
  allowRevert = false,
  allowEditDueDate = false,
  initialFilter = "all",
  viewerRole,
  filterByViewerRole = true,
}: {
  tasks: PlanTask[];
  currentUserId: string;
  /** task.id -> 메타 우측에 보여줄 담당자 텍스트. readOnly일 때는 모든 태스크에 대해 채워줘야 한다. */
  assigneeLabels: Record<string, string>;
  initialToday: string;
  /** true면 완료 요청 버튼을 렌더링하지 않는다 (사수/팀장/인사 등 제3자 조회용). */
  readOnly?: boolean;
  /** true면 완료(done) 카드에 되돌리기 버튼을 보여준다 (인사담당자 전용). */
  allowRevert?: boolean;
  /** true면 미완료 카드에 마감일 수정 버튼을 보여준다 (사수/팀장/인사 전용, /plan/[id]에서만 켠다). */
  allowEditDueDate?: boolean;
  /** 필터 칩 초기값. URL 쿼리(?filter=)에서 서버가 읽어 전달한다. readOnly일 때는 사용하지 않는다. */
  initialFilter?: TaskFilter;
  /** 로그인한 사용자의 role. owner_role 등급에 따라 어떤 태스크를 보여줄지 결정한다. */
  viewerRole: string;
  /** false면 owner_role 등급 필터를 건너뛰고 플랜 전체 태스크를 보여준다(진행률 분모와 화면 노출을 일치시키기 위함). 기본 true. */
  filterByViewerRole?: boolean;
}) {
  const [today, setToday] = useState(initialToday);
  const [filter, setFilter] = useState<TaskFilter>(initialFilter);
  const [showPastDone, setShowPastDone] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const todayRef = useRef<HTMLDivElement | null>(null);
  const taskRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasAutoScrolled = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setToday(getSeoulToday());
    }, msUntilNextSeoulMidnight());
    return () => clearTimeout(timer);
  }, [today]);

  // 진입 시 1회만: 오늘 선을 화면 상단 1/3 지점으로 스크롤한다.
  useEffect(() => {
    if (readOnly || hasAutoScrolled.current) return;
    hasAutoScrolled.current = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const raf = requestAnimationFrame(() => {
      const el = todayRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const targetTop = window.innerHeight / 3;
      const delta = rect.top - targetTop;
      window.scrollTo({
        top: window.scrollY + delta,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = useCallback(
    (next: TaskFilter) => {
      setFilter(next);
      const qs = next === "all" ? "" : `?filter=${next}`;
      router.replace(`${pathname}${qs}`, { scroll: false });
    },
    [router, pathname]
  );

  const handleJumpToTask = useCallback(
    (taskId: string) => {
      if (filter !== "all") handleFilterChange("all");
      setPendingScrollId(taskId);
    },
    [filter, handleFilterChange]
  );

  // pendingScrollId가 설정되면 매 렌더마다 대상 ref가 DOM에 있는지 재시도한다.
  // (필터 전환으로 방금 나타난 행일 수 있어 한 번에 못 찾을 수 있다.)
  useEffect(() => {
    if (!pendingScrollId) return;
    const el = taskRefs.current.get(pendingScrollId);
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    setHighlightedTaskId(pendingScrollId);
    setPendingScrollId(null);
  });

  // 강조 표시는 별도 effect에서 관리한다 — 위 effect는 매 렌더마다 재실행되므로
  // 같은 effect에 타이머를 두면 정리(cleanup)가 타이머를 바로 취소해 버린다.
  useEffect(() => {
    if (!highlightedTaskId) return;
    const timer = setTimeout(() => setHighlightedTaskId(null), 1500);
    return () => clearTimeout(timer);
  }, [highlightedTaskId]);

  // 진행률 막대는 플랜 전체 기준(등급 필터 미적용)으로 유지한다 — /mentor·/team·/admin의 summarizeTasks와 같은 함수를 써서 숫자를 맞춘다.
  const { total, done: doneCount } = summarizeTasks(tasks, today);

  if (total === 0) {
    return (
      <div className="py-12 text-center">
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>
          오늘 예정된 항목이 없습니다.
        </p>
      </div>
    );
  }

  // 그 외(액션 큐, 타임라인)도 진행률과 같은 집합을 쓴다. filterByViewerRole이 true일 때만
  // (예: /plan/[id]의 제3자 조회) 뷰어 등급에서 볼 수 있는 태스크로 좁힌다.
  const visibleTasks = filterByViewerRole
    ? tasks.filter((t) => canViewTask(viewerRole, t.owner_role))
    : tasks;
  const todayCount = visibleTasks.filter(
    (t) => t.status !== "done" && diffDays(t.due_date, today) === 0
  ).length;
  const overdueTasks = visibleTasks.filter(
    (t) => t.status !== "done" && diffDays(t.due_date, today) < 0
  );
  const overdueCount = overdueTasks.length;

  const activeFilter = readOnly ? "all" : filter;
  const filteredTasks = filterTasks(visibleTasks, activeFilter);

  const tasksByPhase: Record<string, PlanTask[]> = {};
  for (const task of filteredTasks) {
    (tasksByPhase[task.phase] ??= []).push(task);
  }
  const baseRows = buildRows(tasksByPhase, today);
  const rows = readOnly
    ? baseRows
    : dropEmptyPhaseHeaders(applyPastDoneCollapse(baseRows, today, showPastDone));

  return (
    <div>
      {!readOnly && (
        <ActionQueue
          overdueTasks={overdueTasks}
          todayCount={todayCount}
          today={today}
          onJump={handleJumpToTask}
        />
      )}

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden"
            style={{ background: "var(--bg-sunken)", borderRadius: 999 }}
          >
            <div
              className="h-full"
              style={{
                width: total ? `${(doneCount / total) * 100}%` : "0%",
                background: "var(--accent)",
                borderRadius: 999,
              }}
            />
          </div>
          <span className="mono shrink-0" style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {doneCount}/{total}
          </span>
        </div>
        <div className="mt-2 flex gap-4">
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            오늘 할 일 {todayCount}건
          </span>
          {overdueCount > 0 && (
            <span style={{ fontSize: 13, color: "var(--st-overdue)" }}>
              지연 {overdueCount}건
            </span>
          )}
        </div>
        {!filterByViewerRole && (
          <p className="mt-1" style={{ fontSize: 13, color: "var(--text-faint)" }}>
            전체 {total}개 중 {doneCount}개 완료 (내 담당 외 항목 포함)
          </p>
        )}
      </div>

      {!readOnly && <FilterChips value={filter} onChange={handleFilterChange} />}

      {filteredTasks.length === 0 ? (
        <div className="py-12 text-center">
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>
            해당하는 항목이 없습니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {rows.map((row, i) => {
            if (row.type === "today") {
              return <TodayDivider key={`today-${i}`} today={today} innerRef={(el) => (todayRef.current = el)} />;
            }
            if (row.type === "collapse-toggle") {
              return (
                <CollapseToggleRow
                  key={`collapse-${i}`}
                  count={row.count}
                  expanded={showPastDone}
                  onToggle={() => setShowPastDone((v) => !v)}
                />
              );
            }
            if (row.type === "phase") {
              return (
                <div key={`phase-${row.phase}`} className="flex gap-3 pb-2">
                  <RailGutter />
                  <div
                    className="flex-1 pt-2"
                    style={{
                      fontSize: 15,
                      lineHeight: "20px",
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      color: "var(--text)",
                    }}
                  >
                    {PHASE_LABEL[row.phase]}
                  </div>
                </div>
              );
            }
            const task = row.task;
            const isMine = !readOnly && task.assignee_id === currentUserId;
            const canRequest = isMine && (task.status === "todo" || task.status === "rejected");
            const canRevert = allowRevert && task.status === "done";
            const canEditDueDate = allowEditDueDate && task.status !== "done";
            const actionNodes: React.ReactNode[] = [];
            if (canRequest) actionNodes.push(<CompleteRequestButton key="request" taskId={task.id} />);
            if (canRevert) actionNodes.push(<RevertButton key="revert" taskId={task.id} />);
            if (canEditDueDate) {
              actionNodes.push(
                <EditDueDateButton key="edit" taskId={task.id} dueDate={task.due_date} />
              );
            }
            const action =
              actionNodes.length > 0 ? (
                <div className="flex items-center gap-2">{actionNodes}</div>
              ) : undefined;
            const highlighted = highlightedTaskId === task.id;
            return (
              <div
                key={task.id}
                ref={(el) => {
                  if (el) taskRefs.current.set(task.id, el);
                  else taskRefs.current.delete(task.id);
                }}
                className="flex gap-3 pb-3 transition-[outline-color] duration-200"
                style={{
                  borderRadius: "var(--r-lg)",
                  outline: highlighted ? "2px solid var(--accent)" : "2px solid transparent",
                  outlineOffset: 2,
                }}
              >
                <RailGutter node={task.status === "done" ? "done" : "pending"} />
                <div className="flex-1">
                  <TaskCard
                    task={task}
                    today={today}
                    isMine={isMine}
                    assigneeLabel={assigneeLabels[task.id] ?? null}
                    action={action}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
