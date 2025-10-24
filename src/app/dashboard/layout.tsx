import { SidebarProvider, Sidebar } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { SidebarNav } from '@/components/sidebar-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full">
        <Sidebar>
            <SidebarNav />
        </Sidebar>
        <div className="flex h-screen flex-col lg:pl-[16rem]">
          <DashboardHeader />
          <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
