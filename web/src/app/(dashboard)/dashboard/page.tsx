'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Calendar,
  CalendarDays,
  Users,
  Tag,
  ArrowUpRight,
  Plus,
  FileDown,
  Receipt,
  User,
  Fuel,
  HeartPulse,
  Wrench,
  Zap,
  Utensils,
  Plane,
  ShoppingBag,
  GraduationCap,
  MoreHorizontal,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, ExpenseWithDetails, ReportSummary } from '@expense-app/shared';
import { ExpenseDialog } from '@/components/expenses/expense-dialog';

const iconMap: Record<string, React.ElementType> = {
  Fuel,
  HeartPulse,
  Activity: HeartPulse,
  Wrench,
  Settings: Wrench,
  Zap,
  Utensils,
  Plane,
  ShoppingBag,
  GraduationCap,
  BookOpen: GraduationCap,
  MoreHorizontal,
  Tag,
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryData, expensesData] = await Promise.all([
        api.getSummary(),
        api.getExpenses({ limit: 6 }),
      ]);
      setSummary(summaryData);
      setRecentExpenses(expensesData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    const handleUpdate = () => loadDashboardData();
    window.addEventListener('expense_updated', handleUpdate);
    return () => window.removeEventListener('expense_updated', handleUpdate);
  }, [loadDashboardData]);

  const topCategory = summary?.categoryTotals?.[0];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 to-indigo-700 text-white p-6 rounded-2xl shadow-lg shadow-indigo-500/10">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1">
            Real-time tracking of family spending, member shares, and monthly budgets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setIsAddExpenseOpen(true)}
            className="bg-white text-indigo-700 hover:bg-indigo-50 border-0 font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1 text-indigo-700" />
            Add Expense
          </Button>

          <Link href="/reports">
            <Button
              size="sm"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              <FileDown className="w-4 h-4 mr-1" />
              Statement
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Expense */}
        <Card className="hover:border-indigo-200 dark:hover:border-indigo-800 transition">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Grand Total
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-2">
              {loading ? '...' : formatCurrency(summary?.grandTotal || 0)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              All recorded family expenses
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Today's Expense */}
        <Card className="hover:border-indigo-200 dark:hover:border-indigo-800 transition">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Today&apos;s Expense
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-2">
              {loading ? '...' : formatCurrency(summary?.todayTotal || 0)}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              Today&apos;s spending
            </p>
          </CardContent>
        </Card>

        {/* Card 3: This Month */}
        <Card className="hover:border-indigo-200 dark:hover:border-indigo-800 transition">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                This Month
              </span>
              <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-2">
              {loading ? '...' : formatCurrency(summary?.thisMonthTotal || 0)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Month to date
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Family Members */}
        <Card className="hover:border-indigo-200 dark:hover:border-indigo-800 transition">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Family Members
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-2">
              {loading ? '...' : summary?.memberTotals?.length || 0}
            </p>
            <Link
              href="/members"
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline mt-1 inline-flex items-center"
            >
              <span>Manage Members</span>
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </Link>
          </CardContent>
        </Card>

        {/* Card 5: Top Category */}
        <Card className="hover:border-indigo-200 dark:hover:border-indigo-800 transition">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Top Category
              </span>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: topCategory?.color || '#6366F1' }}
              >
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-2 truncate">
              {loading ? '...' : topCategory?.categoryName || 'None'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {topCategory ? `${formatCurrency(topCategory.total)} (${topCategory.percentage}%)` : 'No expenses yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Family Members Individual Breakdown & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Family Member Spending Totals (Highlights Ramesh's brother!) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Member Spending Totals</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Each family person&apos;s individual total expenses
              </p>
            </div>
            <Link href="/members">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {summary?.memberTotals && summary.memberTotals.length > 0 ? (
              summary.memberTotals.map((member) => (
                <div
                  key={member.memberId}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between hover:bg-slate-100/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      {member.displayName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {member.displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {member.count} transactions • {member.percentage}% of total
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      {formatCurrency(member.total)}
                    </p>
                    <Link
                      href={`/reports?memberId=${member.memberId}`}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      View Statement →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                No members found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown with Visual Bars */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Category Breakdown</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Spending distribution across categories
              </p>
            </div>
            <Link href="/categories">
              <Button variant="ghost" size="sm">
                Categories
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary?.categoryTotals && summary.categoryTotals.length > 0 ? (
              summary.categoryTotals.slice(0, 5).map((cat) => {
                const IconComp = iconMap[cat.icon] || Tag;
                return (
                  <div key={cat.categoryId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-white"
                          style={{ backgroundColor: cat.color }}
                        >
                          <IconComp className="w-3 h-3" />
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {cat.categoryName}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          ({cat.count} txns)
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(cat.total)}{' '}
                        <span className="text-slate-400 font-normal">
                          ({cat.percentage}%)
                        </span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(cat.percentage, 100)}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                No category data available yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Expenses</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Latest transactions recorded for the family
            </p>
          </div>
          <Link href="/expenses">
            <Button variant="outline" size="sm">
              <span>View All Expenses</span>
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-5 font-semibold">Date</th>
                  <th className="py-3 px-5 font-semibold">Person</th>
                  <th className="py-3 px-5 font-semibold">Category</th>
                  <th className="py-3 px-5 font-semibold">Note</th>
                  <th className="py-3 px-5 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentExpenses.length > 0 ? (
                  recentExpenses.map((exp) => {
                    const IconComp = iconMap[exp.category?.icon || 'Tag'] || Tag;
                    return (
                      <tr
                        key={exp.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition"
                      >
                        <td className="py-3 px-5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(exp.expense_date)}
                        </td>
                        <td className="py-3 px-5 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            {exp.member?.display_name || 'Member'}
                          </span>
                        </td>
                        <td className="py-3 px-5 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-white shadow-xs"
                            style={{ backgroundColor: exp.category?.color || '#6366F1' }}
                          >
                            <IconComp className="w-3 h-3" />
                            {exp.category?.name || 'Category'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {exp.note || '-'}
                        </td>
                        <td className="py-3 px-5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(exp.amount)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No expenses recorded yet. Click &quot;Add Expense&quot; above to create one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Expense Dialog */}
      <ExpenseDialog
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSuccess={() => loadDashboardData()}
      />
    </div>
  );
}
