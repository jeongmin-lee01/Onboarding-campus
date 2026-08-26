export const ROLE_HOME: Record<string, string> = {
  newbie: "/my",
  mentor: "/mentor",
  leader: "/team",
  hr: "/admin",
};

export const ROLE_LABEL: Record<string, string> = {
  newbie: "신입사원",
  mentor: "사수",
  leader: "팀장",
  hr: "인사담당자",
};

export const PROTECTED_PREFIXES: { prefix: string; roles: string[] }[] = [
  { prefix: "/my", roles: ["newbie"] },
  { prefix: "/mentor", roles: ["mentor"] },
  { prefix: "/team", roles: ["leader"] },
  { prefix: "/admin", roles: ["hr"] },
  { prefix: "/plan", roles: ["mentor", "leader", "hr"] },
];

/** task.owner_role -> 이 태스크를 볼 수 있는 뷰어 role 목록. 담당 등급 이상만 볼 수 있다. */
const TASK_VISIBLE_TO: Record<string, string[]> = {
  newbie: ["newbie", "mentor", "leader", "hr"],
  mentor: ["mentor", "leader", "hr"],
  leader: ["leader", "hr"],
  hr: ["hr"],
};

export function canViewTask(viewerRole: string, ownerRole: string): boolean {
  return TASK_VISIBLE_TO[ownerRole]?.includes(viewerRole) ?? true;
}
