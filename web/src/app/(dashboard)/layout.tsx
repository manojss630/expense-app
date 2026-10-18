'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/navigation/sidebar';
import { Topbar } from '@/components/navigation/topbar';
import { ExpenseDialog } from '@/components/expenses/expense-dialog';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        <Topbar
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenAddExpense={() => setExpenseDialogOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Global Add Expense Dialog */}
      <ExpenseDialog
        isOpen={expenseDialogOpen}
        onClose={() => setExpenseDialogOpen(false)}
        onSuccess={() => {
          // Trigger custom event so active pages refresh data
          window.dispatchEvent(new Event('expense_updated'));
        }}
      />
    </div>
  );
}

