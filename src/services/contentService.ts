import { PortfolioData, Project, Skill, SkillCategory, WorkExperience, Certification, Education, AIService, AIServiceCategory } from '../types/portfolio';
import { INITIAL_PORTFOLIO_FIXTURE } from '../fixtures/initialContent';

/**
 * ContentService
 * 
 * Client-side data fetching service.
 * Fetches real persistent content from the Cloudflare Worker Edge API (/api/public/*).
 * Gracefully falls back to INITIAL_PORTFOLIO_FIXTURE if running in purely static preview or offline environment.
 */
class ContentService {
  private cachedData: PortfolioData | null = null;
  private isFetching: Promise<PortfolioData> | null = null;

  /**
   * Fetches the complete public portfolio state.
   */
  async getPortfolioData(forceRefresh = false): Promise<PortfolioData> {
    if (!forceRefresh && this.cachedData) {
      return this.cachedData;
    }

    if (this.isFetching) {
      return this.isFetching;
    }

    this.isFetching = (async () => {
      try {
        const response = await fetch('/api/public/content', {
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const json = await response.json();
          if (json?.success && json?.data) {
            this.cachedData = json.data as PortfolioData;
            return this.cachedData;
          }
        }
      } catch (err) {
        // Fallback to initial fixture for offline development or test environments
        console.warn('API unavailable, falling back to local portfolio fixture:', err);
      }

      this.cachedData = INITIAL_PORTFOLIO_FIXTURE;
      return this.cachedData;
    })().finally(() => {
      this.isFetching = null;
    });

    return this.isFetching;
  }

  /**
   * Fetches a single project by URL slug.
   * Enforces publication check: draft projects are not returned.
   */
  async getProjectBySlug(slug: string): Promise<Project | null> {
    try {
      const response = await fetch(`/api/public/projects/${encodeURIComponent(slug)}`, {
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const json = await response.json();
        if (json?.success && json?.data) {
          return json.data as Project;
        }
      } else if (response.status === 404) {
        return null;
      }
    } catch {
      // Fallback check against in-memory or fixture data
    }

    const data = await this.getPortfolioData();
    const project = data.projects.find(
      (p) => p.slug === slug && p.published === true
    );
    return project || null;
  }

  /**
   * Fetches published skills and categories.
   */
  async getSkills(forceRefresh = false): Promise<{ skills: Skill[]; categories: SkillCategory[] }> {
    try {
      const response = await fetch('/api/public/skills', {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const json = await response.json();
        if (json?.success) {
          return {
            skills: json.data || [],
            categories: json.categories || [],
          };
        }
      }
    } catch {
      // Fallback
    }

    const data = await this.getPortfolioData(forceRefresh);
    return {
      skills: data.skills,
      categories: data.skillCategories,
    };
  }

  /**
   * Fetches published work experience records.
   */
  async getExperience(forceRefresh = false): Promise<WorkExperience[]> {
    try {
      const response = await fetch('/api/public/experience', {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const json = await response.json();
        if (json?.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // Fallback
    }
    const data = await this.getPortfolioData(forceRefresh);
    return data.experience;
  }

  /**
   * Fetches published certifications.
   */
  async getCertifications(forceRefresh = false): Promise<Certification[]> {
    try {
      const response = await fetch('/api/public/certifications', {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const json = await response.json();
        if (json?.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // Fallback
    }
    const data = await this.getPortfolioData(forceRefresh);
    return data.certifications;
  }

  /**
   * Fetches published education records.
   */
  async getEducation(forceRefresh = false): Promise<Education[]> {
    try {
      const response = await fetch('/api/public/education', {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const json = await response.json();
        if (json?.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // Fallback
    }
    const data = await this.getPortfolioData(forceRefresh);
    return data.education;
  }

  /**
   * Fetches published projects list.
   */
  async getProjects(): Promise<Project[]> {
    const data = await this.getPortfolioData();
    return data.projects.filter((p) => p.published);
  }

  /**
   * Fetches published AI services and categories.
   */
  async getAIServices(forceRefresh = false): Promise<{ services: AIService[]; categories: AIServiceCategory[] }> {
    try {
      const response = await fetch('/api/public/ai-services', {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const json = await response.json();
        if (json?.success) {
          return {
            services: json.data || [],
            categories: json.categories || [],
          };
        }
      }
    } catch {
      // Fallback
    }
    const data = await this.getPortfolioData(forceRefresh);
    return {
      services: data.aiServices || [],
      categories: data.aiServiceCategories || [],
    };
  }

  /**
   * Fetches a single published AI service by URL slug with related projects.
   */
  async getAIServiceBySlug(slug: string): Promise<(AIService & { relatedProjects?: any[] }) | null> {
    try {
      const response = await fetch(`/api/public/ai-services/${encodeURIComponent(slug)}`, {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const json = await response.json();
        if (json?.success && json.data) {
          return json.data;
        }
      } else if (response.status === 404) {
        return null;
      }
    } catch {
      // Fallback
    }

    const data = await this.getPortfolioData();
    const service = data.aiServices.find((s) => s.slug === slug && s.published === true);
    if (!service) return null;

    // Check if category is published
    const cat = (data.aiServiceCategories || []).find((c) => c.id === service.categoryId);
    if (cat && cat.published === false) return null;

    const publishedProjects = data.projects.filter((p) => p.published === true);
    const relatedProjectIds = new Set(service.relatedProjectIds || []);
    const relatedProjects = publishedProjects.filter((p) => relatedProjectIds.has(p.id));

    return {
      ...service,
      relatedProjects,
    };
  }

  /**
   * Clears in-memory client cache (useful after admin mutations)
   */
  clearCache(): void {
    this.cachedData = null;
  }
}

export const contentService = new ContentService();
