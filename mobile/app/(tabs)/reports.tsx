import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { mobileApi } from '../../src/api/client';
import { useMobileAuth } from '../../src/context/AuthContext';
import { useMobileTheme } from '../../src/context/ThemeContext';
import { formatCurrency, FamilyMember, ReportSummary } from '@expense-app/shared';

export default function MobileReports() {
  const { user } = useMobileAuth();
  const { colors } = useMobileTheme();

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfInfo, setPdfInfo] = useState<{ reportId: string; filename: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [mems, sum] = await Promise.all([
        mobileApi.getFamilyMembers(),
        mobileApi.getSummary({
          memberId: selectedMember || undefined,
        }),
      ]);
      setMembers(mems);
      setSummary(sum);
    } catch (e) {
      console.warn('Reports load error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMember]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGeneratePdf = async () => {
    try {
      setGeneratingPdf(true);
      const targetMember = members.find((m) => m.id === selectedMember);
      const res = await mobileApi.generatePdfReport({
        memberId: selectedMember || undefined,
        title: targetMember
          ? `Expense Statement - ${targetMember.display_name}`
          : 'Family Expense Statement',
      });
      setPdfInfo(res);
      Alert.alert('PDF Ready', 'PDF statement has been generated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    if (!pdfInfo) {
      await handleGeneratePdf();
      return;
    }

    try {
      setGeneratingPdf(true);
      const downloadUrl = mobileApi.getPdfDownloadUrl(pdfInfo.reportId);
      const localUri = `${FileSystem.documentDirectory}${pdfInfo.filename}`;

      // Download file to local storage
      const downloadRes = await FileSystem.downloadAsync(downloadUrl, localUri);

      // Check if sharing is available on device
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Expense Statement via WhatsApp or Email',
          UTI: 'com.adobe.pdf',
        });
      } else {
        // Fallback to text share
        await Share.share({
          message: `Expense Statement for ${summary?.memberName || 'Family'}: ${formatCurrency(summary?.customRangeTotal || 0)}. Download here: ${downloadUrl}`,
        });
      }
    } catch (err: any) {
      Alert.alert('Share Error', err.message || 'Could not share PDF file');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Reports & Statements</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
            Export PDF for one person or the family
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.pdfBtn, { opacity: generatingPdf ? 0.6 : 1 }]}
          onPress={handleSharePdf}
          disabled={generatingPdf}
        >
          {generatingPdf ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="share-variant" size={18} color="#FFFFFF" />
              <Text style={styles.pdfBtnText}>Share PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Person Selector horizontal scroll */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Select Person</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.personScroll}>
          <TouchableOpacity
            style={[
              styles.personChip,
              { backgroundColor: selectedMember === '' ? '#6366F1' : colors.card, borderColor: colors.border },
            ]}
            onPress={() => setSelectedMember('')}
          >
            <Text style={[styles.personChipText, { color: selectedMember === '' ? '#FFF' : colors.text }]}>
              All Members (Combined)
            </Text>
          </TouchableOpacity>

          {members.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.personChip,
                { backgroundColor: selectedMember === m.id ? '#6366F1' : colors.card, borderColor: colors.border },
              ]}
              onPress={() => setSelectedMember(m.id)}
            >
              <Text style={[styles.personChipText, { color: selectedMember === m.id ? '#FFF' : colors.text }]}>
                {m.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Selected Statement Total Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            Statement Total ({selectedMember ? members.find((m) => m.id === selectedMember)?.display_name : 'All Family'})
          </Text>
          <Text style={styles.summaryAmount}>
            {loading ? '...' : formatCurrency(summary?.customRangeTotal || 0)}
          </Text>
          <Text style={styles.summaryCount}>
            {summary?.totalCount || 0} recorded transactions included
          </Text>
        </View>

        {/* Share buttons row */}
        <View style={styles.shareButtonsRow}>
          <TouchableOpacity
            style={[styles.shareActionBtn, { backgroundColor: '#10B981' }]}
            onPress={handleSharePdf}
          >
            <MaterialCommunityIcons name="whatsapp" size={20} color="#FFFFFF" />
            <Text style={styles.shareActionText}>Share to WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareActionBtn, { backgroundColor: '#6366F1' }]}
            onPress={handleGeneratePdf}
          >
            <MaterialCommunityIcons name="file-pdf-box" size={20} color="#FFFFFF" />
            <Text style={styles.shareActionText}>Generate PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Category Breakdown Table */}
        <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 14 }]}>Category Breakdown</Text>
        <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {summary?.categoryTotals && summary.categoryTotals.length > 0 ? (
            summary.categoryTotals.map((cat) => (
              <View key={cat.categoryId} style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                <View style={styles.catLeft}>
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <View>
                    <Text style={[styles.catTitle, { color: colors.text }]}>{cat.categoryName}</Text>
                    <Text style={[styles.catCount, { color: colors.subtext }]}>{cat.count} txns</Text>
                  </View>
                </View>

                <View style={styles.catRight}>
                  <Text style={[styles.catTotal, { color: colors.text }]}>{formatCurrency(cat.total)}</Text>
                  <Text style={[styles.catPercent, { color: colors.subtext }]}>{cat.percentage}%</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.subtext }]}>No expenses found</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, marginTop: 2 },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  pdfBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  scroll: { padding: 18, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  personScroll: { gap: 8, marginBottom: 16 },
  personChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  personChipText: { fontSize: 12, fontWeight: '700' },
  summaryCard: {
    backgroundColor: '#312E81',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryLabel: { color: '#C7D2FE', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  summaryAmount: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 },
  summaryCount: { color: '#E0E7FF', fontSize: 12, marginTop: 6 },
  shareButtonsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  shareActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
  },
  shareActionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  breakdownCard: { borderRadius: 18, borderWidth: 1, padding: 6 },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catTitle: { fontSize: 13, fontWeight: '700' },
  catCount: { fontSize: 11, marginTop: 1 },
  catRight: { alignItems: 'flex-end' },
  catTotal: { fontSize: 14, fontWeight: '800' },
  catPercent: { fontSize: 11, marginTop: 1 },
  emptyText: { textAlign: 'center', padding: 20, fontSize: 13 },
});
