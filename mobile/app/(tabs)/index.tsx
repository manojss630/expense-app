import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { mobileApi } from '../../src/api/client';
import { useMobileAuth } from '../../src/context/AuthContext';
import { useMobileTheme } from '../../src/context/ThemeContext';
import { formatCurrency, formatDate, ExpenseWithDetails, ReportSummary } from '@expense-app/shared';

export default function MobileDashboard() {
  const router = useRouter();
  const { user } = useMobileAuth();
  const { colors, toggleTheme, theme } = useMobileTheme();

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseWithDetails[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sum, exps] = await Promise.all([
        mobileApi.getSummary(),
        mobileApi.getExpenses({ limit: 5 }),
      ]);
      setSummary(sum);
      setRecentExpenses(exps);
    } catch (e) {
      console.warn('Dashboard load error:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{user?.full_name?.charAt(0) || 'U'}</Text>
            )}
          </View>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>
              Hi, {user?.full_name?.split(' ')[0] || 'User'} 👋
            </Text>
            <Text style={[styles.subgreeting, { color: colors.subtext }]}>Family Expenses</Text>
          </View>
        </View>

        <TouchableOpacity onPress={toggleTheme} style={[styles.themeBtn, { borderColor: colors.border }]}>
          <MaterialCommunityIcons
            name={theme === 'dark' ? 'white-balance-sunny' : 'moon-waning-crescent'}
            size={20}
            color={theme === 'dark' ? '#FBBF24' : '#64748B'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
      >
        {/* Main Balance Banner */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total Family Expenses</Text>
          <Text style={styles.heroAmount}>{formatCurrency(summary?.grandTotal || 0)}</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatTitle}>Today&apos;s Spend</Text>
              <Text style={styles.heroStatValue}>{formatCurrency(summary?.todayTotal || 0)}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatTitle}>This Month</Text>
              <Text style={styles.heroStatValue}>{formatCurrency(summary?.thisMonthTotal || 0)}</Text>
            </View>
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#6366F1' }]}
            onPress={() => router.push('/(tabs)/expenses')}
          >
            <MaterialCommunityIcons name="plus-circle" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => router.push('/(tabs)/reports')}
          >
            <MaterialCommunityIcons name="file-pdf-box" size={20} color="#6366F1" />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>View Statement</Text>
          </TouchableOpacity>
        </View>

        {/* Family Member Spending Cards */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Member Spending</Text>
          <Text style={[styles.sectionSub, { color: colors.subtext }]}>Individual Totals</Text>
        </View>

        {summary?.memberTotals && summary.memberTotals.length > 0 ? (
          summary.memberTotals.map((mem) => (
            <View
              key={mem.memberId}
              style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.memberLeft}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{mem.displayName.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={[styles.memberName, { color: colors.text }]}>{mem.displayName}</Text>
                  <Text style={[styles.memberCount, { color: colors.subtext }]}>
                    {mem.count} transactions • {mem.percentage}%
                  </Text>
                </View>
              </View>

              <View style={styles.memberRight}>
                <Text style={[styles.memberAmount, { color: colors.text }]}>{formatCurrency(mem.total)}</Text>
              </View>
            </View>
          ))
        ) : null}

        {/* Category Breakdown */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Categories</Text>
        </View>

        <View style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {summary?.categoryTotals && summary.categoryTotals.length > 0 ? (
            summary.categoryTotals.slice(0, 5).map((cat) => (
              <View key={cat.categoryId} style={styles.catRow}>
                <View style={styles.catHeader}>
                  <View style={styles.catNameContainer}>
                    <View style={[styles.catColorDot, { backgroundColor: cat.color }]} />
                    <Text style={[styles.catName, { color: colors.text }]}>{cat.categoryName}</Text>
                  </View>
                  <Text style={[styles.catAmount, { color: colors.text }]}>
                    {formatCurrency(cat.total)} ({cat.percentage}%)
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: cat.color },
                    ]}
                  />
                </View>
              </View>
            ))
          ) : null}
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Expenses</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/expenses')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentExpenses.map((exp) => (
          <View
            key={exp.id}
            style={[styles.transactionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View
              style={[
                styles.categoryIconWrap,
                { backgroundColor: exp.category?.color ? `${exp.category.color}20` : '#EEF2FF' },
              ]}
            >
              <MaterialCommunityIcons
                name="tag-outline"
                size={20}
                color={exp.category?.color || '#6366F1'}
              />
            </View>

            <View style={styles.txMid}>
              <Text style={[styles.txCategory, { color: colors.text }]}>
                {exp.category?.name || 'Expense'}
              </Text>
              <Text style={[styles.txPerson, { color: colors.subtext }]}>
                {exp.member?.display_name || 'Member'} • {formatDate(exp.expense_date)}
              </Text>
              {exp.note ? (
                <Text style={[styles.txNote, { color: colors.subtext }]} numberOfLines={1}>
                  {exp.note}
                </Text>
              ) : null}
            </View>

            <Text style={[styles.txAmount, { color: colors.text }]}>{formatCurrency(exp.amount)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  greeting: { fontSize: 16, fontWeight: '700' },
  subgreeting: { fontSize: 11 },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 18, paddingBottom: 40 },
  heroCard: {
    backgroundColor: '#4338CA',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  heroLabel: { color: '#C7D2FE', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  heroAmount: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 },
  heroStatsRow: { flexDirection: 'row', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  heroStat: { flex: 1 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 14 },
  heroStatTitle: { color: '#E0E7FF', fontSize: 11 },
  heroStatValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
  },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionSub: { fontSize: 11 },
  seeAllText: { color: '#6366F1', fontWeight: '700', fontSize: 12 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  memberLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  memberName: { fontSize: 14, fontWeight: '700' },
  memberCount: { fontSize: 11, marginTop: 1 },
  memberRight: { alignItems: 'flex-end' },
  memberAmount: { fontSize: 15, fontWeight: '800' },
  categoryCard: { padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 16 },
  catRow: { marginBottom: 12 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catNameContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catColorDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 12, fontWeight: '600' },
  catAmount: { fontSize: 12, fontWeight: '700' },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  categoryIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txMid: { flex: 1, marginLeft: 12, marginRight: 8 },
  txCategory: { fontSize: 14, fontWeight: '700' },
  txPerson: { fontSize: 11, marginTop: 1 },
  txNote: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
});

