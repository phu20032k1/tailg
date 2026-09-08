import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { AppHeader } from "@/components/app-header";
import { ChatPopup } from "@/components/chat-popup";
import { NavigationLoading } from "@/components/navigation-loading";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="app-shell">
      <Sidebar user={user} />
      <main className="main-shell">
        <AppHeader user={user} />
        <div className="page-shell">{children}</div>
      </main>
      <ChatPopup user={user} />
      <Suspense fallback={null}>
        <NavigationLoading />
      </Suspense>
    </div>
  );
}
