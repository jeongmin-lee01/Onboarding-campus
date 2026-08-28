import { Header } from "@/components/header";
import { ToastProvider } from "@/components/toast";
import { DateTravelProvider } from "@/lib/date-travel-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DateTravelProvider>
      <ToastProvider>
        <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
          <Header />
          <main className="flex-1">{children}</main>
        </div>
      </ToastProvider>
    </DateTravelProvider>
  );
}
