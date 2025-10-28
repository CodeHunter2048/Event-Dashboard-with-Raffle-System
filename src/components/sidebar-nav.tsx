'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Gift,
  QrCode,
  Trophy,
  BarChart,
  Shield,
  Tv,
  Package2,
  UserCog,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/attendees', icon: Users, label: 'Attendees' },
  { href: '/dashboard/prizes', icon: Gift, label: 'Prizes' },
  { href: '/dashboard/check-in', icon: QrCode, label: 'Check-in' },
  { href: '/dashboard/drawing', icon: Trophy, label: 'Draw' },
  { href: '/dashboard/analytics', icon: BarChart, label: 'Analytics' },
  { href: '/dashboard/security', icon: Shield, label: 'Security' },
  { href: '/display', icon: Tv, label: 'Public Display' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { isAdmin, isPresenter, userAccount } = useAuth();

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter((item) => {
    // Only show Analytics and Security to admin users
    if (item.href === '/dashboard/analytics' || item.href === '/dashboard/security') {
      return isAdmin;
    }
    
    // Presenters only have access to Dashboard, Prizes, and Draw
    if (isPresenter) {
      return item.href === '/dashboard' || 
             item.href === '/dashboard/prizes' || 
             item.href === '/dashboard/drawing';
    }
    
    return true;
  });

  return (
    <SidebarContent>
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Package2 className="h-6 w-6 text-primary" />
          <span className="">AI for IA</span>
        </Link>
      </div>
      <nav className="grid items-start px-2 text-sm font-medium lg:px-4 pt-2">
        <SidebarMenu>
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={
                  item.href === '/dashboard'
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
                }
                className="justify-start"
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {isAdmin && (
            <SidebarMenuItem key="/dashboard/manage-accounts">
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/dashboard/manage-accounts')}
                className="justify-start"
              >
                <Link href="/dashboard/manage-accounts">
                  <UserCog className="h-4 w-4" />
                  Manage Accounts
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </nav>
    </SidebarContent>
  );
}
