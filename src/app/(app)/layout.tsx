import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ink-50">
      <Sidebar />
      <div className="pl-[68px]">{children}</div>
    </div>
  );
}
