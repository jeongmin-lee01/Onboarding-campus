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
];
