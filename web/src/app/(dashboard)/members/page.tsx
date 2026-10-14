'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Plus, User, FileText, ArrowRight, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { formatCurrency, FamilyMember, MemberTotal, ReportSummary } from '@expense-app/shared';

export default function MembersPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersData, summaryData] = await Promise.all([
        api.getFamilyMembers(),
        api.getSummary(),
      ]);
      setMembers(membersData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter a member name');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.addFamilyMember({ display_name: displayName.trim() });
      setDisplayName('');
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Family Members
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage who you track expenses for and generate person-specific statements
          </p>
        </div>

        <Button
          size="md"
          onClick={() => {
            setError(null);
            setIsAddModalOpen(true);
          }}
          className="shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Family Member
        </Button>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {members.map((member) => {
          const stats = summary?.memberTotals?.find((m) => m.memberId === member.id);
          const totalSpent = stats?.total || 0;
          const count = stats?.count || 0;
          const share = stats?.percentage || 0;

          return (
            <Card key={member.id} className="hover:border-indigo-300 dark:hover:border-indigo-700 transition">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      {member.display_name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {member.display_name}
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        {member.user_id ? 'Linked User Account' : 'Manual Family Profile'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats Breakdown */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      Total Spent
                    </span>
                    <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {formatCurrency(totalSpent)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      Activity
                    </span>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
                      {count} txns ({share}%)
                    </p>
                  </div>
                </div>

                {/* Direct Action */}
                <div className="mt-5 pt-3">
                  <Link href={`/reports?memberId=${member.id}`} className="block">
                    <Button variant="outline" size="sm" className="w-full text-xs justify-between">
                      <span>View & Export Statement</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Family Member"
        description="Add a person to record expenses for (e.g. Brother, Sister, Father, Mother)"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Member Display Name
            </label>
            <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Brother (Suresh), Sister (Priya)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={submitting}>
              Add Member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
