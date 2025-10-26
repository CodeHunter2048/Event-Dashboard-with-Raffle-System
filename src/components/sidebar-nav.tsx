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
  UserPlus,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth as clientAuth } from '@/lib/firebase';
import { useEffect, useState } from 'react';

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

const adminNavItem = { href: '/dashboard/add-user', icon: UserPlus, label: 'Add User' };

export function SidebarNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(clientAuth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

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
          {navItems.map((item) => (
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
            <SidebarMenuItem key={adminNavItem.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(adminNavItem.href)}
                className="justify-start"
              >
                <Link href={adminNavItem.href}>
                  <adminNavItem.icon className="h-4 w-4" />
                  {adminNavItem.label}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </nav>
    </SidebarContent>
  );
}
