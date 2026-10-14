import {
  AuthSession,
  Category,
  CreateCategoryInput,
  CreateExpenseInput,
  CreateFamilyMemberInput,
  ExpenseFilterInput,
  ExpenseWithDetails,
  FamilyMember,
  LoginInput,
  PdfReportRequestInput,
  Profile,
  RegisterInput,
  ReportFilterInput,
  ReportSummary,
  UpdateExpenseInput,
  UpdateProfileInput,
} from '@expense-app/shared';
import { Platform } from 'react-native';

// In Android emulator, 10.0.2.2 points to host machine localhost. On iOS or Web, localhost is fine.
const DEFAULT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

class MobileApiClient {
  private token: string | null = 'demo-token';

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || json.message || 'Request failed');
      }
      return json.data !== undefined ? json.data : json;
    } catch (err: any) {
      console.warn(`[MobileApi] Error on ${endpoint}:`, err.message);
      throw err;
    }
  }

  // Auth
  async login(data: LoginInput): Promise<AuthSession> {
    const res = await this.request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.token = res.token;
    return res;
  }

  async register(data: RegisterInput): Promise<AuthSession> {
    const res = await this.request<AuthSession>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.token = res.token;
    return res;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.token = null;
    }
  }

  // Profile
  async getProfile(): Promise<{ profile: Profile; memberCount: number; familyGroup: any }> {
    return this.request('/profile');
  }

  async updateProfile(data: UpdateProfileInput): Promise<Profile> {
    return this.request('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Family Members
  async getFamilyMembers(): Promise<FamilyMember[]> {
    return this.request('/family/members');
  }

  async addFamilyMember(data: CreateFamilyMemberInput): Promise<FamilyMember> {
    return this.request('/family/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return this.request('/categories');
  }

  async createCategory(data: CreateCategoryInput): Promise<Category> {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Expenses
  async getExpenses(filters: ExpenseFilterInput = {}): Promise<ExpenseWithDetails[]> {
    const params = new URLSearchParams();
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.memberId) params.append('memberId', filters.memberId);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.limit) params.append('limit', filters.limit.toString());

    return this.request<ExpenseWithDetails[]>(`/expenses?${params.toString()}`);
  }

  async createExpense(data: CreateExpenseInput): Promise<ExpenseWithDetails> {
    return this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpense(id: string, data: UpdateExpenseInput): Promise<ExpenseWithDetails> {
    return this.request(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: string): Promise<void> {
    return this.request(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // Reports & PDF
  async getSummary(filters: ReportFilterInput = {}): Promise<ReportSummary> {
    const params = new URLSearchParams();
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.memberId) params.append('memberId', filters.memberId);

    return this.request<ReportSummary>(`/reports/summary?${params.toString()}`);
  }

  async generatePdfReport(data: PdfReportRequestInput): Promise<{
    reportId: string;
    filename: string;
    downloadUrl: string;
    size: number;
  }> {
    return this.request('/reports/pdf', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getPdfDownloadUrl(reportId: string): string {
    return `${API_BASE_URL}/reports/pdf/${reportId}`;
  }
}

export const mobileApi = new MobileApiClient();
