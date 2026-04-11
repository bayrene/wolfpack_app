'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  UtensilsCrossed,
  Settings,
  Sparkles,
  PawPrint,
  Heart,
  Repeat,
  MoreHorizontal,
  X,
  TrendingUp,
  UserRoundCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const NAV_ORDER_KEY = 'vitae-nav-order';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const allNavItems: NavItem[] = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/meals', label: 'Meals', icon: CalendarDays },
  { href: '/kitchen', label: 'Kitchen', icon: UtensilsCrossed },
  { href: '/grooming', label: 'Self Care', icon: Sparkles },
  { href: '/habits', label: 'Wellness', icon: Repeat },
  { href: '/vet', label: 'Vet', icon: PawPrint },
  { href: '/dates', label: 'Dates', icon: Heart },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const defaultMobileItems: NavItem[] = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/meals', label: 'Meals', icon: CalendarDays },
  { href: '/kitchen', label: 'Kitchen', icon: UtensilsCrossed },
  { href: '/habits', label: 'Wellness', icon: Repeat },
  { href: '/grooming', label: 'Self Care', icon: Sparkles },
];

function getMobileItems(savedOrder: string[] | null): NavItem[] {
  if (!savedOrder || savedOrder.length === 0) return defaultMobileItems;
  const itemMap = new Map(allNavItems.map((item) => [item.href, item]));
  const ordered: NavItem[] = [];
  for (const href of savedOrder) {
    const item = itemMap.get(href);
    if (item) ordered.push(item);
  }
  if (ordered.length === 0) return defaultMobileItems;
  return ordered.slice(0, 4); // Show 4 + "More"
}

export function MobileNav() {
  const pathname = usePathname();
  const [mobileNavItems, setMobileNavItems] = useState<NavItem[]>(defaultMobileItems.slice(0, 4));
  const [overflowItems, setOverflowItems] = useState<NavItem[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NAV_ORDER_KEY);
      const savedOrder: string[] | null = raw ? JSON.parse(raw) : null;
      const primary = getMobileItems(savedOrder);
      const primaryHrefs = new Set(primary.map((i) => i.href));
      const overflow = allNavItems.filter((i) => !primaryHrefs.has(i.href));
      setMobileNavItems(primary);
      setOverflowItems(overflow);
    } catch {
      setMobileNavItems(defaultMobileItems.slice(0, 4));
      setOverflowItems(allNavItems.filter((i) => !defaultMobileItems.slice(0, 4).find((d) => d.href === i.href)));
    }
  }, []);

  // Close "More" drawer when navigating
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  return (
    <>
      {/* More drawer overlay */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer */}
      {moreOpen && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-50 bg-white dark:bg-[#232321] border-t border-neutral-200 dark:border-neutral-700 rounded-t-2xl shadow-xl pb-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
            <span className="text-sm font-semibold">All Sections</span>
            <button onClick={() => setMoreOpen(false)} className="text-neutral-400 hover:text-neutral-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 p-3">
            {overflowItems.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl transition-colors',
                    isActive
                      ? 'bg-[#E07A3A]/10 text-[#E07A3A]'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => {
                document.cookie = 'profile=; path=/; max-age=0';
                window.location.href = '/select-profile?from=' + encodeURIComponent(pathname);
              }}
              className="flex flex-col items-center gap-1 p-3 rounded-xl transition-colors text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <UserRoundCog className="w-5 h-5" />
              <span className="text-[10px] font-medium text-center leading-tight">Switch Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#232321]">
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[56px]',
                  isActive ? 'text-[#E07A3A]' : 'text-neutral-500 dark:text-neutral-400',
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[56px]',
              moreOpen ? 'text-[#E07A3A]' : 'text-neutral-500 dark:text-neutral-400',
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
