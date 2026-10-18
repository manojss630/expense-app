'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Tag,
  Trash2,
  Edit2,
  FileImage,
  Fuel,
  HeartPulse,
  Wrench,
  Zap,
  Utensils,
  Plane,
  ShoppingBag,
  GraduationCap,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, ExpenseWithDetails, FamilyMember, Category } from '@expense-app/shared';
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

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Dialog & Modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFiltersAndData = useCallback(async () => {
    try {
      setLoading(true);
      const [membersData, categoriesData] = await Promise.all([
        api.getFamilyMembers(),
        api.getCategories(),
      ]);
      setMembers(membersData);
      setCategories(categoriesData);

      const expensesData = await api.getExpenses({
        search: search || undefined,
        memberId: selectedMember || undefined,
        categoryId: selectedCategory || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        limit: 100,
      });
      setExpenses(expensesData);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedMember, selectedCategory, fromDate, toDate]);

  useEffect(() => {
    fetchFiltersAndData();
  }, [fetchFiltersAndData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      setDeletingId(id);
      await api.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      window.dispatchEvent(new Event('expense_updated'));
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Expenses Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View, filter, edit, and record family expense records
          </p>
        </div>

        <Button
          size="md"
          onClick={() => {
            setEditingExpense(null);
            setDialogOpen(true);
          }}
          className="shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Expense
        </Button>
      </div>

      {/* Filter Card */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search note or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Member Filter */}
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Family Members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Tag className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From Date"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* To Date */}
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="To Date"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Active filter summary bar */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing <strong className="text-slate-900 dark:text-white">{expenses.length}</strong> transactions
            </span>
            <span>
              Total for selection:{' '}
              <strong className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(filteredTotal)}
              </strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-5 font-semibold">Date</th>
                  <th className="py-3 px-5 font-semibold">Person</th>
                  <th className="py-3 px-5 font-semibold">Category</th>
                  <th className="py-3 px-5 font-semibold">Note / Description</th>
                  <th className="py-3 px-5 font-semibold text-center">Receipt</th>
                  <th className="py-3 px-5 font-semibold text-right">Amount</th>
                  <th className="py-3 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading expenses...
                    </td>
                  </tr>
                ) : expenses.length > 0 ? (
                  expenses.map((exp) => {
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
                          {exp.member?.display_name || 'Member'}
                        </td>
                        <td className="py-3 px-5 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-white shadow-xs"
                            style={{ backgroundColor: exp.category?.color || '#6366F1' }}
                          >
                            <IconComp className="w-3.5 h-3.5" />
                            {exp.category?.name || 'Category'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {exp.note || '-'}
                        </td>
                        <td className="py-3 px-5 text-center whitespace-nowrap">
                          {exp.receipt_url ? (
                            <button
                              onClick={() => setReceiptModalUrl(exp.receipt_url!)}
                              className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              <FileImage className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingExpense(exp);
                                setDialogOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(exp.id)}
                              disabled={deletingId === exp.id}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No matching expenses found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Expense Edit / Create Dialog */}
      <ExpenseDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingExpense(null);
        }}
        onSuccess={() => fetchFiltersAndData()}
        initialData={editingExpense}
      />

      {/* Receipt Preview Modal */}
      {receiptModalUrl && (
        <Modal
          isOpen={!!receiptModalUrl}
          onClose={() => setReceiptModalUrl(null)}
          title="Attached Receipt"
          maxWidth="lg"
        >
          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receiptModalUrl}
              alt="Receipt Preview"
              className="max-h-[65vh] w-auto rounded-xl object-contain shadow-md"
            />
            <div className="mt-4 flex justify-end w-full">
              <Button size="sm" variant="outline" onClick={() => setReceiptModalUrl(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

