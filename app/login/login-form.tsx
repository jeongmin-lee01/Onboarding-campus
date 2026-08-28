"use client";

import { useActionState } from "react";
import { signInWithPassword, signInWithDemoAccount } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEMO_ACCOUNTS = [
  {
    group: "신입사원",
    items: [
      { email: "newbie@demo.com", label: "김신입 — 온보딩 진행 중" },
      { email: "newbie2@demo.com", label: "정신입 — 입사 예정 (D-5)" },
      { email: "newbie3@demo.com", label: "한신입 — 온보딩 마무리 단계" },
    ],
  },
  {
    group: "사수",
    items: [{ email: "mentor@demo.com", label: "이사수 — 개발팀" }],
  },
  {
    group: "팀장",
    items: [{ email: "leader@demo.com", label: "박팀장 — 개발팀" }],
  },
  {
    group: "인사담당자",
    items: [{ email: "hr@demo.com", label: "최인사 — 전사" }],
  },
];

const DEMO_ACCOUNT_ITEMS = DEMO_ACCOUNTS.flatMap((group) =>
  group.items.map((item) => ({ value: item.email, label: item.label }))
);

type ActionState = { error: string } | undefined;

export function LoginForm() {
  const [loginState, loginAction, loginPending] = useActionState<
    ActionState,
    FormData
  >((_prev, formData) => signInWithPassword(formData), undefined);

  const [demoState, demoAction, demoPending] = useActionState<
    ActionState,
    FormData
  >((_prev, formData) => signInWithDemoAccount(formData), undefined);

  return (
    <div
      className="w-[360px] rounded-lg border p-6"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <h1
        className="text-center"
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 22,
          lineHeight: "30px",
          fontWeight: 600,
          letterSpacing: 0,
          color: "var(--text)",
        }}
      >
        Onboarding Campus
      </h1>

      <form action={loginAction} className="mt-6 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {loginState?.error && (
          <p className="text-sm" style={{ color: "var(--st-overdue)" }}>
            {loginState.error}
          </p>
        )}
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={loginPending}>
          {loginPending ? "로그인 중..." : "로그인"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: "var(--border)" }} />
        <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-faint)" }}>
          또는 데모 계정으로
        </span>
        <div className="h-px flex-1" style={{ background: "var(--border)" }} />
      </div>

      <form action={demoAction} className="flex flex-col gap-3">
        <Select
          name="demoEmail"
          defaultValue="newbie@demo.com"
          items={DEMO_ACCOUNT_ITEMS}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEMO_ACCOUNTS.map((group) => (
              <SelectGroup key={group.group}>
                <SelectLabel>{group.group}</SelectLabel>
                {group.items.map((item) => (
                  <SelectItem key={item.email} value={item.email}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {demoState?.error && (
          <p className="text-sm" style={{ color: "var(--st-overdue)" }}>
            {demoState.error}
          </p>
        )}
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={demoPending}
        >
          {demoPending ? "로그인 중..." : "데모 로그인"}
        </Button>
      </form>
    </div>
  );
}
