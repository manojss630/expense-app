'use client';

import React, { useState, useEffect } from 'react';
import {
  Upload,
  Calendar,
  User,
  FileText,
  IndianRupee,
  Check,
  Fuel,
  HeartPulse,
  Wrench,
  Zap,
  Utensils,
  Plane,
  ShoppingBag,
  GraduationCap,
  MoreHorizontal,
  Tag,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Category, FamilyMember, ExpenseWithDetails } from '@expense-app/shared';

// Helper to render Lucide icon by name
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

interface ExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: ExpenseWithDetails | null;
}

export function ExpenseDialog({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: ExpenseDialogProps) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [memberId, setMemberId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFormData();
      if (initialData) {
        setAmount(initialData.amount.toString());
        setMemberId(initialData.member_id);
        setCategoryId(initialData.category_id);
        setExpenseDate(initialData.expense_date);
        setNote(initialData.note || '');
        setReceiptUrl(initialData.receipt_url || null);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const loadFormData = async () => {
    try {
      const [membersData, categoriesData] = await Promise.all([
        api.getFamilyMembers(),
        api.getCategories(),
      ]);
      setMembers(membersData);
      setCategories(categoriesData);

      if (!initialData) {
        if (membersData.length > 0) setMemberId(membersData[0].id);
        if (categoriesData.length > 0) setCategoryId(categoriesData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load members or categories:', err);
    }
  };

  const resetForm = () => {
    setAmount('');
    setNote('');
    setReceiptUrl(null);
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingReceipt(true);
      setError(null);
      const res = await api.uploadReceipt(file);
      setReceiptUrl(res.receipt_url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload receipt');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (!memberId) {
      setError('Please select a family member / person');
      return;
    }
    if (!categoryId) {
      setError('Please select a category');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        amount: parsedAmount,
        member_id: memberId,
        category_id: categoryId,
        expense_date: expenseDate,
        note: note.trim() || undefined,
        receipt_url: receiptUrl || undefined,
      };

      if (initialData) {
        await api.updateExpense(initialData.id, payload);
      } else {
        await api.createExpense(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Expense' : 'Add New Expense'}
      description="Record an expense for yourself or a family member"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl">
            {error}
          </div>
        )}

        {/* Large Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
            Expense Amount (₹)
          </label>
          <div className="relative rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <span className="text-2xl font-bold text-slate-400 dark:text-slate-500">₹</span>
            </div>
            <input
              type="number"
              step="any"
              required
              autoFocus
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 text-2xl font-bold text-slate-900 dark:text-white bg-transparent outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Person / Member Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            For Person / Family Member
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {members.map((m) => {
              const isSelected = memberId === m.id;
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMemberId(m.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition text-left ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {m.display_name.charAt(0)}
                  </div>
                  <span className="truncate flex-1">{m.display_name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Chips / Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Category
          </label>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
            {categories.map((cat) => {
              const isSelected = categoryId === cat.id;
              const IconComp = iconMap[cat.icon] || Tag;

              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                    isSelected
                      ? 'border-transparent text-white shadow-sm ring-2 ring-offset-2 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800'
                  }`}
                  style={{
                    backgroundColor: isSelected ? cat.color : undefined,
                  }}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date and Note Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Expense Date
            </label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Note / Description
            </label>
            <input
              type="text"
              placeholder="e.g. Petrol refill, Medical tablets"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Receipt Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            Receipt / Bill Photo (Optional)
          </label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition">
              <Upload className="w-4 h-4" />
              <span>{uploadingReceipt ? 'Uploading...' : 'Upload receipt'}</span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                disabled={uploadingReceipt}
                onChange={handleFileUpload}
              />
            </label>

            {receiptUrl && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3.5 h-3.5" />
                <span>Receipt attached</span>
                <button
                  type="button"
                  onClick={() => setReceiptUrl(null)}
                  className="text-slate-400 hover:text-rose-500 font-bold ml-1"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={loading}>
            {initialData ? 'Update Expense' : 'Save Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

