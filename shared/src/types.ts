export type UserRole = 'admin' | 'member';

export interface Profile {
  id: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  created_at: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family_group_id: string;
  user_id?: string | null;
  display_name: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id?: string | null;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  family_group_id: string;
  member_id: string;
  category_id: string;
  amount: number;
  expense_date: string;
  note?: string | null;
  receipt_url?: string | null;
  created_at: string;
}

export interface ExpenseWithDetails extends Expense {
  category?: Category;
  member?: FamilyMember;
  profile?: Profile;
}

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  total: number;
  percentage: number;
  count: number;
}

export interface MemberTotal {
  memberId: string;
  displayName: string;
  total: number;
  percentage: number;
  count: number;
}

export interface ReportSummary {
  grandTotal: number;
  todayTotal: number;
  thisMonthTotal: number;
  customRangeTotal: number;
  totalCount: number;
  fromDate?: string;
  toDate?: string;
  memberId?: string;
  memberName?: string;
  categoryTotals: CategoryTotal[];
  memberTotals: MemberTotal[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface AuthSession {
  user?: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    avatar_url?: string;
    role: string;
  };
  token?: string;
  refreshToken?: string;
  familyGroup?: FamilyGroup;
  emailConfirmationRequired?: boolean;
}

