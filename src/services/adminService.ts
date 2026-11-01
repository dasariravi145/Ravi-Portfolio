import { Profile, Resume, Project, ArchitectureDiagram, MediaAsset, Skill, SkillCategory, WorkExperience, Certification, Education, AIService, AIServiceCategory, SiteSettings } from '../types/portfolio';

export interface AdminUser {
  email: string;
  sub: string;
  role: string;
  authenticated: boolean;
}

export interface EnrolledPasskeyInfo {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  deviceType?: 'singleDevice' | 'multiDevice';
  backedUp?: boolean;
}

export interface AdminMetrics {
  totalProjects: number;
  publishedProjects: number;
  draftProjects: number;
  totalSkills: number;
  totalSkillCategories: number;
  totalExperience: number;
  totalCertifications: number;
  totalAIServices: number;
}

export interface AdminOverviewData {
  metrics: AdminMetrics;
  lastUpdated: string;
  ownerEmail: string;
  activeResume: boolean;
  resumeVersion: string;
  resumePublished?: boolean;
  siteTitle: string;
  analyticsEnabled: boolean;
}

export class AdminService {
  private localDevToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.localDevToken = sessionStorage.getItem('admin_test_token');
    }
  }

  setDevToken(token: string | null): void {
    this.localDevToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        sessionStorage.setItem('admin_test_token', token);
      } else {
        sessionStorage.removeItem('admin_test_token');
      }
    }
  }

  getDevToken(): string | null {
    return this.localDevToken;
  }

  private getHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...extraHeaders,
    };
    const token =
      this.localDevToken ||
      (typeof window !== 'undefined' ? sessionStorage.getItem('admin_test_token') : null);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async checkAuth(): Promise<{ authenticated: boolean; user?: AdminUser; error?: string }> {
    try {
      const res = await fetch('/api/admin/auth/me', {
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          return { authenticated: true, user: json.user };
        }
      }

      if (res.status === 401 || res.status === 403) {
        const json = await res.json().catch(() => ({}));
        return { authenticated: false, error: json.error || 'Authentication required' };
      }

      return { authenticated: false, error: `Unexpected HTTP ${res.status}` };
    } catch (err) {
      return { authenticated: false, error: (err as Error).message };
    }
  }

  async getAuthStatus(): Promise<{
    success: boolean;
    enrolled: boolean;
    ownerEmail: string;
    rpId: string;
    credentialCount: number;
  }> {
    try {
      const res = await fetch('/api/admin/auth/status', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        return await res.json();
      }
      return { success: false, enrolled: false, ownerEmail: 'dasariravid145@gmail.com', rpId: '', credentialCount: 0 };
    } catch {
      return { success: false, enrolled: false, ownerEmail: 'dasariravid145@gmail.com', rpId: '', credentialCount: 0 };
    }
  }

  async getSetupOptions(enrollmentToken: string) {
    const res = await fetch('/api/admin/auth/setup-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ enrollmentToken }),
    });
    return await res.json();
  }

  async verifySetup(enrollmentToken: string, challengeId: string, response: any, name?: string) {
    const res = await fetch('/api/admin/auth/setup-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ enrollmentToken, challengeId, response, name }),
    });
    return await res.json();
  }

  async getLoginOptions() {
    const res = await fetch('/api/admin/auth/login-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
    return await res.json();
  }

  async verifyLogin(challengeId: string, response: any) {
    const res = await fetch('/api/admin/auth/login-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ challengeId, response }),
    });
    return await res.json();
  }

  async recoverWithCode(recoveryCode: string) {
    const res = await fetch('/api/admin/auth/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ recoveryCode }),
    });
    return await res.json();
  }

  async getPasskeys(): Promise<{ success: boolean; passkeys?: EnrolledPasskeyInfo[]; error?: string }> {
    try {
      const res = await fetch('/api/admin/auth/passkeys', {
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getAddBackupPasskeyOptions() {
    const res = await fetch('/api/admin/auth/passkeys/add-options', {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
    });
    return await res.json();
  }

  async verifyAddBackupPasskey(challengeId: string, response: any, name?: string) {
    const res = await fetch('/api/admin/auth/passkeys/add-verify', {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ challengeId, response, name }),
    });
    return await res.json();
  }

  async removePasskey(id: string) {
    const res = await fetch(`/api/admin/auth/passkeys/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
    });
    return await res.json();
  }

  async regenerateRecoveryCodes(): Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }> {
    try {
      const res = await fetch('/api/admin/auth/recovery-codes/regenerate', {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getOverview(): Promise<{ success: boolean; data?: AdminOverviewData; error?: string }> {
    try {
      const res = await fetch('/api/admin/overview', {
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return { success: true, data: json.data };
        }
      }

      const json = await res.json().catch(() => ({}));
      return { success: false, error: json.error || 'Failed to fetch admin overview' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getProfile(): Promise<{ success: boolean; data?: Profile; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/profile', {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return { success: true, data: json.data, etag: res.headers.get('ETag') || undefined };
        }
      }
      return { success: false, error: 'Failed to fetch profile' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async uploadProfilePhoto(file: File): Promise<{ success: boolean; data?: Profile; etag?: string; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/profile/photo', {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData,
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag: res.headers.get('ETag') || undefined };
      }
      return { success: false, error: json.error || 'Failed to upload profile photo' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async deleteProfilePhoto(): Promise<{ success: boolean; data?: Profile; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/profile/photo', {
        method: 'DELETE',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag: res.headers.get('ETag') || undefined };
      }
      return { success: false, error: json.error || 'Failed to delete profile photo' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async updateProfile(profile: Profile, ifMatch?: string): Promise<{ success: boolean; data?: Profile; etag?: string; error?: string; status?: number }> {
    try {
      const headers = this.getHeaders({ 'Content-Type': 'application/json' }) as Record<string, string>;
      if (ifMatch) {
        headers['If-Match'] = ifMatch;
      }
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(profile),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag: res.headers.get('ETag') || undefined };
      }
      return { success: false, error: json.error || 'Failed to update profile', status: res.status };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getResume(): Promise<{ success: boolean; data?: Resume; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/resume', {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return { success: true, data: json.data, etag: res.headers.get('ETag') || undefined };
        }
      }
      return { success: false, error: 'Failed to fetch resume' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async uploadResume(file: File): Promise<{ success: boolean; data?: Resume; etag?: string; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/resume/upload', {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData,
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag: res.headers.get('ETag') || undefined };
      }
      return { success: false, error: json.error || 'Failed to upload resume PDF' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async updateResume(resume: Resume, etag?: string): Promise<{ success: boolean; data?: Resume; etag?: string; error?: string; status?: number }> {
    try {
      const headers: Record<string, string> = {
        ...(this.getHeaders({ 'Content-Type': 'application/json' }) as Record<string, string>),
      };
      if (etag) {
        headers['If-Match'] = etag;
      }
      const res = await fetch('/api/admin/resume', {
        method: 'PUT',
        headers,
        body: JSON.stringify(resume),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag: res.headers.get('ETag') || undefined };
      }
      return { success: false, error: json.error || 'Failed to update resume details', status: res.status };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async publishResume(published: boolean): Promise<{ success: boolean; data?: Resume; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/resume/publish', {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ published }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag: res.headers.get('ETag') || undefined };
      }
      return { success: false, error: json.error || 'Failed to update resume publication state' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async deleteResume(): Promise<{ success: boolean; data?: Resume; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/resume', {
        method: 'DELETE',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag: res.headers.get('ETag') || undefined };
      }
      return { success: false, error: json.error || 'Failed to delete resume' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // ==========================================
  // PROJECTS MANAGEMENT METHODS
  // ==========================================

  async getProjects(): Promise<{ success: boolean; data?: Project[]; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/projects', {
        headers: this.getHeaders(),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to fetch projects' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getProject(id: string): Promise<{ success: boolean; data?: Project; etag?: string; error?: string }> {
    try {
      const res = await fetch(`/api/admin/projects/${id}`, {
        headers: this.getHeaders(),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || `Failed to fetch project with id "${id}"` };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async createProject(
    data: Partial<Project>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: Project; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to create project' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async updateProject(
    id: string,
    data: Partial<Project>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: Project; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/projects/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || `Failed to update project "${id}"` };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async deleteProject(id: string, ifMatch?: string): Promise<{ success: boolean; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = {};
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/projects/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(extraHeaders),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, etag };
      }
      return { success: false, error: json.error || `Failed to delete project "${id}"` };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async publishProject(
    id: string,
    published: boolean,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: Project; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/projects/${id}/publish`, {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify({ published }),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to update publication status' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async reorderProjects(
    orderedIds: string[],
    ifMatch?: string
  ): Promise<{ success: boolean; data?: Project[]; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/projects/reorder', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify({ orderedIds }),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to reorder projects' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // --- Architecture Diagrams ---

  async addArchitectureDiagram(
    projectId: string,
    data: Partial<ArchitectureDiagram>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: ArchitectureDiagram; project?: Project; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/projects/${projectId}/architecture`, {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, project: json.project, etag };
      }
      return { success: false, error: json.error || 'Failed to add architecture diagram' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async updateArchitectureDiagram(
    projectId: string,
    diagramId: string,
    data: Partial<ArchitectureDiagram>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: ArchitectureDiagram; project?: Project; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/projects/${projectId}/architecture/${diagramId}`, {
        method: 'PUT',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, project: json.project, etag };
      }
      return { success: false, error: json.error || 'Failed to update architecture diagram' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async deleteArchitectureDiagram(
    projectId: string,
    diagramId: string,
    ifMatch?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = {};
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/projects/${projectId}/architecture/${diagramId}`, {
        method: 'DELETE',
        headers: this.getHeaders(extraHeaders),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true };
      }
      return { success: false, error: json.error || 'Failed to delete architecture diagram' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async reorderArchitectureDiagrams(
    projectId: string,
    orderedDiagramIds: string[],
    ifMatch?: string
  ): Promise<{ success: boolean; data?: ArchitectureDiagram[]; project?: Project; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/projects/${projectId}/architecture/reorder`, {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify({ orderedDiagramIds }),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, project: json.project, etag };
      }
      return { success: false, error: json.error || 'Failed to reorder architecture diagrams' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async publishArchitectureDiagram(
    projectId: string,
    diagramId: string,
    published: boolean,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: ArchitectureDiagram; project?: Project; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/projects/${projectId}/architecture/${diagramId}/publish`, {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify({ published }),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, project: json.project, etag };
      }
      return { success: false, error: json.error || 'Failed to update diagram publication status' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async uploadMedia(file: File): Promise<{ success: boolean; data?: MediaAsset; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData,
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error || 'Failed to upload media asset' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getMediaList(): Promise<{ success: boolean; data?: MediaAsset[]; error?: string }> {
    try {
      const res = await fetch('/api/admin/media', {
        headers: this.getHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data || [] };
      }
      return { success: false, error: json.error || 'Failed to fetch media assets' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async deleteMedia(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/media?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true };
      }
      return { success: false, error: json.error || 'Failed to delete media asset' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // ==========================================
  // SKILLS & CATEGORIES MANAGEMENT METHODS
  // ==========================================

  async getSkills(): Promise<{ success: boolean; data?: Skill[]; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/skills', {
        headers: this.getHeaders(),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to fetch skills' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getSkill(id: string): Promise<{ success: boolean; data?: Skill; etag?: string; error?: string }> {
    try {
      const res = await fetch(`/api/admin/skills/${id}`, {
        headers: this.getHeaders(),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || `Failed to fetch skill with id "${id}"` };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async createSkill(
    data: Partial<Skill>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: Skill; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/skills', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to create skill' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async updateSkill(
    id: string,
    data: Partial<Skill>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: Skill; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/skills/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to update skill' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async deleteSkill(id: string, ifMatch?: string): Promise<{ success: boolean; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = {};
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/skills/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(extraHeaders),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, etag };
      }
      return { success: false, error: json.error || 'Failed to delete skill' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async reorderSkills(
    orderedIds: string[],
    ifMatch?: string
  ): Promise<{ success: boolean; data?: Skill[]; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/skills/reorder', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify({ orderedIds }),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to reorder skills' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // --- Skill Categories Methods ---

  async getSkillCategories(): Promise<{ success: boolean; data?: SkillCategory[]; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/skill-categories', {
        headers: this.getHeaders(),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to fetch skill categories' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getSkillCategory(id: string): Promise<{ success: boolean; data?: SkillCategory; etag?: string; error?: string }> {
    try {
      const res = await fetch(`/api/admin/skill-categories/${id}`, {
        headers: this.getHeaders(),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || `Failed to fetch skill category with id "${id}"` };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async createSkillCategory(
    data: Partial<SkillCategory>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: SkillCategory; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/skill-categories', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to create skill category' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async updateSkillCategory(
    id: string,
    data: Partial<SkillCategory>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: SkillCategory; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/skill-categories/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to update skill category' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async deleteSkillCategory(id: string, ifMatch?: string): Promise<{ success: boolean; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = {};
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/skill-categories/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(extraHeaders),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, etag };
      }
      return { success: false, error: json.error || 'Failed to delete skill category' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async reorderSkillCategories(
    orderedIds: string[],
    ifMatch?: string
  ): Promise<{ success: boolean; data?: SkillCategory[]; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/skill-categories/reorder', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify({ orderedIds }),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to reorder skill categories' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // ==========================================
  // WORK EXPERIENCE MANAGEMENT METHODS
  // ==========================================

  async getExperience(): Promise<{ success: boolean; data?: WorkExperience[]; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/experience', {
        headers: this.getHeaders(),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to fetch experience records' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getExperienceItem(id: string): Promise<{ success: boolean; data?: WorkExperience; etag?: string; error?: string }> {
    try {
      const res = await fetch(`/api/admin/experience/${id}`, {
        headers: this.getHeaders(),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || `Failed to fetch experience item with id "${id}"` };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async createExperience(
    data: Partial<WorkExperience>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: WorkExperience; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/experience', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to create experience record' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async updateExperience(
    id: string,
    data: Partial<WorkExperience>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: WorkExperience; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/experience/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to update experience record' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async deleteExperience(id: string, ifMatch?: string): Promise<{ success: boolean; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = {};
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/experience/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(extraHeaders),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, etag };
      }
      return { success: false, error: json.error || 'Failed to delete experience record' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async reorderExperience(
    orderedIds: string[],
    ifMatch?: string
  ): Promise<{ success: boolean; data?: WorkExperience[]; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/experience/reorder', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify({ orderedIds }),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to reorder experience records' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // ==========================================
  // CERTIFICATIONS MANAGEMENT METHODS
  // ==========================================

  async getCertifications(): Promise<{ success: boolean; data?: Certification[]; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/certifications', {
        headers: this.getHeaders(),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to fetch certifications' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getCertification(id: string): Promise<{ success: boolean; data?: Certification; etag?: string; error?: string }> {
    try {
      const res = await fetch(`/api/admin/certifications/${id}`, {
        headers: this.getHeaders(),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || `Failed to fetch certification with id "${id}"` };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async createCertification(
    data: Partial<Certification>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: Certification; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/certifications', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to create certification' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async updateCertification(
    id: string,
    data: Partial<Certification>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: Certification; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/certifications/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to update certification' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async deleteCertification(id: string, ifMatch?: string): Promise<{ success: boolean; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = {};
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/certifications/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(extraHeaders),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, etag };
      }
      return { success: false, error: json.error || 'Failed to delete certification' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async reorderCertifications(
    orderedIds: string[],
    ifMatch?: string
  ): Promise<{ success: boolean; data?: Certification[]; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/certifications/reorder', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify({ orderedIds }),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to reorder certifications' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // ==========================================
  // EDUCATION MANAGEMENT METHODS
  // ==========================================

  async getEducation(): Promise<{ success: boolean; data?: Education[]; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/education', {
        headers: this.getHeaders(),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to fetch education records' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getEducationItem(id: string): Promise<{ success: boolean; data?: Education; etag?: string; error?: string }> {
    try {
      const res = await fetch(`/api/admin/education/${id}`, {
        headers: this.getHeaders(),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || `Failed to fetch education item with id "${id}"` };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async createEducation(
    data: Partial<Education>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: Education; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/education', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to create education record' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async updateEducation(
    id: string,
    data: Partial<Education>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: Education; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/education/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to update education record' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async deleteEducation(id: string, ifMatch?: string): Promise<{ success: boolean; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = {};
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/education/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(extraHeaders),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, etag };
      }
      return { success: false, error: json.error || 'Failed to delete education record' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async reorderEducation(
    orderedIds: string[],
    ifMatch?: string
  ): Promise<{ success: boolean; data?: Education[]; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/education/reorder', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify({ orderedIds }),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to reorder education records' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // ==========================================
  // AI Services Operations
  // ==========================================

  async getAIServices(): Promise<{ success: boolean; data?: AIService[]; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/ai-services', {
        headers: this.getHeaders({ Accept: 'application/json' }),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to fetch AI services' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getAIService(id: string): Promise<{ success: boolean; data?: AIService; etag?: string; error?: string }> {
    try {
      const res = await fetch(`/api/admin/ai-services/${id}`, {
        headers: this.getHeaders({ Accept: 'application/json' }),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to fetch AI service' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async createAIService(
    data: Partial<AIService>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: AIService; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/ai-services', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to create AI service' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async updateAIService(
    id: string,
    updates: Partial<AIService>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: AIService; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/ai-services/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(updates),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to update AI service' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async deleteAIService(
    id: string,
    ifMatch?: string
  ): Promise<{ success: boolean; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/ai-services/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(extraHeaders),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, etag };
      }
      return { success: false, error: json.error || 'Failed to delete AI service' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async reorderAIServices(
    orderedIds: string[],
    ifMatch?: string
  ): Promise<{ success: boolean; data?: AIService[]; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/ai-services/reorder', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify({ orderedIds }),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to reorder AI services' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async publishAIService(
    id: string,
    published: boolean,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: AIService; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/ai-services/${id}/publish`, {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify({ published }),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to update publication status' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async toggleFeaturedAIService(
    id: string,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: AIService; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/ai-services/${id}/featured`, {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to toggle featured status' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // ==========================================
  // AI Service Categories Operations
  // ==========================================

  async getAIServiceCategories(): Promise<{ success: boolean; data?: AIServiceCategory[]; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/ai-service-categories', {
        headers: this.getHeaders({ Accept: 'application/json' }),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to fetch AI service categories' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getAIServiceCategory(id: string): Promise<{ success: boolean; data?: AIServiceCategory; etag?: string; error?: string }> {
    try {
      const res = await fetch(`/api/admin/ai-service-categories/${id}`, {
        headers: this.getHeaders({ Accept: 'application/json' }),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to fetch category' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async createAIServiceCategory(
    data: Partial<AIServiceCategory>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: AIServiceCategory; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/ai-service-categories', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(data),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to create category' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async updateAIServiceCategory(
    id: string,
    updates: Partial<AIServiceCategory>,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: AIServiceCategory; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/ai-service-categories/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify(updates),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to update category' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async deleteAIServiceCategory(
    id: string,
    ifMatch?: string
  ): Promise<{ success: boolean; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch(`/api/admin/ai-service-categories/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(extraHeaders),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, etag };
      }
      return { success: false, error: json.error || 'Failed to delete category' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async reorderAIServiceCategories(
    orderedIds: string[],
    ifMatch?: string
  ): Promise<{ success: boolean; data?: AIServiceCategory[]; etag?: string; error?: string }> {
    try {
      const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ifMatch) extraHeaders['If-Match'] = ifMatch;

      const res = await fetch('/api/admin/ai-service-categories/reorder', {
        method: 'POST',
        headers: this.getHeaders(extraHeaders),
        body: JSON.stringify({ orderedIds }),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to reorder categories' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // ==========================================
  // SITE SETTINGS & SEO MANAGEMENT METHODS
  // ==========================================

  async getSettings(): Promise<{ success: boolean; data?: SiteSettings; etag?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/site-settings', {
        headers: this.getHeaders(),
      });
      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to fetch site settings' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async updateSettings(
    settings: SiteSettings,
    ifMatch?: string
  ): Promise<{ success: boolean; data?: SiteSettings; etag?: string; error?: string; status?: number }> {
    try {
      const headers = this.getHeaders({ 'Content-Type': 'application/json' }) as Record<string, string>;
      if (ifMatch) {
        headers['If-Match'] = ifMatch;
      }
      const res = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      });

      const etag = res.headers.get('ETag') || undefined;
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return { success: true, data: json.data, etag };
      }
      return { success: false, error: json.error || 'Failed to update site settings', status: res.status };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      });
    } finally {
      this.setDevToken(null);
    }
  }
}

export const adminService = new AdminService();
