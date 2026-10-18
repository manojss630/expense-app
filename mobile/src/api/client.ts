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

function normalizeApiUrl(rawUrl?: string): string {
  if (!rawUrl) {
    return Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
  }
  let url = rawUrl.trim().replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
}

export const API_BASE_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);

class MobileApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  setRefreshToken(refreshToken: string | null) {
    this.refreshToken = refreshToken;
  }

  setTokens(token: string | null, refreshToken?: string | null) {
    this.token = token;
    if (refreshToken !== undefined) {
      this.refreshToken = refreshToken;
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
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
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      let response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
        ...options,
        headers,
      });

      // Attempt token refresh on 401 before giving up
      if (response.status === 401 && !endpoint.includes('/auth/') && this.refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: this.refreshToken }),
          });
          const refreshJson = await refreshRes.json();
          if (refreshRes.ok && refreshJson.success && refreshJson.data?.token) {
            this.token = refreshJson.data.token;
            if (refreshJson.data.refreshToken) {
              this.refreshToken = refreshJson.data.refreshToken;
            }
            headers['Authorization'] = `Bearer ${this.token}`;
            response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
              ...options,
              headers,
            });
          }
        } catch {
          // Refresh failed
        }
      }

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
    this.setTokens(res.token || null, res.refreshToken || null);
    return res;
  }

  async register(data: RegisterInput): Promise<AuthSession> {
    const res = await this.request<AuthSession>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setTokens(res.token || null, res.refreshToken || null);
    return res;
  }

  async refreshSession(refreshToken: string): Promise<{ token: string; refreshToken?: string }> {
    const res = await this.request<{ token: string; refreshToken?: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    this.setTokens(res.token, res.refreshToken || null);
    return res;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.token = null;
      this.refreshToken = null;
    }
  }

  // Profile & Avatars
  async getProfile(): Promise<{ profile: Profile; memberCount: number; familyGroup: any }> {
    return this.request('/profile');
  }

  async uploadAvatar(imageUri: string): Promise<{ avatar_url: string; profile: Profile }> {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('avatar', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'Failed to upload avatar');
    }
    return json.data;
  }

  async uploadReceipt(imageUri: string): Promise<{ receipt_url: string }> {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'receipt.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('receipt', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}/expenses/upload-receipt`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'Failed to upload receipt');
    }
    return json.data;
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

