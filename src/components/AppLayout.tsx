import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex h-14 items-center border-b bg-card/50 px-4 backdrop-blur-sm lg:px-6">
            <SidebarTrigger />
          </div>
          <div className="p-4 pb-20 lg:p-6 lg:pb-6">{children}</div>
        </main>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
