import type { Attendance, Class, ClassAttendanceSummary, Material, Session, User } from '@/types';

/** Base like `http://localhost:5000/api` (no trailing slash). Wrong base → 404 on `/classes`. */
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    return localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    // Never send `Content-Type: application/json` on GET/HEAD/DELETE with no body — Express
    // will try to parse the body, empty input is invalid JSON, and the API returns 400.
    const hasJsonBody = options.body != null && String(options.body).length > 0;
    const fromOpts = (options.headers as Record<string, string> | undefined) || {};
    const headers: Record<string, string> = { ...fromOpts };
    if (hasJsonBody && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });
      const text = await response.text();
      let data: { data?: T; error?: string } = {};
      try {
        data = text ? (JSON.parse(text) as { data?: T; error?: string }) : {};
      } catch {
        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status} (not JSON — check VITE_API_URL is .../api and backend is running)`,
          };
        }
        return { success: false, error: 'Invalid response' };
      }

      if (!response.ok) {
        if (response.status === 401 && this.getToken() && !endpoint.startsWith('/auth/login')) {
          this.setToken(null);
          window.location.assign('/login');
        }
        return { success: false, error: data.error || `Request failed (${response.status})` };
      }
      return { success: true, data: data.data };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }

  auth = {
    login: async (email: string, password: string) => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { success: boolean; data?: { user: User; token: string }; error?: string };
      if (data.success && data.data?.token) {
        this.setToken(data.data.token);
      }
      return data;
    },

    register: async (userData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
      teacherId?: string;
    }) => {
      const response = await this.request<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      if (response.success && response.data) {
        this.setToken(response.data.token);
      }
      return response;
    },

    google: async (idToken: string, role: 'teacher' | 'student' = 'teacher') => {
      const response = await this.request<{ user: User; token: string }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken, role }),
      });
      if (response.success && response.data) {
        this.setToken(response.data.token);
      }
      return response;
    },

    getMe: async () => this.request<{ user: User }>('/auth/me'),

    updateMe: async (body: { firstName?: string; lastName?: string; studentId?: string }) =>
      this.request<{ user: User }>('/auth/me', { method: 'PUT', body: JSON.stringify(body) }),

    uploadProfilePhoto: async (file: File) => {
      const token = this.getToken();
      const form = new FormData();
      form.append('photo', file);
      const response = await fetch(`${API_URL}/auth/me/photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const text = await response.text();
      const parsed = (text ? JSON.parse(text) : {}) as { success: boolean; data?: { user: User }; error?: string };
      if (!response.ok) return { success: false, error: parsed.error || 'Upload failed' };
      return { success: true, data: parsed.data! };
    },

    forgotPassword: async (email: string) =>
      this.request<{ message?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      }),

    /** Does not set token; caller sets after success */
    resetPassword: async (token: string, password: string) => {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as {
        success: boolean;
        data?: { user: User; token: string };
        error?: string;
      };
      if (data.success && data.data?.token) this.setToken(data.data.token);
      return data;
    },

    logout: () => {
      this.setToken(null);
    },
  };

  materials = {
    list: (classId: string) =>
      this.request<{ materials: Material[] }>(`/classes/${classId}/materials`),
    upload: async (classId: string, file: File, title: string, description = '') => {
      const token = this.getToken();
      const form = new FormData();
      form.append('file', file);
      form.append('title', title);
      form.append('description', description);
      const response = await fetch(`${API_URL}/classes/${classId}/materials`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const text = await response.text();
      try {
        const data = JSON.parse(text) as { success: boolean; data?: { material: Material }; error?: string };
        return data;
      } catch {
        return { success: false, error: `Upload failed (${response.status})` };
      }
    },
    downloadUrl: (materialId: string) => `${API_URL}/materials/${materialId}/file`,
    delete: (materialId: string) =>
      this.request<void>(`/materials/${materialId}`, { method: 'DELETE' }),
  };

  attendanceSummary = {
    byClass: () => this.request<{ summary: ClassAttendanceSummary[] }>('/attendance/summary-by-class'),
  };

  users = {
    getDashboardSummary: () =>
      this.request<{
        studentCount?: number;
        teacherCount?: number;
        classCount?: number;
        attendanceCount?: number;
        myCourseCount?: number;
        uniqueStudentsInMyCourses?: number;
      }>('/users/dashboard-summary'),
    listStudents: (q = '', page = 1) =>
      this.request<{ students: User[]; pagination: { page: number; total: number; pages: number } }>(
        `/users/students?${new URLSearchParams({ q, page: String(page), limit: '20' })}`
      ),
    getStudent: (id: string) => this.request<{ user: User; enrollments: Class[] }>(`/users/students/${id}`),
    getStudentAttendance: (id: string, classId?: string) =>
      this.request<{ attendance: Attendance[] }>(
        `/users/students/${id}/attendance${classId ? `?classId=${encodeURIComponent(classId)}` : ''}`
      ),
  };

  classes = {
    getAll: (params?: { scope?: 'all' }) =>
      this.request<{ classes: Class[] }>(`/classes${params?.scope === 'all' ? '?scope=all' : ''}`),
    getOne: (id: string) => this.request<{ class: Class }>(`/classes/${id}`),
    create: (data: Partial<Class>) =>
      this.request<{ class: Class }>('/classes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Class>) =>
      this.request<{ class: Class }>(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => this.request<void>(`/classes/${id}`, { method: 'DELETE' }),
    addStudents: (id: string, studentIds: string[]) =>
      this.request<{ class: Class }>(`/classes/${id}/students`, {
        method: 'POST',
        body: JSON.stringify({ studentIds }),
      }),
  };

  sessions = {
    create: (data: {
      classId: string;
      duration?: number;
      sessionType?: string;
      scheduleNote?: string;
      notes?: string;
      geoFence?: {
        enabled: boolean;
        radiusMeters?: number;
        teacherLocation?: {
          latitude: number;
          longitude: number;
        };
      };
    }) =>
      this.request<{ session: Session; qrData: string }>('/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: (classId?: string, page = 1, limit = 100) =>
      this.request<{ sessions: Session[]; pagination: { page: number; total: number; pages: number } }>(
        `/sessions?${new URLSearchParams({ ...(classId ? { classId } : {}), page: String(page), limit: String(limit) })}`
      ),
    getActive: () => this.request<{ sessions: Session[] }>('/sessions/active'),
    getOne: (id: string) => this.request<{ session: Session }>(`/sessions/${id}`),
    getAttendance: (id: string) =>
      this.request<{ session: Session; attendanceList: import('@/types').AttendanceListEntry[] }>(`/sessions/${id}/attendance`),
    end: (id: string) =>
      this.request<{ session: Session; absentMarked: number }>(`/sessions/${id}/end`, { method: 'PUT' }),
    refreshQr: (id: string) =>
      this.request<{ qrData: string; qrCode: { uniqueCode: string; expiresAt: string } }>(`/sessions/${id}/refresh-qr`, { method: 'PUT' }),
  };

  attendance = {
    getClassAttendance: (classId: string) =>
      this.request<{ attendance: Attendance[] }>(`/attendance/class/${classId}`),
    getStats: (classId?: string) =>
      this.request<{ stats: unknown }>(`/attendance/stats${classId ? `?classId=${classId}` : ''}`),
    update: (id: string, status: 'present' | 'late' | 'absent') =>
      this.request<{ attendance: Attendance }>(`/attendance/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    createManual: (sessionId: string, studentId: string, status: 'present' | 'late' | 'absent') =>
      this.request<{ attendance: Attendance }>('/attendance/manual', {
        method: 'POST',
        body: JSON.stringify({ sessionId, studentId, status }),
      }),
  };
}

export const api = new ApiClient();
