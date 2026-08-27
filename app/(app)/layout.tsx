import { Header } from "@/components/header";
import { ToastProvider } from "@/components/toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </ToastProvider>
  );
}
