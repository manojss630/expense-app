import {
  ApiResponse,
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

function normalizeApiUrl(rawUrl?: string): string {
  if (!rawUrl) return '/api';
  let url = rawUrl.trim().replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
}

export const API_BASE = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('expense_app_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const response = await fetch(`${API_BASE}${cleanEndpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && !endpoint.includes('/auth/')) {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('expense_app_refresh_token') : null;
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          const refreshJson = await refreshRes.json();
          if (refreshRes.ok && refreshJson.success && refreshJson.data?.token) {
            localStorage.setItem('expense_app_token', refreshJson.data.token);
            if (refreshJson.data.refreshToken) {
              localStorage.setItem('expense_app_refresh_token', refreshJson.data.refreshToken);
            }
            // Retry the original request with refreshed token
            headers['Authorization'] = `Bearer ${refreshJson.data.token}`;
            const retryRes = await fetch(`${API_BASE}${cleanEndpoint}`, {
              ...options,
              headers,
            });
            const retryJson = await retryRes.json();
            if (retryRes.ok && retryJson.success) {
              return retryJson.data !== undefined ? retryJson.data : retryJson;
            }
          }
        } catch {
          // Refresh failed, proceed to clean up credentials
        }
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('expense_app_token');
        localStorage.removeItem('expense_app_refresh_token');
        localStorage.removeItem('expense_app_user');
      }
    }

    const json = await response.json();

    if (!response.ok || !json.success) {
      throw new Error(json.error || json.message || 'Request failed');
    }

    return json.data !== undefined ? json.data : json;
  }

  // --------------------------------------------------------------------------
  // Auth
  // --------------------------------------------------------------------------
  async register(data: RegisterInput): Promise<AuthSession> {
    return this.request<AuthSession>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginInput): Promise<AuthSession> {
    return this.request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('expense_app_token');
        localStorage.removeItem('expense_app_user');
      }
    }
  }

  // --------------------------------------------------------------------------
  // Profile
  // --------------------------------------------------------------------------
  async getProfile(): Promise<{ profile: Profile; memberCount: number; familyGroup: any }> {
    return this.request('/profile');
  }

  async updateProfile(data: UpdateProfileInput): Promise<Profile> {
    return this.request('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async uploadAvatar(file: File): Promise<{ avatar_url: string; profile: Profile }> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${API_BASE}/profile/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'Avatar upload failed');
    }
    return json.data;
  }

  async changePassword(password: string): Promise<void> {
    return this.request('/profile/change-password', {
      method: 'POST',
      body: JSON.stringify({ new_password: password }),
    });
  }

  async deleteAccount(): Promise<void> {
    return this.request('/profile/delete-account', {
      method: 'POST',
    });
  }

  // --------------------------------------------------------------------------
  // Family Members
  // --------------------------------------------------------------------------
  async getFamilyMembers(): Promise<FamilyMember[]> {
    return this.request('/family/members');
  }

  async addFamilyMember(data: CreateFamilyMemberInput): Promise<FamilyMember> {
    return this.request('/family/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --------------------------------------------------------------------------
  // Categories
  // --------------------------------------------------------------------------
  async getCategories(): Promise<Category[]> {
    return this.request('/categories');
  }

  async createCategory(data: CreateCategoryInput): Promise<Category> {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --------------------------------------------------------------------------
  // Expenses
  // --------------------------------------------------------------------------
  async getExpenses(filters: ExpenseFilterInput = {}): Promise<ExpenseWithDetails[]> {
    const params = new URLSearchParams();
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.memberId) params.append('memberId', filters.memberId);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    return this.request<ExpenseWithDetails[]>(`/expenses?${params.toString()}`);
  }

  async createExpense(data: CreateExpenseInput): Promise<ExpenseWithDetails> {
    return this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadReceipt(file: File): Promise<{ receipt_url: string }> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('receipt', file);

    const response = await fetch(`${API_BASE}/expenses/upload-receipt`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'Receipt upload failed');
    }
    return json.data;
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

  // --------------------------------------------------------------------------
  // Reports
  // --------------------------------------------------------------------------
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

  getPdfUrl(reportId: string): string {
    return `${API_BASE}/reports/pdf/${reportId}`;
  }
}

export const api = new ApiClient();

