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
        <div className="flex flex-col h-screen md:ml-[var(--sidebar-width-icon)] lg:ml-[var(--sidebar-width)] group-data-[sidebar-state=collapsed]/sidebar-wrapper:lg:ml-[var(--sidebar-width-icon)] transition-all duration-200 ease-in-out">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="flex flex-col gap-4 lg:gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
