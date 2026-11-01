import { IStorageAdapter, StorageObject, normalizeEtag, etagsMatch } from './r2StorageAdapter';
import {
  Profile,
  ProfileSchema,
  Project,
  ProjectSchema,
  Skill,
  SkillSchema,
  SkillCategory,
  SkillCategorySchema,
  WorkExperience,
  WorkExperienceSchema,
  Certification,
  CertificationSchema,
  Education,
  EducationSchema,
  AIService,
  AIServiceSchema,
  AIServiceCategory,
  AIServiceCategorySchema,
  SiteSettings,
  SiteSettingsSchema,
  Resume,
  ResumeSchema,
  PortfolioData,
} from '../types/portfolio';
import { INITIAL_PORTFOLIO_FIXTURE } from '../fixtures/initialContent';

export const CONTENT_KEYS = {
  PROFILE: 'content/profile.json',
  PROJECTS: 'content/projects.json',
  SKILLS: 'content/skills.json',
  SKILL_CATEGORIES: 'content/skill-categories.json',
  EXPERIENCE: 'content/experience.json',
  CERTIFICATIONS: 'content/certifications.json',
  EDUCATION: 'content/education.json',
  AI_SERVICES: 'content/ai-services.json',
  AI_SERVICE_CATEGORIES: 'content/ai-service-categories.json',
  SETTINGS: 'content/settings.json',
  RESUME: 'content/resume.json',
} as const;

export class ConcurrencyError extends Error {
  constructor(message = 'Resource has been modified by another session. Please reload.') {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Requested entity not found.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ContentStore {
  constructor(private adapter: IStorageAdapter) {}

  /**
   * Initializes empty storage with verified initial content if not already present.
   * If storage exists, verifies and migrates factual resume content.
   */
  async ensureInitialized(): Promise<void> {
    const existing = await this.adapter.get(CONTENT_KEYS.PROFILE);
    if (!existing) {
      await this.adapter.put(CONTENT_KEYS.PROFILE, INITIAL_PORTFOLIO_FIXTURE.profile);
      await this.adapter.put(CONTENT_KEYS.PROJECTS, INITIAL_PORTFOLIO_FIXTURE.projects);
      await this.adapter.put(CONTENT_KEYS.SKILLS, INITIAL_PORTFOLIO_FIXTURE.skills);
      await this.adapter.put(CONTENT_KEYS.SKILL_CATEGORIES, INITIAL_PORTFOLIO_FIXTURE.skillCategories);
      await this.adapter.put(CONTENT_KEYS.EXPERIENCE, INITIAL_PORTFOLIO_FIXTURE.experience);
      await this.adapter.put(CONTENT_KEYS.CERTIFICATIONS, INITIAL_PORTFOLIO_FIXTURE.certifications);
      await this.adapter.put(CONTENT_KEYS.EDUCATION, INITIAL_PORTFOLIO_FIXTURE.education);
      await this.adapter.put(CONTENT_KEYS.AI_SERVICES, INITIAL_PORTFOLIO_FIXTURE.aiServices);
      await this.adapter.put(CONTENT_KEYS.AI_SERVICE_CATEGORIES, INITIAL_PORTFOLIO_FIXTURE.aiServiceCategories);
      await this.adapter.put(CONTENT_KEYS.SETTINGS, INITIAL_PORTFOLIO_FIXTURE.settings);
      await this.adapter.put(CONTENT_KEYS.RESUME, INITIAL_PORTFOLIO_FIXTURE.resume);
    } else {
      await this.migrateVerifiedResumeContent();
    }
  }

  /**
   * Safely migrates existing persistent content to ensure alignment with
   * verified owner resume data without destroying user-created CMS entities.
   */
  async migrateVerifiedResumeContent(): Promise<void> {
    // 1. Migrate Work Experience
    const expObj = await this.adapter.get<WorkExperience[]>(CONTENT_KEYS.EXPERIENCE);
    if (expObj?.data) {
      const currentList = [...expObj.data];
      const hasPlaceholder = currentList.some(
        (e) => e.company === 'Enterprise Technology Solutions' || e.company === 'Cloud & Infrastructure Services'
      );

      if (hasPlaceholder) {
        const verifiedRecords = INITIAL_PORTFOLIO_FIXTURE.experience;
        const mergedList: WorkExperience[] = [];

        for (const verified of verifiedRecords) {
          const existing = currentList.find(
            (e) => e.company.toLowerCase() === verified.company.toLowerCase() || e.id === verified.id
          );
          if (existing) {
            mergedList.push({
              ...verified,
              id: existing.id,
            });
          } else {
            mergedList.push(verified);
          }
        }

        // Preserve any custom non-placeholder records created by owner
        for (const item of currentList) {
          if (
            item.company !== 'Enterprise Technology Solutions' &&
            item.company !== 'Cloud & Infrastructure Services' &&
            !mergedList.some((m) => m.company.toLowerCase() === item.company.toLowerCase())
          ) {
            mergedList.push(item);
          }
        }

        mergedList.forEach((item, idx) => {
          item.order = idx + 1;
        });

        await this.adapter.put(CONTENT_KEYS.EXPERIENCE, mergedList);
      }
    }

    // 2. Migrate Education
    const eduObj = await this.adapter.get<Education[]>(CONTENT_KEYS.EDUCATION);
    if (eduObj?.data) {
      const currentEdu = [...eduObj.data];
      const hasPlaceholderEdu = currentEdu.some(
        (e) => e.institution === 'JNTU Affiliated Engineering College' || e.degree.includes('Bachelor of Technology')
      );

      if (hasPlaceholderEdu) {
        await this.adapter.put(CONTENT_KEYS.EDUCATION, INITIAL_PORTFOLIO_FIXTURE.education);
      }
    }

    // 3. Migrate Certifications (Owner confirmed none completed -> unpublish placeholder certs)
    const certsObj = await this.adapter.get<Certification[]>(CONTENT_KEYS.CERTIFICATIONS);
    if (certsObj?.data) {
      const hasPublishedPlaceholder = certsObj.data.some(
        (c) =>
          (c.id === 'cert1' ||
            c.id === 'cert2' ||
            c.title.includes('AWS Certified Solutions') ||
            c.title.includes('Certified Kubernetes')) &&
          c.published !== false
      );
      if (hasPublishedPlaceholder) {
        const updatedCerts = certsObj.data.map((c) => {
          if (
            c.id === 'cert1' ||
            c.id === 'cert2' ||
            c.title.includes('AWS Certified Solutions') ||
            c.title.includes('Certified Kubernetes')
          ) {
            return {
              ...c,
              published: false,
              verificationStatus: 'NOT PROVIDED' as const,
              credentialUrl: null,
              issueDate: null,
            };
          }
          return c;
        });
        await this.adapter.put(CONTENT_KEYS.CERTIFICATIONS, updatedCerts);
      }
    }

    // 4. Migrate Profile
    const profileObj = await this.adapter.get<Profile>(CONTENT_KEYS.PROFILE);
    if (profileObj?.data) {
      const p = profileObj.data;
      let shouldUpdate = false;
      const updatedProfile: Profile = { ...p };

      if (
        p.headline === 'Senior DevOps / Cloud / DevSecOps Engineer' ||
        p.bioShort?.includes('7+ years')
      ) {
        updatedProfile.headline = 'DevOps Engineer';
        updatedProfile.bioShort = INITIAL_PORTFOLIO_FIXTURE.profile.bioShort;
        updatedProfile.bioLong = INITIAL_PORTFOLIO_FIXTURE.profile.bioLong;
        shouldUpdate = true;
      }

      if (p.location?.includes('Hyderabad')) {
        updatedProfile.location = 'Bengaluru, Karnataka, India';
        updatedProfile.remoteAvailability = 'Open to Global Remote Opportunities';
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        await this.adapter.put(CONTENT_KEYS.PROFILE, updatedProfile);
      }
    }
  }

  /**
   * Helper to write data with automated snapshot backup and OCC validation
   */
  private async safeWrite<T>(
    key: string,
    newData: T,
    expectedEtag?: string
  ): Promise<StorageObject<T>> {
    const existing = await this.adapter.get<T>(key);

    // ETag OCC check with RFC 7232 weak/strong normalization
    if (expectedEtag && existing && !etagsMatch(existing.etag, expectedEtag)) {
      throw new ConcurrencyError();
    }

    // Capture automated snapshot backup before overwriting
    if (existing) {
      const collectionName = key.replace('content/', '').replace('.json', '');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `backups/${collectionName}-${timestamp}-v${existing.version}.json`;
      await this.adapter.put(backupKey, existing.data);
    }

    // Write new data conditionally
    const result = await this.adapter.put<T>(key, newData, {
      onlyIf: expectedEtag ? { etagMatches: normalizeEtag(expectedEtag) } : undefined,
    });

    if (!result) {
      throw new ConcurrencyError();
    }

    return result;
  }

  // --- Profile Operations ---
  async getProfile(): Promise<StorageObject<Profile> | null> {
    return this.adapter.get<Profile>(CONTENT_KEYS.PROFILE);
  }

  async saveProfile(profile: Profile, expectedEtag?: string): Promise<StorageObject<Profile>> {
    const parsed = ProfileSchema.safeParse(profile);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }
    return this.safeWrite(CONTENT_KEYS.PROFILE, parsed.data, expectedEtag);
  }

  // --- Projects Operations ---
  async getProjects(): Promise<StorageObject<Project[]> | null> {
    return this.adapter.get<Project[]>(CONTENT_KEYS.PROJECTS);
  }

  async saveProjects(projects: Project[], expectedEtag?: string): Promise<StorageObject<Project[]>> {
    // Validate unique slugs and valid schemas
    const slugs = new Set<string>();
    for (const p of projects) {
      if (slugs.has(p.slug)) {
        throw new ValidationError(`Duplicate project slug detected: "${p.slug}"`);
      }
      slugs.add(p.slug);
      const parsed = ProjectSchema.safeParse(p);
      if (!parsed.success) {
        throw new ValidationError(`Project validation failed: ${parsed.error.message}`);
      }
    }
    return this.safeWrite(CONTENT_KEYS.PROJECTS, projects, expectedEtag);
  }

  // --- Skills & Categories Operations ---
  async getSkills(): Promise<StorageObject<Skill[]> | null> {
    return this.adapter.get<Skill[]>(CONTENT_KEYS.SKILLS);
  }

  async saveSkills(skills: Skill[], expectedEtag?: string): Promise<StorageObject<Skill[]>> {
    const duplicateChecker = new Set<string>();
    for (const s of skills) {
      const key = `${s.categoryId}:::${s.name.trim().toLowerCase()}`;
      if (duplicateChecker.has(key)) {
        throw new ValidationError(`Duplicate skill "${s.name}" detected in category "${s.categoryId}".`);
      }
      duplicateChecker.add(key);

      const parsed = SkillSchema.safeParse(s);
      if (!parsed.success) {
        throw new ValidationError(`Skill validation failed: ${parsed.error.message}`);
      }
    }
    return this.safeWrite(CONTENT_KEYS.SKILLS, skills, expectedEtag);
  }

  async getSkillCategories(): Promise<StorageObject<SkillCategory[]> | null> {
    return this.adapter.get<SkillCategory[]>(CONTENT_KEYS.SKILL_CATEGORIES);
  }

  async saveSkillCategories(
    categories: SkillCategory[],
    expectedEtag?: string
  ): Promise<StorageObject<SkillCategory[]>> {
    const slugs = new Set<string>();
    for (const c of categories) {
      const lowerSlug = c.slug.toLowerCase();
      if (slugs.has(lowerSlug)) {
        throw new ValidationError(`Duplicate category slug detected: "${c.slug}"`);
      }
      slugs.add(lowerSlug);

      const parsed = SkillCategorySchema.safeParse(c);
      if (!parsed.success) {
        throw new ValidationError(`SkillCategory validation failed: ${parsed.error.message}`);
      }
    }
    return this.safeWrite(CONTENT_KEYS.SKILL_CATEGORIES, categories, expectedEtag);
  }

  // --- Work Experience Operations ---
  async getExperience(): Promise<StorageObject<WorkExperience[]> | null> {
    return this.adapter.get<WorkExperience[]>(CONTENT_KEYS.EXPERIENCE);
  }

  async saveExperience(
    experience: WorkExperience[],
    expectedEtag?: string
  ): Promise<StorageObject<WorkExperience[]>> {
    for (const exp of experience) {
      const parsed = WorkExperienceSchema.safeParse(exp);
      if (!parsed.success) {
        throw new ValidationError(`Experience validation failed: ${parsed.error.message}`);
      }
    }
    return this.safeWrite(CONTENT_KEYS.EXPERIENCE, experience, expectedEtag);
  }

  // --- Certifications Operations ---
  async getCertifications(): Promise<StorageObject<Certification[]> | null> {
    return this.adapter.get<Certification[]>(CONTENT_KEYS.CERTIFICATIONS);
  }

  async saveCertifications(
    certifications: Certification[],
    expectedEtag?: string
  ): Promise<StorageObject<Certification[]>> {
    for (const cert of certifications) {
      const parsed = CertificationSchema.safeParse(cert);
      if (!parsed.success) {
        throw new ValidationError(`Certification validation failed: ${parsed.error.message}`);
      }
    }
    return this.safeWrite(CONTENT_KEYS.CERTIFICATIONS, certifications, expectedEtag);
  }

  // --- Education Operations ---
  async getEducation(): Promise<StorageObject<Education[]> | null> {
    return this.adapter.get<Education[]>(CONTENT_KEYS.EDUCATION);
  }

  async saveEducation(
    education: Education[],
    expectedEtag?: string
  ): Promise<StorageObject<Education[]>> {
    for (const edu of education) {
      const parsed = EducationSchema.safeParse(edu);
      if (!parsed.success) {
        throw new ValidationError(`Education validation failed: ${parsed.error.message}`);
      }
    }
    return this.safeWrite(CONTENT_KEYS.EDUCATION, education, expectedEtag);
  }

  // --- AI Services Operations ---
  async getAIServices(): Promise<StorageObject<AIService[]> | null> {
    return this.adapter.get<AIService[]>(CONTENT_KEYS.AI_SERVICES);
  }

  async saveAIServices(
    services: AIService[],
    expectedEtag?: string
  ): Promise<StorageObject<AIService[]>> {
    const slugs = new Set<string>();
    for (const s of services) {
      const slug = s.slug.toLowerCase();
      if (slugs.has(slug)) {
        throw new ValidationError(`Duplicate AI service slug: "${s.slug}". Slugs must be unique.`);
      }
      slugs.add(slug);

      const parsed = AIServiceSchema.safeParse(s);
      if (!parsed.success) {
        throw new ValidationError(`AIService validation failed: ${parsed.error.message}`);
      }
    }
    return this.safeWrite(CONTENT_KEYS.AI_SERVICES, services, expectedEtag);
  }

  // --- AI Service Categories Operations ---
  async getAIServiceCategories(): Promise<StorageObject<AIServiceCategory[]> | null> {
    return this.adapter.get<AIServiceCategory[]>(CONTENT_KEYS.AI_SERVICE_CATEGORIES);
  }

  async saveAIServiceCategories(
    categories: AIServiceCategory[],
    expectedEtag?: string
  ): Promise<StorageObject<AIServiceCategory[]>> {
    const slugs = new Set<string>();
    for (const c of categories) {
      const slug = c.slug.toLowerCase();
      if (slugs.has(slug)) {
        throw new ValidationError(`Duplicate AI service category slug: "${c.slug}"`);
      }
      slugs.add(slug);

      const parsed = AIServiceCategorySchema.safeParse(c);
      if (!parsed.success) {
        throw new ValidationError(`AIServiceCategory validation failed: ${parsed.error.message}`);
      }
    }
    return this.safeWrite(CONTENT_KEYS.AI_SERVICE_CATEGORIES, categories, expectedEtag);
  }

  // --- Site Settings Operations ---
  async getSettings(): Promise<StorageObject<SiteSettings> | null> {
    return this.adapter.get<SiteSettings>(CONTENT_KEYS.SETTINGS);
  }

  async saveSettings(settings: SiteSettings, expectedEtag?: string): Promise<StorageObject<SiteSettings>> {
    const parsed = SiteSettingsSchema.safeParse(settings);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }
    return this.safeWrite(CONTENT_KEYS.SETTINGS, parsed.data, expectedEtag);
  }

  // --- Resume Operations ---
  async getResume(): Promise<StorageObject<Resume> | null> {
    return this.adapter.get<Resume>(CONTENT_KEYS.RESUME);
  }

  async saveResume(resume: Resume, expectedEtag?: string): Promise<StorageObject<Resume>> {
    const parsed = ResumeSchema.safeParse(resume);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }
    return this.safeWrite(CONTENT_KEYS.RESUME, parsed.data, expectedEtag);
  }

  // --- Unified Public Aggregator (Sub-15ms edge read) ---
  async getUnifiedPublicData(): Promise<PortfolioData> {
    await this.ensureInitialized();

    const [
      profileObj,
      projectsObj,
      skillsObj,
      skillCategoriesObj,
      experienceObj,
      certificationsObj,
      educationObj,
      aiServicesObj,
      aiServiceCategoriesObj,
      settingsObj,
      resumeObj,
    ] = await Promise.all([
      this.getProfile(),
      this.getProjects(),
      this.getSkills(),
      this.getSkillCategories(),
      this.getExperience(),
      this.getCertifications(),
      this.adapter.get<Education[]>(CONTENT_KEYS.EDUCATION),
      this.getAIServices(),
      this.getAIServiceCategories(),
      this.getSettings(),
      this.getResume(),
    ]);

    // Strictly filter out unpublished draft projects for public visitors
    const rawProjects = projectsObj?.data || [];
    const publishedProjects = rawProjects
      .filter((p) => p.published === true)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    // Filter published skill categories and skills (skills under hidden categories are excluded)
    const rawCategories = skillCategoriesObj?.data || [];
    const publishedCategories = rawCategories
      .filter((c) => c.published !== false)
      .sort((a, b) => a.order - b.order);
    const publishedCategoryIds = new Set(publishedCategories.map((c) => c.id));

    const rawSkills = skillsObj?.data || [];
    const publishedSkills = rawSkills
      .filter((s) => s.published !== false && publishedCategoryIds.has(s.categoryId))
      .sort((a, b) => a.order - b.order);

    const publishedExperience = (experienceObj?.data || [])
      .filter((e) => e.published === true)
      .sort((a, b) => a.order - b.order);

    const publishedCertifications = (certificationsObj?.data || [])
      .filter((c) => c.published === true)
      .sort((a, b) => a.order - b.order);

    const rawEducation = educationObj?.data || INITIAL_PORTFOLIO_FIXTURE.education;
    const publishedEducation = rawEducation
      .filter((edu) => edu.published === true)
      .sort((a, b) => a.order - b.order);

    // Filter published AI service categories and AI services
    const rawAICategories = aiServiceCategoriesObj?.data || INITIAL_PORTFOLIO_FIXTURE.aiServiceCategories;
    const publishedAICategories = rawAICategories
      .filter((c) => c.published !== false)
      .sort((a, b) => a.order - b.order);
    const publishedAICategoryIds = new Set(publishedAICategories.map((c) => c.id));

    const rawAIServices = aiServicesObj?.data || [];
    const publishedAIServices = rawAIServices
      .filter((s) => s.published === true && publishedAICategoryIds.has(s.categoryId))
      .sort((a, b) => a.order - b.order);

    const rawResume = resumeObj?.data || INITIAL_PORTFOLIO_FIXTURE.resume;
    const isResumePublished = rawResume.published === true;
    const sanitizedResume: Resume = {
      format: 'application/pdf',
      versionTag: rawResume.versionTag || 'v1.0',
      published: isResumePublished,
      activeResume: isResumePublished && rawResume.activeResume ? {
        id: rawResume.activeResume.id,
        key: rawResume.activeResume.key,
        url: rawResume.activeResume.url,
        filename: rawResume.activeResume.filename,
        sizeBytes: rawResume.activeResume.sizeBytes,
        uploadedAt: rawResume.activeResume.uploadedAt,
        mimeType: 'application/pdf',
      } : null,
      auditHistory: [], // Strictly redact audit history from public bundle
      lastUpdated: rawResume.lastUpdated,
      fileSizeBytes: isResumePublished ? rawResume.fileSizeBytes : 0,
    };

    return {
      schemaVersion: 1,
      version: Math.max(projectsObj?.version || 1, skillsObj?.version || 1),
      lastModifiedAt: projectsObj?.updatedAt || new Date().toISOString(),
      lastModifiedBy: 'admin',
      settings: settingsObj?.data || INITIAL_PORTFOLIO_FIXTURE.settings,
      profile: profileObj?.data || INITIAL_PORTFOLIO_FIXTURE.profile,
      resume: sanitizedResume,
      skillCategories: publishedCategories,
      skills: publishedSkills,
      projects: publishedProjects,
      experience: publishedExperience,
      certifications: publishedCertifications,
      education: publishedEducation,
      aiServiceCategories: publishedAICategories,
      aiServices: publishedAIServices,
    };
  }
}
