'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Sun, Moon, Plus, Bell } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

interface TopbarProps {
  onOpenSidebar: () => void;
  onOpenAddExpense?: () => void;
}

export function Topbar({ onOpenSidebar, onOpenAddExpense }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & welcome */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Welcome, {user?.full_name?.split(' ')[0] || 'Ramesh'} 👋
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Track and manage your family's expenses easily
          </p>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenAddExpense && (
          <Button
            size="sm"
            onClick={onOpenAddExpense}
            className="hidden sm:inline-flex"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </Button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Profile Link */}
        <Link
          href="/profile"
          className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-indigo-300 dark:ring-indigo-900 overflow-hidden"
        >
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            user?.full_name?.charAt(0) || 'U'
          )}
        </Link>
      </div>
    </header>
  );
}

