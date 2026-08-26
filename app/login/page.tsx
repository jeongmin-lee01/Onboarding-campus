import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen justify-center px-4"
      style={{ background: "var(--bg-subtle)" }}
    >
      <div style={{ marginTop: "45vh", transform: "translateY(-50%)" }}>
        <LoginForm />
      </div>
    </div>
  );
}
