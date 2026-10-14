import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { mobileApi } from '../../src/api/client';
import { useMobileAuth } from '../../src/context/AuthContext';
import { useMobileTheme } from '../../src/context/ThemeContext';
import {
  formatCurrency,
  formatDate,
  ExpenseWithDetails,
  FamilyMember,
  Category,
} from '@expense-app/shared';

export default function MobileExpenses() {
  const { user } = useMobileAuth();
  const { colors } = useMobileTheme();

  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Add Expense Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [formMemberId, setFormMemberId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [mems, cats, exps] = await Promise.all([
        mobileApi.getFamilyMembers(),
        mobileApi.getCategories(),
        mobileApi.getExpenses({
          memberId: selectedMember || undefined,
          categoryId: selectedCategory || undefined,
          limit: 100,
        }),
      ]);
      setMembers(mems);
      setCategories(cats);
      setExpenses(exps);

      if (mems.length > 0 && !formMemberId) setFormMemberId(mems[0].id);
      if (cats.length > 0 && !formCategoryId) setFormCategoryId(cats[0].id);
    } catch (e) {
      console.warn('Error loading expenses:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMember, selectedCategory, formMemberId, formCategoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddModal = (expense?: ExpenseWithDetails) => {
    if (expense) {
      setEditingExpenseId(expense.id);
      setAmount(expense.amount.toString());
      setFormMemberId(expense.member_id);
      setFormCategoryId(expense.category_id);
      setFormDate(expense.expense_date);
      setNote(expense.note || '');
      setReceiptUri(expense.receipt_url || null);
    } else {
      setEditingExpenseId(null);
      setAmount('');
      setNote('');
      setReceiptUri(null);
      setFormDate(new Date().toISOString().split('T')[0]);
      if (members.length > 0) setFormMemberId(members[0].id);
      if (categories.length > 0) setFormCategoryId(categories[0].id);
    }
    setFormError(null);
    setModalVisible(true);
  };

  const handlePickReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Receipt picker error:', e);
    }
  };

  const handleSaveExpense = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount');
      return;
    }
    if (!formMemberId) {
      setFormError('Please select a member');
      return;
    }
    if (!formCategoryId) {
      setFormError('Please select a category');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload = {
        amount: parsedAmount,
        member_id: formMemberId,
        category_id: formCategoryId,
        expense_date: formDate,
        note: note.trim() || undefined,
        receipt_url: receiptUri || undefined,
      };

      if (editingExpenseId) {
        await mobileApi.updateExpense(editingExpenseId, payload);
      } else {
        await mobileApi.createExpense(payload);
      }

      setModalVisible(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await mobileApi.deleteExpense(id);
            setExpenses((prev) => prev.filter((e) => e.id !== id));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not delete expense');
          }
        },
      },
    ]);
  };

  const totalFiltered = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Expenses</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
            Total: {formatCurrency(totalFiltered)} ({expenses.length} txns)
          </Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => openAddModal()}>
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Horizontal Scroll */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Member chips */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: selectedMember === '' ? '#6366F1' : colors.card, borderColor: colors.border },
            ]}
            onPress={() => setSelectedMember('')}
          >
            <Text style={[styles.filterChipText, { color: selectedMember === '' ? '#FFF' : colors.text }]}>
              All Members
            </Text>
          </TouchableOpacity>

          {members.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.filterChip,
                { backgroundColor: selectedMember === m.id ? '#6366F1' : colors.card, borderColor: colors.border },
              ]}
              onPress={() => setSelectedMember(selectedMember === m.id ? '' : m.id)}
            >
              <Text style={[styles.filterChipText, { color: selectedMember === m.id ? '#FFF' : colors.text }]}>
                {m.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Expenses List */}
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator color="#6366F1" size="small" style={{ marginTop: 40 }} />
        ) : expenses.length > 0 ? (
          expenses.map((exp) => (
            <View
              key={exp.id}
              style={[styles.expenseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View
                style={[
                  styles.categoryIconWrap,
                  { backgroundColor: exp.category?.color ? `${exp.category.color}25` : '#EEF2FF' },
                ]}
              >
                <MaterialCommunityIcons
                  name="tag-outline"
                  size={20}
                  color={exp.category?.color || '#6366F1'}
                />
              </View>

              <View style={styles.cardMid}>
                <Text style={[styles.cardCategory, { color: colors.text }]}>
                  {exp.category?.name || 'Expense'}
                </Text>
                <Text style={[styles.cardPerson, { color: colors.subtext }]}>
                  {exp.member?.display_name || 'Member'} • {formatDate(exp.expense_date)}
                </Text>
                {exp.note ? (
                  <Text style={[styles.cardNote, { color: colors.subtext }]} numberOfLines={1}>
                    {exp.note}
                  </Text>
                ) : null}
              </View>

              <View style={styles.cardRight}>
                <Text style={[styles.cardAmount, { color: colors.text }]}>{formatCurrency(exp.amount)}</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity onPress={() => openAddModal(exp)} style={styles.iconBtn}>
                    <MaterialCommunityIcons name="pencil-outline" size={16} color="#6366F1" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(exp.id)} style={styles.iconBtn}>
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="receipt" size={48} color={colors.subtext} />
            <Text style={[styles.emptyText, { color: colors.subtext }]}>No expenses found</Text>
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Expense Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingExpenseId ? 'Edit Expense' : 'Add New Expense'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {formError && <Text style={styles.errorText}>{formError}</Text>}

              {/* Large Amount Input */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Amount (₹)</Text>
              <View style={[styles.amountInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.rupeeSign, { color: colors.text }]}>₹</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.subtext}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              {/* Person Selector */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>For Person</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {members.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.choiceChip,
                      {
                        backgroundColor: formMemberId === m.id ? '#6366F1' : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setFormMemberId(m.id)}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        { color: formMemberId === m.id ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {m.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Category Selector */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.choiceChip,
                      {
                        backgroundColor: formCategoryId === c.id ? c.color : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setFormCategoryId(c.id)}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        { color: formCategoryId === c.id ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Date */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={formDate}
                onChangeText={setFormDate}
              />

              {/* Note */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>Note / Description</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="e.g. Petrol refill, Medical tablets"
                placeholderTextColor={colors.subtext}
                value={note}
                onChangeText={setNote}
              />

              {/* Receipt */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>Receipt Photo</Text>
              <View style={styles.receiptRow}>
                <TouchableOpacity style={[styles.receiptBtn, { borderColor: colors.border }]} onPress={handlePickReceipt}>
                  <MaterialCommunityIcons name="camera-outline" size={20} color="#6366F1" />
                  <Text style={styles.receiptBtnText}>
                    {receiptUri ? 'Change Photo' : 'Attach Receipt Photo'}
                  </Text>
                </TouchableOpacity>

                {receiptUri ? (
                  <TouchableOpacity onPress={() => setReceiptUri(null)}>
                    <MaterialCommunityIcons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveExpense}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Expense</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  filterBar: { paddingVertical: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 11, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 40 },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  categoryIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardMid: { flex: 1, marginLeft: 12, marginRight: 8 },
  cardCategory: { fontSize: 14, fontWeight: '700' },
  cardPerson: { fontSize: 11, marginTop: 1 },
  cardNote: { fontSize: 11, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  cardAmount: { fontSize: 15, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  iconBtn: { padding: 4 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalBody: { paddingBottom: 30 },
  errorText: { color: '#EF4444', fontSize: 12, marginBottom: 10 },
  inputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
  },
  rupeeSign: { fontSize: 24, fontWeight: 'bold', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '800' },
  chipRow: { flexDirection: 'row', marginBottom: 6 },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  choiceChipText: { fontSize: 12, fontWeight: '700' },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
  },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  receiptBtnText: { color: '#6366F1', fontSize: 12, fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#6366F1',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
