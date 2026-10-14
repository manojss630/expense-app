import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin, supabaseClient } from '../config/supabase';
import { env } from '../config/env';
import {
  Profile,
  FamilyGroup,
  FamilyMember,
  Category,
  Expense,
  ExpenseWithDetails,
  ReportSummary,
  CategoryTotal,
  MemberTotal,
  DEFAULT_CATEGORIES,
} from '@expense-app/shared';

// In-Memory fallback store for demo/development when Supabase credentials are not connected
class MemoryStore {
  profiles: Map<string, Profile> = new Map();
  familyGroups: Map<string, FamilyGroup> = new Map();
  familyMembers: Map<string, FamilyMember> = new Map();
  categories: Map<string, Category> = new Map();
  expenses: Map<string, Expense> = new Map();

  constructor() {
    this.seed();
  }

  seed() {
    const rameshId = '00000000-0000-0000-0000-000000000001';
    const familyId = '11111111-1111-1111-1111-111111111111';
    const rameshMemberId = '22222222-2222-2222-2222-222222222221';
    const brotherMemberId = '22222222-2222-2222-2222-222222222222';

    // Profile
    this.profiles.set(rameshId, {
      id: rameshId,
      full_name: 'Ramesh Kumar',
      phone: '+91 9876543210',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
      role: 'admin',
      created_at: new Date().toISOString(),
    });

    // Family Group
    this.familyGroups.set(familyId, {
      id: familyId,
      name: 'Ramesh Family',
      owner_id: rameshId,
      created_at: new Date().toISOString(),
    });

    // Family Members
    this.familyMembers.set(rameshMemberId, {
      id: rameshMemberId,
      family_group_id: familyId,
      user_id: rameshId,
      display_name: 'Ramesh (Self)',
      created_at: new Date().toISOString(),
    });

    this.familyMembers.set(brotherMemberId, {
      id: brotherMemberId,
      family_group_id: familyId,
      user_id: null,
      display_name: 'Brother (Suresh)',
      created_at: new Date().toISOString(),
    });

    // Default Categories
    DEFAULT_CATEGORIES.forEach((cat, index) => {
      const id = `33333333-3333-3333-3333-33333333333${index}`;
      this.categories.set(id, {
        id,
        user_id: null,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        is_default: true,
        created_at: new Date().toISOString(),
      });
    });

    // Get category IDs for seed expenses
    const findCatId = (name: string) => {
      for (const [id, c] of this.categories.entries()) {
        if (c.name.toLowerCase() === name.toLowerCase()) return id;
      }
      return Array.from(this.categories.keys())[0];
    };

    const petrolId = findCatId('Petrol');
    const medicalId = findCatId('Medical');
    const motorId = findCatId('Motor');
    const wireId = findCatId('Wire/Electrical');
    const foodId = findCatId('Food');

    const todayStr = new Date().toISOString().split('T')[0];

    // Brother's expenses matching example:
    // Petrol: ₹1200, Medical: ₹130, Motor: ₹90, Wire/Electrical: ₹120 (Total ₹1540)
    const seedExpenses: Array<Omit<Expense, 'id' | 'created_at'>> = [
      {
        user_id: rameshId,
        family_group_id: familyId,
        member_id: brotherMemberId,
        category_id: petrolId,
        amount: 1200,
        expense_date: todayStr,
        note: 'Petrol refill at Shell station',
        receipt_url: null,
      },
      {
        user_id: rameshId,
        family_group_id: familyId,
        member_id: brotherMemberId,
        category_id: medicalId,
        amount: 130,
        expense_date: todayStr,
        note: 'Apollo Pharmacy tablets & syrup',
        receipt_url: null,
      },
      {
        user_id: rameshId,
        family_group_id: familyId,
        member_id: brotherMemberId,
        category_id: motorId,
        amount: 90,
        expense_date: todayStr,
        note: 'Motor grease and bolt fix',
        receipt_url: null,
      },
      {
        user_id: rameshId,
        family_group_id: familyId,
        member_id: brotherMemberId,
        category_id: wireId,
        amount: 120,
        expense_date: todayStr,
        note: 'Electrical copper wire 5m',
        receipt_url: null,
      },
      // Ramesh self expense
      {
        user_id: rameshId,
        family_group_id: familyId,
        member_id: rameshMemberId,
        category_id: foodId,
        amount: 450,
        expense_date: todayStr,
        note: 'Grocery & fruits for home',
        receipt_url: null,
      },
    ];

    seedExpenses.forEach((exp) => {
      const id = uuidv4();
      this.expenses.set(id, {
        ...exp,
        id,
        created_at: new Date().toISOString(),
      });
    });
  }
}

const memoryStore = new MemoryStore();

export class DataService {
  // --------------------------------------------------------------------------
  // Profile & Family
  // --------------------------------------------------------------------------
  static async getProfile(userId: string): Promise<{ profile: Profile; familyGroup: FamilyGroup | null }> {
    if (supabaseAdmin && !env.IS_DEMO_MODE) {
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;

      // Find user's family group (either owner or member)
      const { data: group } = await supabaseAdmin
        .from('family_groups')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

      return { profile, familyGroup: group || null };
    }

    // Memory fallback
    let profile = memoryStore.profiles.get(userId);
    if (!profile) {
      profile = {
        id: userId,
        full_name: 'Demo User',
        phone: '',
        avatar_url: '',
        role: 'admin',
        created_at: new Date().toISOString(),
      };
      memoryStore.profiles.set(userId, profile);
    }

    let familyGroup = Array.from(memoryStore.familyGroups.values()).find(
      (fg) => fg.owner_id === userId
    ) || Array.from(memoryStore.familyGroups.values())[0];

    return { profile, familyGroup: familyGroup || null };
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    if (supabaseAdmin && !env.IS_DEMO_MODE) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const existing = memoryStore.profiles.get(userId) || {
      id: userId,
      full_name: 'Demo User',
      role: 'admin',
      created_at: new Date().toISOString(),
    };
    const updated = { ...existing, ...updates };
    memoryStore.profiles.set(userId, updated);
    return updated;
  }

  // --------------------------------------------------------------------------
  // Family Members
  // --------------------------------------------------------------------------
  static async getFamilyMembers(userId: string): Promise<FamilyMember[]> {
    if (supabaseAdmin && !env.IS_DEMO_MODE) {
      // Find group first
      const { data: group } = await supabaseAdmin
        .from('family_groups')
        .select('id')
        .eq('owner_id', userId)
        .single();

      if (!group) return [];

      const { data: members, error } = await supabaseAdmin
        .from('family_members')
        .select('*')
        .eq('family_group_id', group.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return members || [];
    }

    // Return members for current demo group
    return Array.from(memoryStore.familyMembers.values());
  }

  static async addFamilyMember(
    userId: string,
    displayName: string,
    linkedUserId?: string | null
  ): Promise<FamilyMember> {
    if (supabaseAdmin && !env.IS_DEMO_MODE) {
      const { data: group } = await supabaseAdmin
        .from('family_groups')
        .select('id')
        .eq('owner_id', userId)
        .single();

      if (!group) throw new Error('Family group not found for user');

      const { data: member, error } = await supabaseAdmin
        .from('family_members')
        .insert({
          family_group_id: group.id,
          user_id: linkedUserId || null,
          display_name: displayName,
        })
        .select()
        .single();

      if (error) throw error;
      return member;
    }

    const familyId = Array.from(memoryStore.familyGroups.values())[0]?.id || '11111111-1111-1111-1111-111111111111';
    const newMember: FamilyMember = {
      id: uuidv4(),
      family_group_id: familyId,
      user_id: linkedUserId || null,
      display_name: displayName,
      created_at: new Date().toISOString(),
    };
    memoryStore.familyMembers.set(newMember.id, newMember);
    return newMember;
  }

  // --------------------------------------------------------------------------
  // Categories
  // --------------------------------------------------------------------------
  static async getCategories(userId: string): Promise<Category[]> {
    if (supabaseAdmin && !env.IS_DEMO_MODE) {
      const { data, error } = await supabaseAdmin
        .from('categories')
        .select('*')
        .or(`is_default.eq.true,user_id.eq.${userId}`)
        .order('name');
      if (error) throw error;
      return data || [];
    }

    return Array.from(memoryStore.categories.values()).filter(
      (c) => c.is_default || c.user_id === userId
    );
  }

  static async addCategory(
    userId: string,
    data: { name: string; icon: string; color: string }
  ): Promise<Category> {
    if (supabaseAdmin && !env.IS_DEMO_MODE) {
      const { data: category, error } = await supabaseAdmin
        .from('categories')
        .insert({
          user_id: userId,
          name: data.name,
          icon: data.icon,
          color: data.color,
          is_default: false,
        })
        .select()
        .single();
      if (error) throw error;
      return category;
    }

    const newCategory: Category = {
      id: uuidv4(),
      user_id: userId,
      name: data.name,
      icon: data.icon,
      color: data.color,
      is_default: false,
      created_at: new Date().toISOString(),
    };
    memoryStore.categories.set(newCategory.id, newCategory);
    return newCategory;
  }

  // --------------------------------------------------------------------------
  // Expenses CRUD
  // --------------------------------------------------------------------------
  static async getExpenses(
    userId: string,
    filters: {
      from?: string;
      to?: string;
      memberId?: string;
      categoryId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ expenses: ExpenseWithDetails[]; totalCount: number }> {
    if (supabaseAdmin && !env.IS_DEMO_MODE) {
      let query = supabaseAdmin
        .from('expenses')
        .select('*, category:categories(*), member:family_members(*), profile:profiles(*)', {
          count: 'exact',
        });

      if (filters.from) query = query.gte('expense_date', filters.from);
      if (filters.to) query = query.lte('expense_date', filters.to);
      if (filters.memberId) query = query.eq('member_id', filters.memberId);
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
      if (filters.search) query = query.ilike('note', `%${filters.search}%`);

      query = query
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters.limit) {
        const offset = filters.offset || 0;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      return { expenses: (data as any) || [], totalCount: count || 0 };
    }

    // Memory Store filtering
    let list: ExpenseWithDetails[] = Array.from(memoryStore.expenses.values()).map((exp) => ({
      ...exp,
      category: memoryStore.categories.get(exp.category_id),
      member: memoryStore.familyMembers.get(exp.member_id),
      profile: memoryStore.profiles.get(exp.user_id),
    }));

    if (filters.from) {
      list = list.filter((e) => e.expense_date >= filters.from!);
    }
    if (filters.to) {
      list = list.filter((e) => e.expense_date <= filters.to!);
    }
    if (filters.memberId) {
      list = list.filter((e) => e.member_id === filters.memberId);
    }
    if (filters.categoryId) {
      list = list.filter((e) => e.category_id === filters.categoryId);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter((e) => e.note?.toLowerCase().includes(s));
    }

    list.sort((a, b) => {
      const dateCmp = b.expense_date.localeCompare(a.expense_date);
      if (dateCmp !== 0) return dateCmp;
      return b.created_at.localeCompare(a.created_at);
    });

    const totalCount = list.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    const paginated = list.slice(offset, offset + limit);

    return { expenses: paginated, totalCount };
  }

  static async createExpense(
    userId: string,
    data: {
      member_id: string;
      category_id: string;
      amount: number;
      expense_date: string;
      note?: string | null;
      receipt_url?: string | null;
    }
  ): Promise<ExpenseWithDetails> {
    if (supabaseAdmin && !env.IS_DEMO_MODE) {
      const { data: member } = await supabaseAdmin
        .from('family_members')
        .select('family_group_id')
        .eq('id', data.member_id)
        .single();

      if (!member) throw new Error('Member not found');

      const { data: expense, error } = await supabaseAdmin
        .from('expenses')
        .insert({
          user_id: userId,
          family_group_id: member.family_group_id,
          member_id: data.member_id,
          category_id: data.category_id,
          amount: data.amount,
          expense_date: data.expense_date,
          note: data.note || null,
          receipt_url: data.receipt_url || null,
        })
        .select('*, category:categories(*), member:family_members(*)')
        .single();

      if (error) throw error;
      return expense as any;
    }

    const member = memoryStore.familyMembers.get(data.member_id);
    const familyGroupId = member?.family_group_id || '11111111-1111-1111-1111-111111111111';

    const newExpense: Expense = {
      id: uuidv4(),
      user_id: userId,
      family_group_id: familyGroupId,
      member_id: data.member_id,
      category_id: data.category_id,
      amount: Number(data.amount),
      expense_date: data.expense_date,
      note: data.note || null,
      receipt_url: data.receipt_url || null,
      created_at: new Date().toISOString(),
    };

    memoryStore.expenses.set(newExpense.id, newExpense);

    return {
      ...newExpense,
      category: memoryStore.categories.get(data.category_id),
      member: memoryStore.familyMembers.get(data.member_id),
      profile: memoryStore.profiles.get(userId),
    };
  }

  static async updateExpense(
    userId: string,
    expenseId: string,
    updates: Partial<Expense>
  ): Promise<ExpenseWithDetails> {
    if (supabaseAdmin && !env.IS_DEMO_MODE) {
      const { data, error } = await supabaseAdmin
        .from('expenses')
        .update(updates)
        .eq('id', expenseId)
        .select('*, category:categories(*), member:family_members(*)')
        .single();
      if (error) throw error;
      return data as any;
    }

    const existing = memoryStore.expenses.get(expenseId);
    if (!existing) throw new Error('Expense not found');

    const updated = { ...existing, ...updates };
    memoryStore.expenses.set(expenseId, updated);

    return {
      ...updated,
      category: memoryStore.categories.get(updated.category_id),
      member: memoryStore.familyMembers.get(updated.member_id),
      profile: memoryStore.profiles.get(updated.user_id),
    };
  }

  static async deleteExpense(userId: string, expenseId: string): Promise<boolean> {
    if (supabaseAdmin && !env.IS_DEMO_MODE) {
      const { error } = await supabaseAdmin.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
      return true;
    }

    return memoryStore.expenses.delete(expenseId);
  }

  // --------------------------------------------------------------------------
  // Summary & Calculations
  // --------------------------------------------------------------------------
  static async getSummary(
    userId: string,
    options: { from?: string; to?: string; memberId?: string }
  ): Promise<ReportSummary> {
    const { expenses } = await this.getExpenses(userId, { limit: 1000 });
    const members = await this.getFamilyMembers(userId);
    const categories = await this.getCategories(userId);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthPrefix = todayStr.substring(0, 7); // YYYY-MM

    let grandTotal = 0;
    let todayTotal = 0;
    let thisMonthTotal = 0;
    let customRangeTotal = 0;

    const categoryMap = new Map<string, { total: number; count: number }>();
    const memberMap = new Map<string, { total: number; count: number }>();

    // Determine targeted expenses for custom range/member
    const targetedExpenses = expenses.filter((e) => {
      if (options.from && e.expense_date < options.from) return false;
      if (options.to && e.expense_date > options.to) return false;
      if (options.memberId && e.member_id !== options.memberId) return false;
      return true;
    });

    // Compute metrics across all expenses for user family group
    expenses.forEach((e) => {
      const amt = Number(e.amount);
      grandTotal += amt;
      if (e.expense_date === todayStr) {
        todayTotal += amt;
      }
      if (e.expense_date.startsWith(monthPrefix)) {
        thisMonthTotal += amt;
      }
    });

    // Compute category and member breakdowns for the filtered/targeted set
    targetedExpenses.forEach((e) => {
      const amt = Number(e.amount);
      customRangeTotal += amt;

      // Category breakdown
      const catEntry = categoryMap.get(e.category_id) || { total: 0, count: 0 };
      catEntry.total += amt;
      catEntry.count += 1;
      categoryMap.set(e.category_id, catEntry);

      // Member breakdown
      const memEntry = memberMap.get(e.member_id) || { total: 0, count: 0 };
      memEntry.total += amt;
      memEntry.count += 1;
      memberMap.set(e.member_id, memEntry);
    });

    const categoryTotals: CategoryTotal[] = Array.from(categoryMap.entries()).map(
      ([catId, val]) => {
        const cat = categories.find((c) => c.id === catId);
        const percentage = customRangeTotal > 0 ? (val.total / customRangeTotal) * 100 : 0;
        return {
          categoryId: catId,
          categoryName: cat?.name || 'Unknown',
          icon: cat?.icon || 'Tag',
          color: cat?.color || '#6366F1',
          total: val.total,
          percentage: Math.round(percentage * 10) / 10,
          count: val.count,
        };
      }
    );
    categoryTotals.sort((a, b) => b.total - a.total);

    const memberTotals: MemberTotal[] = Array.from(memberMap.entries()).map(
      ([memId, val]) => {
        const mem = members.find((m) => m.id === memId);
        const percentage = customRangeTotal > 0 ? (val.total / customRangeTotal) * 100 : 0;
        return {
          memberId: memId,
          displayName: mem?.display_name || 'Unknown',
          total: val.total,
          percentage: Math.round(percentage * 10) / 10,
          count: val.count,
        };
      }
    );
    memberTotals.sort((a, b) => b.total - a.total);

    const targetMember = options.memberId
      ? members.find((m) => m.id === options.memberId)?.display_name
      : undefined;

    return {
      grandTotal,
      todayTotal,
      thisMonthTotal,
      customRangeTotal,
      totalCount: targetedExpenses.length,
      fromDate: options.from,
      toDate: options.to,
      memberId: options.memberId,
      memberName: targetMember,
      categoryTotals,
      memberTotals,
    };
  }
}
