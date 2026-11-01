import { z } from 'zod';

export const MediaAssetSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1),
  url: z.string().refine((val) => val.startsWith('/') || /^https?:\/\//i.test(val), {
    message: 'Must be a valid URL or root-relative path',
  }),
  filename: z.string().min(1).optional(),
  mimeType: z.enum([
    'image/webp',
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'application/pdf',
  ]).optional(),
  sizeBytes: z.number().int().positive().optional(),
  uploadedAt: z.string().optional(),
  altText: z.string().optional(),
  caption: z.string().optional(),
});

export type MediaAsset = z.infer<typeof MediaAssetSchema>;

/**
 * Safe HTTP/HTTPS URL schema preventing javascript:, data:, and other dangerous protocol injection
 */
export const SafeHttpUrlSchema = z
  .string()
  .url()
  .refine(
    (val) => /^https?:\/\//i.test(val.trim()),
    { message: 'URL must use safe http:// or https:// protocol' }
  );

export const SocialLinksSchema = z.object({
  github: SafeHttpUrlSchema,
  linkedin: SafeHttpUrlSchema,
  email: z.string().email(),
  twitter: SafeHttpUrlSchema.optional(),
  medium: SafeHttpUrlSchema.optional(),
  calendar: SafeHttpUrlSchema.optional(),
});

export type SocialLinks = z.infer<typeof SocialLinksSchema>;

export const AboutCompetencyItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().min(1, 'Category description is required'),
  color: z.enum(['blue', 'teal', 'indigo', 'cyan', 'amber', 'rose', 'slate', 'emerald']).default('blue'),
  visible: z.boolean().default(true),
  order: z.number().int().default(0),
});

export type AboutCompetencyItem = z.infer<typeof AboutCompetencyItemSchema>;

export const DEFAULT_ABOUT_COMPETENCIES: AboutCompetencyItem[] = [
  {
    id: 'comp-cloud-infra',
    name: 'Cloud Infrastructure',
    description: 'AWS, Cloudflare, Linux Systems, Terraform, Helm',
    color: 'blue',
    visible: true,
    order: 0,
  },
  {
    id: 'comp-devsecops',
    name: 'DevSecOps & CI/CD',
    description: 'Jenkins, GitHub Actions, SonarQube, Trivy, Vault',
    color: 'teal',
    visible: true,
    order: 1,
  },
  {
    id: 'comp-containers',
    name: 'Containers',
    description: 'Docker, Kubernetes (EKS), Zero-Downtime Releases',
    color: 'indigo',
    visible: true,
    order: 2,
  },
  {
    id: 'comp-app-dev',
    name: 'Application Dev',
    description: 'Java, Spring Boot, Kotlin, Android SDK, Room DB',
    color: 'cyan',
    visible: true,
    order: 3,
  },
  {
    id: 'comp-ai-automation',
    name: 'AI Automation',
    description: 'LangChain, LLM Agents, Voice Workflows, WebSockets',
    color: 'amber',
    visible: true,
    order: 4,
  },
];

export const DEFAULT_ABOUT_SECONDARY_PARAGRAPH =
  'My focus centers on eliminating operational friction through Infrastructure as Code (Terraform), robust containerization (Docker, Kubernetes), automated vulnerability scanning (SonarQube, Trivy), and integrating state-of-the-art AI agents to automate business workflows.';

export const DEFAULT_ABOUT_HIGHLIGHTS = [
  'Shift-Left DevSecOps Practice',
  'Kubernetes & Cloud Infrastructure',
  'Java & Android Engineering',
  'Autonomous AI Agent Pipelines',
];

export const ProfileSchema = z.object({
  fullName: z.string().min(2),
  headline: z.string().min(5),
  bioShort: z.string().min(20),
  bioLong: z.string().min(50),
  location: z.string().min(2),
  remoteAvailability: z.string().optional(),
  contactEmail: z.string().email(),
  phone: z.string().nullable().optional(),
  availabilityStatus: z.string().min(3),
  social: SocialLinksSchema,
  avatar: MediaAssetSchema.nullable().optional(),
  heroHeadline: z.string().optional(),
  heroSubtitle: z.string().optional(),
  heroStat1Value: z.string().optional(),
  heroStat1Label: z.string().optional(),
  heroStat2Value: z.string().optional(),
  heroStat2Label: z.string().optional(),
  aboutTitle: z.string().optional(),
  aboutSubtitle: z.string().optional(),
  aboutHighlights: z.array(z.string()).optional(),
  aboutSecondaryParagraph: z.string().optional(),
  aboutSecondaryParagraphVisible: z.boolean().optional(),
  aboutCompetenciesTitle: z.string().optional(),
  aboutCompetenciesVisible: z.boolean().optional(),
  aboutCompetencies: z.array(AboutCompetencyItemSchema).optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;

export const ResumeSchema = z.object({
  activeResume: MediaAssetSchema.nullable(),
  format: z.literal('application/pdf'),
  lastUpdated: z.string(),
  fileSizeBytes: z.number().int().nonnegative(),
  versionTag: z.string(),
  published: z.boolean().default(false),
  headline: z.string().optional(),
  description: z.string().optional(),
  auditHistory: z.array(z.object({
    key: z.string(),
    filename: z.string(),
    uploadedAt: z.string(),
    sizeBytes: z.number().int(),
  })).default([]),
});

export type Resume = z.infer<typeof ResumeSchema>;

export const ArchitectureCategorySchema = z.enum([
  'System Architecture',
  'Cloud Infrastructure',
  'CI/CD Pipeline',
  'Deployment Architecture',
  'Security Architecture',
  'Data Flow',
  'AI Workflow',
  'Application Architecture',
]);
export type ArchitectureCategory = z.infer<typeof ArchitectureCategorySchema>;

export const ArchitectureDiagramSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  title: z.string().min(2),
  description: z.string().optional(),
  category: ArchitectureCategorySchema.default('System Architecture'),
  image: MediaAssetSchema,
  components: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  componentDescriptions: z.array(z.string()).default([]),
  technologyReferences: z.array(z.string()).default([]),
  displayOrder: z.number().int().default(0),
  published: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  revision: z.number().int().default(1),
});
export type ArchitectureDiagram = z.infer<typeof ArchitectureDiagramSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  slug: z.string().min(2),
  title: z.string().min(3),
  category: z.string().min(2),
  summary: z.string().min(10),
  detailedOverview: z.string().optional(),
  problemStatement: z.string().optional(),
  solutionArchitecture: z.string().optional(),
  features: z.array(z.string()).default([]),
  technicalChallenges: z.string().optional(),
  testingDetails: z.string().optional(),
  techStack: z.array(z.string()).min(1),
  githubUrl: SafeHttpUrlSchema.nullable().optional(),
  liveDemoUrl: SafeHttpUrlSchema.nullable().optional(),
  googlePlayUrl: SafeHttpUrlSchema.nullable().optional(),
  deploymentStatus: z.string().min(2),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
  coverImage: MediaAssetSchema.nullable().optional(),
  screenshots: z.array(MediaAssetSchema).default([]),
  architectureDiagram: MediaAssetSchema.nullable().optional(),
  architectureDiagrams: z.array(ArchitectureDiagramSchema).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  revision: z.number().int().default(1),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    keywords: z.array(z.string()).default([]),
  }).optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const SkillCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/i, 'Slug must contain only alphanumeric characters and hyphens'),
  description: z.string().optional(),
  icon: z.string().default('Layers'),
  order: z.number().int().default(0),
  published: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  revision: z.number().int().default(1),
});

export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export const SkillProficiencySchema = z.enum(['Core Competency', 'Advanced', 'Proficient']);
export type SkillProficiency = z.infer<typeof SkillProficiencySchema>;

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  categoryId: z.string(),
  proficiencyLevel: SkillProficiencySchema.default('Core Competency'),
  description: z.string().optional(),
  iconIdentifier: z.string().min(1).regex(/^[a-z0-9-]+$/i, 'Icon identifier must contain only alphanumeric characters and hyphens'),
  officialUrl: SafeHttpUrlSchema.nullable().optional(),
  featured: z.boolean().default(false),
  order: z.number().int().default(0),
  published: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  revision: z.number().int().default(1),
});

export type Skill = z.infer<typeof SkillSchema>;

export const WorkExperienceSchema = z.object({
  id: z.string(),
  role: z.string().min(2),
  company: z.string().min(2),
  companyUrl: SafeHttpUrlSchema.nullable().optional(),
  employmentType: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().min(4),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().default(false),
  summary: z.string().optional(),
  responsibilities: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  techStack: z.array(z.string()).default([]),
  order: z.number().int().default(0),
  published: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  revision: z.number().int().default(1),
});

export type WorkExperience = z.infer<typeof WorkExperienceSchema>;

export const VerificationStatusSchema = z.enum(['VERIFIED', 'UNVERIFIED', 'NOT PROVIDED']);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const CertificationSchema = z.object({
  id: z.string(),
  title: z.string().min(2),
  issuer: z.string().min(2),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  credentialId: z.string().optional(),
  credentialUrl: SafeHttpUrlSchema.nullable().optional(),
  badgeImage: MediaAssetSchema.nullable().optional(),
  description: z.string().optional(),
  verificationStatus: VerificationStatusSchema.default('NOT PROVIDED'),
  order: z.number().int().default(0),
  published: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  revision: z.number().int().default(1),
});

export type Certification = z.infer<typeof CertificationSchema>;

export const EducationSchema = z.object({
  id: z.string(),
  degree: z.string().min(2),
  institution: z.string().min(2),
  fieldOfStudy: z.string().min(2),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  startYear: z.number().int().optional(),
  endYear: z.number().int().nullable().optional(),
  description: z.string().optional(),
  grade: z.string().optional(),
  order: z.number().int().default(0),
  published: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  revision: z.number().int().default(1),
});

export type Education = z.infer<typeof EducationSchema>;

export const AIDeliveryStatusSchema = z.enum([
  'Live / Deployed',
  'Working Prototype',
  'In Development',
  'Planned',
  'Not Available',
]);
export type AIDeliveryStatus = z.infer<typeof AIDeliveryStatusSchema>;

export const AIEvidenceStatusSchema = z.enum([
  'Verified',
  'Owner-Reported',
  'Not Verified',
]);
export type AIEvidenceStatus = z.infer<typeof AIEvidenceStatusSchema>;

export const AIServiceCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/i, 'Slug must contain only alphanumeric characters and hyphens'),
  description: z.string().optional(),
  icon: z.string().default('Bot'),
  order: z.number().int().default(0),
  published: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  revision: z.number().int().default(1),
});

export type AIServiceCategory = z.infer<typeof AIServiceCategorySchema>;

export const AIServiceSchema = z.object({
  id: z.string(),
  title: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/i, 'Slug must contain only alphanumeric characters and hyphens'),
  categoryId: z.string().default('custom-ai-integrations'),
  category: z.string().default('Custom AI Integrations'),
  shortDescription: z.string().optional(),
  description: z.string().min(10),
  customerProblem: z.string().optional(),
  proposedSolution: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  useCases: z.array(z.string()).default([]),
  integrations: z.array(z.string()).default([]),
  tooling: z.array(z.string()).default([]),
  targetIndustries: z.array(z.string()).default([]),
  coverImage: MediaAssetSchema.nullable().optional(),
  screenshot: MediaAssetSchema.nullable().optional(),
  screenshots: z.array(MediaAssetSchema).default([]),
  demoUrl: SafeHttpUrlSchema.nullable().optional(),
  relatedProjectIds: z.array(z.string()).default([]),
  deliveryStatus: AIDeliveryStatusSchema.default('Planned'),
  evidenceStatus: AIEvidenceStatusSchema.default('Not Verified'),
  status: z.string().optional(),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  order: z.number().int().default(0),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  revision: z.number().int().default(1),
});

export type AIService = z.infer<typeof AIServiceSchema>;

export const SiteSettingsSchema = z.object({
  siteTitle: z.string(),
  metaDescription: z.string(),
  ogImage: MediaAssetSchema.nullable().optional(),
  contactEmail: z.string().email(),
  footerText: z.string(),
  turnstileSiteKey: z.string().optional(),
  analyticsEnabled: z.boolean().default(false),
  keywords: z.array(z.string()).optional(),
  seoAuthor: z.string().optional(),
});

export type SiteSettings = z.infer<typeof SiteSettingsSchema>;

export const PortfolioDataSchema = z.object({
  schemaVersion: z.literal(1),
  version: z.number().int().positive(),
  lastModifiedAt: z.string(),
  lastModifiedBy: z.string(),
  settings: SiteSettingsSchema,
  profile: ProfileSchema,
  resume: ResumeSchema,
  skillCategories: z.array(SkillCategorySchema),
  skills: z.array(SkillSchema),
  projects: z.array(ProjectSchema),
  experience: z.array(WorkExperienceSchema),
  certifications: z.array(CertificationSchema),
  education: z.array(EducationSchema),
  aiServiceCategories: z.array(AIServiceCategorySchema).default([]),
  aiServices: z.array(AIServiceSchema),
});

export type PortfolioData = z.infer<typeof PortfolioDataSchema>;

