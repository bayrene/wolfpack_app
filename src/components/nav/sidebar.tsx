'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  UtensilsCrossed,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  Sparkles,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Check,
  PawPrint,
  Heart,
  Repeat,
  TrendingUp,
  UserRoundCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
const NAV_ORDER_KEY = 'vitae-nav-order';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/meals', label: 'Meals', icon: CalendarDays },
  { href: '/kitchen', label: 'Kitchen', icon: UtensilsCrossed },
  { href: '/grooming', label: 'Self Care', icon: Sparkles },
  { href: '/habits', label: 'Wellness', icon: Repeat },
  { href: '/vet', label: 'Vet & Dogs', icon: PawPrint },
  { href: '/dates', label: 'Date Nights', icon: Heart },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
];

type NavItem = (typeof navItems)[number];

function getOrderedItems(savedOrder: string[] | null): NavItem[] {
  if (!savedOrder || savedOrder.length === 0) return navItems;
  const itemMap = new Map(navItems.map((item) => [item.href, item]));
  const ordered: NavItem[] = [];
  for (const href of savedOrder) {
    const item = itemMap.get(href);
    if (item) {
      ordered.push(item);
      itemMap.delete(href);
    }
  }
  // Append any items not in the saved order (new pages added later)
  for (const item of itemMap.values()) {
    ordered.push(item);
  }
  return ordered;
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [editMode, setEditMode] = useState(false);
  const [orderedItems, setOrderedItems] = useState<NavItem[]>(navItems);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NAV_ORDER_KEY);
      if (raw) {
        const savedOrder: string[] = JSON.parse(raw);
        setOrderedItems(getOrderedItems(savedOrder));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const saveOrder = useCallback((items: NavItem[]) => {
    const hrefs = items.map((i) => i.href);
    localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(hrefs));
  }, []);

  const moveItem = useCallback(
    (index: number, direction: 'up' | 'down') => {
      setOrderedItems((prev) => {
        const next = [...prev];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= next.length) return prev;
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
        saveOrder(next);
        return next;
      });
    },
    [saveOrder],
  );

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#232321] transition-all duration-200 h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-neutral-200 dark:border-neutral-700">
        <span className="text-2xl flex-shrink-0">🐺</span>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Villalobos
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {orderedItems.map((item, index) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <div key={item.href} className="flex items-center gap-0.5">
              {editMode && !collapsed && (
                <div className="flex flex-col -mr-0.5">
                  <button
                    onClick={() => moveItem(index, 'up')}
                    className={cn(
                      'p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors',
                      index === 0 && 'opacity-0 pointer-events-none',
                    )}
                    aria-label={`Move ${item.label} up`}
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveItem(index, 'down')}
                    className={cn(
                      'p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors',
                      index === orderedItems.length - 1 && 'opacity-0 pointer-events-none',
                    )}
                    aria-label={`Move ${item.label} down`}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 flex-1',
                  isActive
                    ? 'bg-[#E07A3A]/10 text-[#E07A3A]'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 p-2 space-y-1">
        <button
          onClick={() => setEditMode(!editMode)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-colors duration-150',
            editMode
              ? 'bg-[#E07A3A]/10 text-[#E07A3A]'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800',
          )}
        >
          {editMode ? <Check className="w-5 h-5" /> : <GripVertical className="w-5 h-5" />}
          {!collapsed && <span>{editMode ? 'Done' : 'Reorder'}</span>}
        </button>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 w-full transition-colors duration-150"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          {!collapsed && <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>}
        </button>
        <button
          onClick={() => {
            document.cookie = 'profile=; path=/; max-age=0';
            window.location.href = '/select-profile?from=' + encodeURIComponent(pathname);
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 w-full transition-colors duration-150"
        >
          <UserRoundCog className="w-5 h-5" />
          {!collapsed && <span>Switch Profile</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 w-full transition-colors duration-150"
        >
          {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
