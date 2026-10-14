'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  FileDown,
  Printer,
  Share2,
  Calendar,
  User,
  CheckCircle,
  Eye,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, FamilyMember, ReportSummary } from '@expense-app/shared';

function ReportsContent() {
  const searchParams = useSearchParams();
  const initialMemberId = searchParams.get('memberId') || '';

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState(initialMemberId);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // PDF Generation State
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState<{
    reportId: string;
    downloadUrl: string;
    filename: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      setError(null);
      const data = await api.getSummary({
        memberId: selectedMember || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load report summary');
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedMember, fromDate, toDate]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const mems = await api.getFamilyMembers();
        setMembers(mems);
      } catch (e) {
        console.error('Error fetching members:', e);
      }
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleGeneratePdf = async () => {
    try {
      setGeneratingPdf(true);
      setError(null);

      const res = await api.generatePdfReport({
        memberId: selectedMember || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        title: selectedMember
          ? `Statement for ${members.find((m) => m.id === selectedMember)?.display_name || 'Member'}`
          : 'Family Expense Statement',
      });

      setGeneratedPdf(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!summary) return;
    const personName = selectedMember
      ? members.find((m) => m.id === selectedMember)?.display_name || 'Member'
      : 'All Family Members';

    const text = encodeURIComponent(
      `*Expense Statement for ${personName}*\nTotal: ${formatCurrency(summary.customRangeTotal)}\nTransactions: ${summary.totalCount}\nDate: ${fromDate || 'All'} to ${toDate || 'Present'}\nGenerated via ExpenseApp.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Reports & PDF Statement
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Generate and export financial statements for any person or the entire family
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="md"
            onClick={handleGeneratePdf}
            isLoading={generatingPdf}
            className="shadow-md shadow-indigo-500/20"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Generate PDF Report
          </Button>
        </div>
      </div>

      {/* Filter Control Card */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Person selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Select Person
              </label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Family Members (Combined)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900 border-indigo-100 dark:border-indigo-900/40">
          <CardContent className="p-5">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Statement Total
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {loadingSummary ? '...' : formatCurrency(summary?.customRangeTotal || 0)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              For selected person and date range
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Transactions
            </span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {loadingSummary ? '...' : `${summary?.totalCount || 0} entries`}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Included in this statement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Targeted Person
            </span>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">
              {selectedMember
                ? members.find((m) => m.id === selectedMember)?.display_name
                : 'All Family Members'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Individual statement scope
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PDF Action & Preview Section */}
      {generatedPdf && (
        <Card className="border-indigo-200 dark:border-indigo-800">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 dark:bg-indigo-950/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <CardTitle className="text-sm">PDF Statement Ready</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {generatedPdf.filename}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* WhatsApp Share */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleWhatsAppShare}
                className="text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
              >
                <MessageCircle className="w-4 h-4 mr-1 text-emerald-600" />
                Share WhatsApp
              </Button>

              {/* Open in new tab */}
              <a
                href={api.getPdfUrl(generatedPdf.reportId)}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" variant="outline">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open Full
                </Button>
              </a>

              {/* Direct Download */}
              <a
                href={api.getPdfUrl(generatedPdf.reportId)}
                download={generatedPdf.filename}
              >
                <Button size="sm">
                  <FileDown className="w-4 h-4 mr-1" />
                  Download PDF
                </Button>
              </a>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            <div className="w-full h-[550px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
              <iframe
                src={api.getPdfUrl(generatedPdf.reportId)}
                className="w-full h-full border-0"
                title="PDF Statement Preview"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown for this Statement</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-5 font-semibold">Category</th>
                  <th className="py-3 px-5 font-semibold">Transactions</th>
                  <th className="py-3 px-5 font-semibold">Share</th>
                  <th className="py-3 px-5 font-semibold text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary?.categoryTotals && summary.categoryTotals.length > 0 ? (
                  summary.categoryTotals.map((cat) => (
                    <tr key={cat.categoryId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-5 font-medium text-slate-900 dark:text-white">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.categoryName}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-slate-500 dark:text-slate-400">
                        {cat.count} txns
                      </td>
                      <td className="py-3 px-5 text-slate-500 dark:text-slate-400">
                        {cat.percentage}%
                      </td>
                      <td className="py-3 px-5 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(cat.total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No transactions recorded in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading reports...</div>}>
      <ReportsContent />
    </React.Suspense>
  );
}
