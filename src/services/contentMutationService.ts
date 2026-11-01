import { ContentStore, ValidationError, NotFoundError } from '../storage/contentStore';
import {
  Profile,
  Project,
  ProjectSchema,
  ArchitectureDiagram,
  ArchitectureDiagramSchema,
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
  Resume,
  MediaAsset,
} from '../types/portfolio';

export class ContentMutationService {
  constructor(private store: ContentStore) {}

  // ==========================================
  // PROJECTS MUTATIONS
  // ==========================================

  async createProject(
    projectData: Partial<Project> & { title: string; category: string; summary: string; techStack: string[]; deploymentStatus: string },
    expectedEtag?: string
  ): Promise<{ project: Project; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getProjects();
    const projects = existingObj ? [...existingObj.data] : [];

    // Auto-generate ID and slug if missing
    const id = projectData.id || crypto.randomUUID();
    const slug = (
      projectData.slug ||
      projectData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
    );

    // Validate duplicate slug
    if (projects.some((p) => p.slug === slug)) {
      throw new ValidationError(`Duplicate project slug detected: "${slug}"`);
    }

    const now = new Date().toISOString();
    const newProject: Project = {
      id,
      slug,
      title: projectData.title,
      category: projectData.category,
      summary: projectData.summary,
      detailedOverview: projectData.detailedOverview,
      problemStatement: projectData.problemStatement,
      solutionArchitecture: projectData.solutionArchitecture,
      features: projectData.features ?? [],
      technicalChallenges: projectData.technicalChallenges,
      testingDetails: projectData.testingDetails,
      techStack: projectData.techStack,
      githubUrl: projectData.githubUrl,
      liveDemoUrl: projectData.liveDemoUrl,
      googlePlayUrl: projectData.googlePlayUrl,
      deploymentStatus: projectData.deploymentStatus,
      featured: projectData.featured ?? false,
      published: projectData.published ?? false,
      displayOrder: projectData.displayOrder ?? projects.length + 1,
      coverImage: projectData.coverImage,
      screenshots: projectData.screenshots ?? [],
      architectureDiagram: projectData.architectureDiagram,
      architectureDiagrams: projectData.architectureDiagrams ?? [],
      createdAt: projectData.createdAt || now,
      updatedAt: now,
      revision: 1,
      seo: projectData.seo,
    };

    if (newProject.featured && !newProject.published) {
      throw new ValidationError('Featured projects must be published.');
    }

    const parsed = ProjectSchema.safeParse(newProject);
    if (!parsed.success) {
      throw new ValidationError(`Invalid project data: ${parsed.error.message}`);
    }

    projects.push(parsed.data);
    const saveResult = await this.store.saveProjects(projects, expectedEtag ?? existingObj?.etag);
    return { project: parsed.data, etag: saveResult.etag };
  }

  async updateProject(
    id: string,
    updates: Partial<Project>,
    expectedEtag?: string
  ): Promise<{ project: Project; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getProjects();
    const projects = existingObj ? [...existingObj.data] : [];

    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundError(`Project with id "${id}" not found.`);
    }

    // If updating slug, check for collisions
    if (updates.slug && updates.slug !== projects[index].slug) {
      if (projects.some((p) => p.id !== id && p.slug === updates.slug)) {
        throw new ValidationError(`Duplicate project slug detected: "${updates.slug}"`);
      }
    }

    const now = new Date().toISOString();
    const current = projects[index];
    const revision = (current.revision || 1) + 1;
    const merged = { ...current, ...updates, id, updatedAt: now, revision };

    // Enforce publication invariant: Featured projects must be published
    if (merged.featured && !merged.published) {
      if (updates.featured) {
        throw new ValidationError('Featured projects must be published.');
      } else {
        // If unpublishing, auto-disable featured flag
        merged.featured = false;
      }
    }

    const parsed = ProjectSchema.safeParse(merged);
    if (!parsed.success) {
      throw new ValidationError(`Invalid project data: ${parsed.error.message}`);
    }

    projects[index] = parsed.data;
    const saveResult = await this.store.saveProjects(projects, expectedEtag ?? existingObj?.etag);
    return { project: parsed.data, etag: saveResult.etag };
  }

  async deleteProject(
    id: string,
    expectedEtag?: string
  ): Promise<{ success: boolean; deletedProject: Project; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getProjects();
    const projects = existingObj ? [...existingObj.data] : [];

    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundError(`Project with id "${id}" not found.`);
    }

    const [deletedProject] = projects.splice(index, 1);
    const saveResult = await this.store.saveProjects(projects, expectedEtag ?? existingObj?.etag);
    return { success: true, deletedProject, etag: saveResult.etag };
  }

  async publishProject(
    id: string,
    published: boolean,
    expectedEtag?: string
  ): Promise<{ project: Project; etag: string }> {
    return this.updateProject(id, { published }, expectedEtag);
  }

  async reorderProjects(
    orderedIds: string[],
    expectedEtag?: string
  ): Promise<{ projects: Project[]; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getProjects();
    const projects = existingObj ? [...existingObj.data] : [];

    const updatedProjects = projects.map((p) => {
      const newOrder = orderedIds.indexOf(p.id);
      return newOrder !== -1 ? { ...p, displayOrder: newOrder + 1 } : p;
    });

    updatedProjects.sort((a, b) => a.displayOrder - b.displayOrder);
    const saveResult = await this.store.saveProjects(updatedProjects, expectedEtag ?? existingObj?.etag);
    return { projects: updatedProjects, etag: saveResult.etag };
  }

  // ==========================================
  // ARCHITECTURE DIAGRAMS MUTATIONS
  // ==========================================

  async addProjectArchitectureDiagram(
    projectId: string,
    diagramData: Partial<ArchitectureDiagram> & { title: string; description: string; image: MediaAsset },
    expectedEtag?: string
  ): Promise<{ diagram: ArchitectureDiagram; project: Project; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getProjects();
    const projects = existingObj ? [...existingObj.data] : [];

    const projectIndex = projects.findIndex((p) => p.id === projectId);
    if (projectIndex === -1) {
      throw new NotFoundError(`Project with id "${projectId}" not found.`);
    }

    const project = projects[projectIndex];
    const currentDiagrams = project.architectureDiagrams ? [...project.architectureDiagrams] : [];

    const now = new Date().toISOString();
    const newDiagram: ArchitectureDiagram = {
      id: diagramData.id || crypto.randomUUID(),
      projectId,
      title: diagramData.title.trim(),
      description: diagramData.description ? diagramData.description.trim() : undefined,
      category: diagramData.category || 'System Architecture',
      image: diagramData.image,
      components: diagramData.components ?? diagramData.componentDescriptions ?? [],
      technologies: diagramData.technologies ?? diagramData.technologyReferences ?? [],
      componentDescriptions: diagramData.componentDescriptions ?? diagramData.components ?? [],
      technologyReferences: diagramData.technologyReferences ?? diagramData.technologies ?? [],
      displayOrder: diagramData.displayOrder ?? currentDiagrams.length + 1,
      published: diagramData.published ?? true,
      createdAt: diagramData.createdAt || now,
      updatedAt: now,
      revision: 1,
    };

    const parsed = ArchitectureDiagramSchema.safeParse(newDiagram);
    if (!parsed.success) {
      throw new ValidationError(`Invalid architecture diagram data: ${parsed.error.message}`);
    }

    currentDiagrams.push(parsed.data);
    const updatedProject: Project = {
      ...project,
      architectureDiagrams: currentDiagrams,
      updatedAt: now,
      revision: (project.revision || 1) + 1,
    };

    projects[projectIndex] = updatedProject;
    const saveResult = await this.store.saveProjects(projects, expectedEtag ?? existingObj?.etag);
    return { diagram: parsed.data, project: updatedProject, etag: saveResult.etag };
  }

  async updateProjectArchitectureDiagram(
    projectId: string,
    diagramId: string,
    updates: Partial<ArchitectureDiagram>,
    expectedEtag?: string
  ): Promise<{ diagram: ArchitectureDiagram; project: Project; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getProjects();
    const projects = existingObj ? [...existingObj.data] : [];

    const projectIndex = projects.findIndex((p) => p.id === projectId);
    if (projectIndex === -1) {
      throw new NotFoundError(`Project with id "${projectId}" not found.`);
    }

    const project = projects[projectIndex];
    const currentDiagrams = project.architectureDiagrams ? [...project.architectureDiagrams] : [];

    const diagramIndex = currentDiagrams.findIndex((d) => d.id === diagramId);
    if (diagramIndex === -1) {
      throw new NotFoundError(`Architecture diagram with id "${diagramId}" not found in project "${projectId}".`);
    }

    const currentDiagram = currentDiagrams[diagramIndex];
    const now = new Date().toISOString();
    const merged: ArchitectureDiagram = {
      ...currentDiagram,
      ...updates,
      id: diagramId,
      projectId,
      title: updates.title !== undefined ? updates.title.trim() : currentDiagram.title,
      description: updates.description !== undefined ? updates.description.trim() : currentDiagram.description,
      updatedAt: now,
      revision: (currentDiagram.revision || 1) + 1,
    };

    const parsed = ArchitectureDiagramSchema.safeParse(merged);
    if (!parsed.success) {
      throw new ValidationError(`Invalid architecture diagram data: ${parsed.error.message}`);
    }

    currentDiagrams[diagramIndex] = parsed.data;
    const updatedProject: Project = {
      ...project,
      architectureDiagrams: currentDiagrams,
      updatedAt: now,
      revision: (project.revision || 1) + 1,
    };

    projects[projectIndex] = updatedProject;
    const saveResult = await this.store.saveProjects(projects, expectedEtag ?? existingObj?.etag);
    return { diagram: parsed.data, project: updatedProject, etag: saveResult.etag };
  }

  async deleteProjectArchitectureDiagram(
    projectId: string,
    diagramId: string,
    expectedEtag?: string
  ): Promise<{ success: boolean; deletedDiagram: ArchitectureDiagram; project: Project; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getProjects();
    const projects = existingObj ? [...existingObj.data] : [];

    const projectIndex = projects.findIndex((p) => p.id === projectId);
    if (projectIndex === -1) {
      throw new NotFoundError(`Project with id "${projectId}" not found.`);
    }

    const project = projects[projectIndex];
    const currentDiagrams = project.architectureDiagrams ? [...project.architectureDiagrams] : [];

    const diagramIndex = currentDiagrams.findIndex((d) => d.id === diagramId);
    if (diagramIndex === -1) {
      throw new NotFoundError(`Architecture diagram with id "${diagramId}" not found in project "${projectId}".`);
    }

    const [deletedDiagram] = currentDiagrams.splice(diagramIndex, 1);
    const now = new Date().toISOString();
    const updatedProject: Project = {
      ...project,
      architectureDiagrams: currentDiagrams,
      updatedAt: now,
      revision: (project.revision || 1) + 1,
    };

    projects[projectIndex] = updatedProject;
    const saveResult = await this.store.saveProjects(projects, expectedEtag ?? existingObj?.etag);
    return { success: true, deletedDiagram, project: updatedProject, etag: saveResult.etag };
  }

  async reorderProjectArchitectureDiagrams(
    projectId: string,
    orderedDiagramIds: string[],
    expectedEtag?: string
  ): Promise<{ diagrams: ArchitectureDiagram[]; project: Project; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getProjects();
    const projects = existingObj ? [...existingObj.data] : [];

    const projectIndex = projects.findIndex((p) => p.id === projectId);
    if (projectIndex === -1) {
      throw new NotFoundError(`Project with id "${projectId}" not found.`);
    }

    const project = projects[projectIndex];
    const currentDiagrams = project.architectureDiagrams ? [...project.architectureDiagrams] : [];

    const updatedDiagrams = currentDiagrams.map((d) => {
      const order = orderedDiagramIds.indexOf(d.id);
      return order !== -1 ? { ...d, displayOrder: order + 1 } : d;
    });

    updatedDiagrams.sort((a, b) => a.displayOrder - b.displayOrder);
    const now = new Date().toISOString();
    const updatedProject: Project = {
      ...project,
      architectureDiagrams: updatedDiagrams,
      updatedAt: now,
      revision: (project.revision || 1) + 1,
    };

    projects[projectIndex] = updatedProject;
    const saveResult = await this.store.saveProjects(projects, expectedEtag ?? existingObj?.etag);
    return { diagrams: updatedDiagrams, project: updatedProject, etag: saveResult.etag };
  }

  async toggleProjectArchitectureDiagramPublished(
    projectId: string,
    diagramId: string,
    published: boolean,
    expectedEtag?: string
  ): Promise<{ diagram: ArchitectureDiagram; project: Project; etag: string }> {
    return this.updateProjectArchitectureDiagram(projectId, diagramId, { published }, expectedEtag);
  }

  // ==========================================
  // SKILLS MUTATIONS
  // ==========================================

  async createSkill(
    skillData: Partial<Skill> & { name: string; categoryId: string; iconIdentifier: string; proficiencyLevel?: Skill['proficiencyLevel'] },
    expectedEtag?: string
  ): Promise<{ skill: Skill; etag: string }> {
    await this.store.ensureInitialized();
    const categoriesObj = await this.store.getSkillCategories();
    const categories = categoriesObj ? categoriesObj.data : [];
    const categoryExists = categories.some((c) => c.id === skillData.categoryId);
    if (!categoryExists) {
      throw new ValidationError(`Category with id "${skillData.categoryId}" does not exist.`);
    }

    const existingObj = await this.store.getSkills();
    const skills = existingObj ? [...existingObj.data] : [];

    const normalizedName = skillData.name.trim().toLowerCase();
    const duplicate = skills.find(
      (s) => s.categoryId === skillData.categoryId && s.name.trim().toLowerCase() === normalizedName
    );
    if (duplicate) {
      throw new ValidationError(`A skill named "${skillData.name}" already exists in this category.`);
    }

    const now = new Date().toISOString();
    const newSkill: Skill = {
      id: skillData.id || crypto.randomUUID(),
      name: skillData.name.trim(),
      categoryId: skillData.categoryId,
      proficiencyLevel: skillData.proficiencyLevel || 'Core Competency',
      description: skillData.description,
      iconIdentifier: (skillData.iconIdentifier || 'code').trim().toLowerCase(),
      officialUrl: skillData.officialUrl || null,
      featured: skillData.featured ?? false,
      order: skillData.order ?? skills.length + 1,
      published: skillData.published ?? true,
      createdAt: skillData.createdAt || now,
      updatedAt: now,
      revision: 1,
    };

    const parsed = SkillSchema.safeParse(newSkill);
    if (!parsed.success) {
      throw new ValidationError(`Invalid skill data: ${parsed.error.message}`);
    }

    skills.push(parsed.data);
    const saveResult = await this.store.saveSkills(skills, expectedEtag ?? existingObj?.etag);
    return { skill: parsed.data, etag: saveResult.etag };
  }

  async updateSkill(
    id: string,
    updates: Partial<Skill>,
    expectedEtag?: string
  ): Promise<{ skill: Skill; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getSkills();
    const skills = existingObj ? [...existingObj.data] : [];

    const index = skills.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new NotFoundError(`Skill with id "${id}" not found.`);
    }

    const targetCategoryId = updates.categoryId ?? skills[index].categoryId;
    if (updates.categoryId && updates.categoryId !== skills[index].categoryId) {
      const categoriesObj = await this.store.getSkillCategories();
      const categories = categoriesObj ? categoriesObj.data : [];
      if (!categories.some((c) => c.id === updates.categoryId)) {
        throw new ValidationError(`Category with id "${updates.categoryId}" does not exist.`);
      }
    }

    const targetName = (updates.name ?? skills[index].name).trim().toLowerCase();
    const duplicate = skills.find(
      (s) => s.id !== id && s.categoryId === targetCategoryId && s.name.trim().toLowerCase() === targetName
    );
    if (duplicate) {
      throw new ValidationError(`A skill named "${updates.name || skills[index].name}" already exists in this category.`);
    }

    const merged: Skill = {
      ...skills[index],
      ...updates,
      id,
      name: updates.name ? updates.name.trim() : skills[index].name,
      iconIdentifier: updates.iconIdentifier ? updates.iconIdentifier.trim().toLowerCase() : skills[index].iconIdentifier,
      updatedAt: new Date().toISOString(),
      revision: (skills[index].revision || 1) + 1,
    };

    const parsed = SkillSchema.safeParse(merged);
    if (!parsed.success) {
      throw new ValidationError(`Invalid skill data: ${parsed.error.message}`);
    }

    skills[index] = parsed.data;
    const saveResult = await this.store.saveSkills(skills, expectedEtag ?? existingObj?.etag);
    return { skill: parsed.data, etag: saveResult.etag };
  }

  async deleteSkill(id: string, expectedEtag?: string): Promise<{ success: boolean; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getSkills();
    const skills = existingObj ? [...existingObj.data] : [];

    const index = skills.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new NotFoundError(`Skill with id "${id}" not found.`);
    }

    skills.splice(index, 1);
    const saveResult = await this.store.saveSkills(skills, expectedEtag ?? existingObj?.etag);
    return { success: true, etag: saveResult.etag };
  }

  async reorderSkills(
    orderedIds: string[],
    expectedEtag?: string
  ): Promise<{ skills: Skill[]; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getSkills();
    const skills = existingObj ? [...existingObj.data] : [];

    const updatedSkills = skills.map((s) => {
      const newOrder = orderedIds.indexOf(s.id);
      return newOrder !== -1 ? { ...s, order: newOrder + 1 } : s;
    });

    updatedSkills.sort((a, b) => a.order - b.order);
    const saveResult = await this.store.saveSkills(updatedSkills, expectedEtag ?? existingObj?.etag);
    return { skills: updatedSkills, etag: saveResult.etag };
  }

  // ==========================================
  // SKILL CATEGORIES MUTATIONS
  // ==========================================

  async createSkillCategory(
    categoryData: Partial<SkillCategory> & { name: string; icon?: string; slug?: string },
    expectedEtag?: string
  ): Promise<{ category: SkillCategory; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getSkillCategories();
    const categories = existingObj ? [...existingObj.data] : [];

    const slug = (
      categoryData.slug ||
      categoryData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
    );

    if (categories.some((c) => c.slug.toLowerCase() === slug.toLowerCase())) {
      throw new ValidationError(`Category with slug "${slug}" already exists.`);
    }

    const now = new Date().toISOString();
    const newCategory: SkillCategory = {
      id: categoryData.id || crypto.randomUUID(),
      name: categoryData.name.trim(),
      slug,
      description: categoryData.description,
      icon: categoryData.icon || 'Layers',
      order: categoryData.order ?? categories.length + 1,
      published: categoryData.published ?? true,
      createdAt: categoryData.createdAt || now,
      updatedAt: now,
      revision: 1,
    };

    const parsed = SkillCategorySchema.safeParse(newCategory);
    if (!parsed.success) {
      throw new ValidationError(`Invalid skill category: ${parsed.error.message}`);
    }

    categories.push(parsed.data);
    const saveResult = await this.store.saveSkillCategories(categories, expectedEtag ?? existingObj?.etag);
    return { category: parsed.data, etag: saveResult.etag };
  }

  async updateSkillCategory(
    id: string,
    updates: Partial<SkillCategory>,
    expectedEtag?: string
  ): Promise<{ category: SkillCategory; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getSkillCategories();
    const categories = existingObj ? [...existingObj.data] : [];

    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new NotFoundError(`Skill category with id "${id}" not found.`);
    }

    if (updates.slug && updates.slug.toLowerCase() !== categories[index].slug.toLowerCase()) {
      if (categories.some((c) => c.id !== id && c.slug.toLowerCase() === updates.slug!.toLowerCase())) {
        throw new ValidationError(`Category with slug "${updates.slug}" already exists.`);
      }
    }

    const merged: SkillCategory = {
      ...categories[index],
      ...updates,
      id,
      name: updates.name ? updates.name.trim() : categories[index].name,
      updatedAt: new Date().toISOString(),
      revision: (categories[index].revision || 1) + 1,
    };

    const parsed = SkillCategorySchema.safeParse(merged);
    if (!parsed.success) {
      throw new ValidationError(`Invalid skill category: ${parsed.error.message}`);
    }

    categories[index] = parsed.data;
    const saveResult = await this.store.saveSkillCategories(categories, expectedEtag ?? existingObj?.etag);
    return { category: parsed.data, etag: saveResult.etag };
  }

  async deleteSkillCategory(id: string, expectedEtag?: string): Promise<{ success: boolean; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getSkillCategories();
    const categories = existingObj ? [...existingObj.data] : [];

    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new NotFoundError(`Skill category with id "${id}" not found.`);
    }

    // Safe deletion rule: Block category deletion if it contains active skills
    const skillsObj = await this.store.getSkills();
    const skills = skillsObj?.data || [];
    const associatedSkills = skills.filter((s) => s.categoryId === id);
    if (associatedSkills.length > 0) {
      throw new ValidationError(
        `Cannot delete category "${categories[index].name}" because it contains ${associatedSkills.length} active skills. Please reassign or delete these skills first.`
      );
    }

    categories.splice(index, 1);
    const saveResult = await this.store.saveSkillCategories(categories, expectedEtag ?? existingObj?.etag);
    return { success: true, etag: saveResult.etag };
  }

  async reorderSkillCategories(
    orderedIds: string[],
    expectedEtag?: string
  ): Promise<{ categories: SkillCategory[]; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getSkillCategories();
    const categories = existingObj ? [...existingObj.data] : [];

    const updatedCategories = categories.map((c) => {
      const newOrder = orderedIds.indexOf(c.id);
      return newOrder !== -1 ? { ...c, order: newOrder + 1 } : c;
    });

    updatedCategories.sort((a, b) => a.order - b.order);
    const saveResult = await this.store.saveSkillCategories(updatedCategories, expectedEtag ?? existingObj?.etag);
    return { categories: updatedCategories, etag: saveResult.etag };
  }

  // ==========================================
  // AI SERVICES MUTATIONS
  // ==========================================

  async createAIService(
    data: Partial<AIService> & { title: string; description?: string },
    expectedEtag?: string
  ): Promise<{ service: AIService; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getAIServices();
    const services = existingObj ? [...existingObj.data] : [];

    const title = data.title ? data.title.trim() : '';
    if (!title || title.length < 2) {
      throw new ValidationError('Service title must be at least 2 characters.');
    }

    const shortDescription = (data.shortDescription?.trim()) || (data.description?.trim()) || '';
    if (!shortDescription) {
      throw new ValidationError('Short description is required.');
    }

    const slug = (
      data.slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
    );

    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
      throw new ValidationError('Slug must contain only alphanumeric characters and hyphens.');
    }

    if (services.some((s) => s.slug.toLowerCase() === slug.toLowerCase())) {
      throw new ValidationError(`Duplicate AI service slug: "${slug}" already exists.`);
    }

    if (data.demoUrl && !/^https?:\/\//i.test(data.demoUrl.trim())) {
      throw new ValidationError('Demo URL must be a valid HTTP or HTTPS URL.');
    }

    // Validate relatedProjectIds if provided
    if (data.relatedProjectIds && data.relatedProjectIds.length > 0) {
      const projectsObj = await this.store.getProjects();
      const validProjectIds = new Set((projectsObj?.data || []).map((p) => p.id));
      for (const pId of data.relatedProjectIds) {
        if (!validProjectIds.has(pId)) {
          throw new ValidationError(`Invalid related project ID: related project with id "${pId}" does not exist.`);
        }
      }
    }

    const now = new Date().toISOString();
    const newService: AIService = {
      id: data.id || crypto.randomUUID(),
      title,
      slug,
      categoryId: data.categoryId || 'custom-ai-integrations',
      category: data.category || 'Custom AI Integrations',
      shortDescription: data.shortDescription?.trim() || undefined,
      description: data.description?.trim() || title,
      customerProblem: data.customerProblem?.trim() || undefined,
      proposedSolution: data.proposedSolution?.trim() || undefined,
      capabilities: data.capabilities || [],
      useCases: data.useCases || [],
      integrations: data.integrations || [],
      tooling: data.tooling || [],
      targetIndustries: data.targetIndustries || [],
      coverImage: data.coverImage ?? null,
      screenshot: data.screenshot ?? null,
      screenshots: data.screenshots || [],
      demoUrl: data.demoUrl?.trim() || null,
      relatedProjectIds: data.relatedProjectIds || [],
      deliveryStatus: data.deliveryStatus || 'Planned',
      evidenceStatus: data.evidenceStatus || 'Not Verified',
      status: data.status || data.deliveryStatus || 'Planned',
      published: data.published ?? true,
      featured: data.featured ?? false,
      order: data.order ?? services.length + 1,
      seoTitle: data.seoTitle?.trim() || undefined,
      seoDescription: data.seoDescription?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };

    const parsed = AIServiceSchema.safeParse(newService);
    if (!parsed.success) {
      throw new ValidationError(`Invalid AI service data: ${parsed.error.message}`);
    }

    services.push(parsed.data);
    const saveResult = await this.store.saveAIServices(services, expectedEtag ?? existingObj?.etag);
    return { service: parsed.data, etag: saveResult.etag };
  }

  async updateAIService(
    id: string,
    updates: Partial<AIService>,
    expectedEtag?: string
  ): Promise<{ service: AIService; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getAIServices();
    const services = existingObj ? [...existingObj.data] : [];

    const index = services.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new NotFoundError(`AI service with id "${id}" not found.`);
    }

    if (updates.slug) {
      const slug = updates.slug.trim().toLowerCase();
      if (!/^[a-z0-9-]+$/i.test(slug)) {
        throw new ValidationError('Slug must contain only alphanumeric characters and hyphens.');
      }
      if (services.some((s) => s.id !== id && s.slug.toLowerCase() === slug)) {
        throw new ValidationError(`Duplicate AI service slug: "${slug}" already exists.`);
      }
    }

    if (updates.demoUrl && !/^https?:\/\//i.test(updates.demoUrl.trim())) {
      throw new ValidationError('Demo URL must be a valid HTTP or HTTPS URL.');
    }

    if (updates.relatedProjectIds && updates.relatedProjectIds.length > 0) {
      const projectsObj = await this.store.getProjects();
      const validProjectIds = new Set((projectsObj?.data || []).map((p) => p.id));
      for (const pId of updates.relatedProjectIds) {
        if (!validProjectIds.has(pId)) {
          throw new ValidationError(`Invalid related project ID: related project with id "${pId}" does not exist.`);
        }
      }
    }

    const merged = {
      ...services[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
      revision: (services[index].revision || 1) + 1,
    };

    const parsed = AIServiceSchema.safeParse(merged);
    if (!parsed.success) {
      throw new ValidationError(`Invalid AI service data: ${parsed.error.message}`);
    }

    services[index] = parsed.data;
    const saveResult = await this.store.saveAIServices(services, expectedEtag ?? existingObj?.etag);
    return { service: parsed.data, etag: saveResult.etag };
  }

  async deleteAIService(id: string, expectedEtag?: string): Promise<{ success: boolean; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getAIServices();
    const services = existingObj ? [...existingObj.data] : [];

    const index = services.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new NotFoundError(`AI service with id "${id}" not found.`);
    }

    services.splice(index, 1);
    const saveResult = await this.store.saveAIServices(services, expectedEtag ?? existingObj?.etag);
    return { success: true, etag: saveResult.etag };
  }

  async reorderAIServices(
    orderedIds: string[],
    expectedEtag?: string
  ): Promise<{ services: AIService[]; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getAIServices();
    const services = existingObj ? [...existingObj.data] : [];

    const updatedServices = services.map((s) => {
      const newOrder = orderedIds.indexOf(s.id);
      return newOrder !== -1 ? { ...s, order: newOrder + 1 } : s;
    });

    updatedServices.sort((a, b) => a.order - b.order);
    const saveResult = await this.store.saveAIServices(updatedServices, expectedEtag ?? existingObj?.etag);
    return { services: updatedServices, etag: saveResult.etag };
  }

  async toggleFeaturedAIService(
    id: string,
    expectedEtag?: string
  ): Promise<{ service: AIService; etag: string }> {
    const existingObj = await this.store.getAIServices();
    const service = existingObj?.data.find((s) => s.id === id);
    if (!service) {
      throw new NotFoundError(`AI service with id "${id}" not found.`);
    }
    return this.updateAIService(id, { featured: !service.featured }, expectedEtag);
  }

  async publishAIService(
    id: string,
    published: boolean,
    expectedEtag?: string
  ): Promise<{ service: AIService; etag: string }> {
    return this.updateAIService(id, { published }, expectedEtag);
  }

  // ==========================================
  // AI SERVICE CATEGORIES MUTATIONS
  // ==========================================

  async createAIServiceCategory(
    categoryData: Partial<AIServiceCategory> & { name: string; slug?: string },
    expectedEtag?: string
  ): Promise<{ category: AIServiceCategory; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getAIServiceCategories();
    const categories = existingObj ? [...existingObj.data] : [];

    const name = categoryData.name.trim();
    if (!name || name.length < 2) {
      throw new ValidationError('Category name must be at least 2 characters.');
    }

    const slug = (
      categoryData.slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
    );

    if (categories.some((c) => c.slug.toLowerCase() === slug.toLowerCase())) {
      throw new ValidationError(`Category with slug "${slug}" already exists.`);
    }

    const now = new Date().toISOString();
    const newCategory: AIServiceCategory = {
      id: categoryData.id || crypto.randomUUID(),
      name,
      slug,
      description: categoryData.description?.trim() || undefined,
      icon: categoryData.icon || 'Bot',
      order: categoryData.order ?? categories.length + 1,
      published: categoryData.published ?? true,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };

    const parsed = AIServiceCategorySchema.safeParse(newCategory);
    if (!parsed.success) {
      throw new ValidationError(`Invalid category: ${parsed.error.message}`);
    }

    categories.push(parsed.data);
    const saveResult = await this.store.saveAIServiceCategories(categories, expectedEtag ?? existingObj?.etag);
    return { category: parsed.data, etag: saveResult.etag };
  }

  async updateAIServiceCategory(
    id: string,
    updates: Partial<AIServiceCategory>,
    expectedEtag?: string
  ): Promise<{ category: AIServiceCategory; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getAIServiceCategories();
    const categories = existingObj ? [...existingObj.data] : [];

    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new NotFoundError(`AI service category with id "${id}" not found.`);
    }

    if (updates.slug) {
      const slug = updates.slug.trim().toLowerCase();
      if (categories.some((c) => c.id !== id && c.slug.toLowerCase() === slug)) {
        throw new ValidationError(`Category with slug "${slug}" already exists.`);
      }
    }

    const merged: AIServiceCategory = {
      ...categories[index],
      ...updates,
      id,
      name: updates.name ? updates.name.trim() : categories[index].name,
      updatedAt: new Date().toISOString(),
      revision: (categories[index].revision || 1) + 1,
    };

    const parsed = AIServiceCategorySchema.safeParse(merged);
    if (!parsed.success) {
      throw new ValidationError(`Invalid category: ${parsed.error.message}`);
    }

    categories[index] = parsed.data;
    const saveResult = await this.store.saveAIServiceCategories(categories, expectedEtag ?? existingObj?.etag);
    return { category: parsed.data, etag: saveResult.etag };
  }

  async deleteAIServiceCategory(id: string, expectedEtag?: string): Promise<{ success: boolean; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getAIServiceCategories();
    const categories = existingObj ? [...existingObj.data] : [];

    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new NotFoundError(`AI service category with id "${id}" not found.`);
    }

    // Safe deletion rule: Block category deletion if it contains active services
    const servicesObj = await this.store.getAIServices();
    const services = servicesObj?.data || [];
    const associatedServices = services.filter((s) => s.categoryId === id);
    if (associatedServices.length > 0) {
      throw new ValidationError(
        `Cannot delete category: active AI services are assigned to it ("${categories[index].name}" has ${associatedServices.length} active service(s)). Please reassign or delete these services first.`
      );
    }

    categories.splice(index, 1);
    const saveResult = await this.store.saveAIServiceCategories(categories, expectedEtag ?? existingObj?.etag);
    return { success: true, etag: saveResult.etag };
  }

  async reorderAIServiceCategories(
    orderedIds: string[],
    expectedEtag?: string
  ): Promise<{ categories: AIServiceCategory[]; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getAIServiceCategories();
    const categories = existingObj ? [...existingObj.data] : [];

    const updatedCategories = categories.map((c) => {
      const newOrder = orderedIds.indexOf(c.id);
      return newOrder !== -1 ? { ...c, order: newOrder + 1 } : c;
    });

    updatedCategories.sort((a, b) => a.order - b.order);
    const saveResult = await this.store.saveAIServiceCategories(updatedCategories, expectedEtag ?? existingObj?.etag);
    return { categories: updatedCategories, etag: saveResult.etag };
  }

  // ==========================================
  // WORK EXPERIENCE MUTATIONS
  // ==========================================

  private isDateChronologicallyEarlier(candidateEarlier: string, candidateLater: string): boolean {
    const parse = (d: string): number | null => {
      if (!d) return null;
      const trimmed = d.trim();
      if (/^\d{4}-\d{2}$/.test(trimmed)) {
        return new Date(`${trimmed}-01`).getTime();
      }
      const parsed = Date.parse(trimmed);
      return isNaN(parsed) ? null : parsed;
    };

    const t1 = parse(candidateEarlier);
    const t2 = parse(candidateLater);
    if (t1 !== null && t2 !== null) {
      return t1 < t2;
    }
    return candidateEarlier < candidateLater;
  }

  async createExperience(
    data: Partial<WorkExperience> & { role: string; company: string; startDate: string },
    expectedEtag?: string
  ): Promise<{ experience: WorkExperience; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getExperience();
    const experiences = existingObj ? [...existingObj.data] : [];

    const isCurrent = data.isCurrent ?? false;
    const startDate = data.startDate.trim();
    const endDate = isCurrent ? null : (data.endDate ? data.endDate.trim() : null);

    if (!isCurrent && endDate && startDate && this.isDateChronologicallyEarlier(endDate, startDate)) {
      throw new ValidationError('End date cannot be earlier than start date.');
    }

    const now = new Date().toISOString();
    const newExp: WorkExperience = {
      id: data.id || crypto.randomUUID(),
      role: data.role.trim(),
      company: data.company.trim(),
      companyUrl: data.companyUrl ?? null,
      employmentType: data.employmentType?.trim() || undefined,
      location: data.location?.trim() || undefined,
      startDate,
      endDate,
      isCurrent,
      summary: data.summary?.trim() || undefined,
      responsibilities: data.responsibilities ?? [],
      achievements: data.achievements ?? [],
      techStack: data.techStack ?? [],
      order: data.order ?? experiences.length + 1,
      published: data.published ?? true,
      createdAt: data.createdAt || now,
      updatedAt: now,
      revision: 1,
    };

    const parsed = WorkExperienceSchema.safeParse(newExp);
    if (!parsed.success) {
      throw new ValidationError(`Invalid experience data: ${parsed.error.message}`);
    }

    experiences.push(parsed.data);
    const saveResult = await this.store.saveExperience(experiences, expectedEtag ?? existingObj?.etag);
    return { experience: parsed.data, etag: saveResult.etag };
  }

  async updateExperience(
    id: string,
    updates: Partial<WorkExperience>,
    expectedEtag?: string
  ): Promise<{ experience: WorkExperience; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getExperience();
    const experiences = existingObj ? [...existingObj.data] : [];

    const index = experiences.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new NotFoundError(`Experience with id "${id}" not found.`);
    }

    const isCurrent = updates.isCurrent !== undefined ? updates.isCurrent : experiences[index].isCurrent;
    const startDate = updates.startDate ? updates.startDate.trim() : experiences[index].startDate;
    const endDate = isCurrent
      ? null
      : updates.endDate !== undefined
      ? (updates.endDate ? updates.endDate.trim() : null)
      : experiences[index].endDate;

    if (!isCurrent && endDate && startDate && this.isDateChronologicallyEarlier(endDate, startDate)) {
      throw new ValidationError('End date cannot be earlier than start date.');
    }

    const merged: WorkExperience = {
      ...experiences[index],
      ...updates,
      id,
      startDate,
      endDate,
      isCurrent,
      updatedAt: new Date().toISOString(),
      revision: (experiences[index].revision || 1) + 1,
    };

    const parsed = WorkExperienceSchema.safeParse(merged);
    if (!parsed.success) {
      throw new ValidationError(`Invalid experience data: ${parsed.error.message}`);
    }

    experiences[index] = parsed.data;
    const saveResult = await this.store.saveExperience(experiences, expectedEtag ?? existingObj?.etag);
    return { experience: parsed.data, etag: saveResult.etag };
  }

  async deleteExperience(id: string, expectedEtag?: string): Promise<{ success: boolean; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getExperience();
    const experiences = existingObj ? [...existingObj.data] : [];

    const index = experiences.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new NotFoundError(`Experience with id "${id}" not found.`);
    }

    experiences.splice(index, 1);
    const saveResult = await this.store.saveExperience(experiences, expectedEtag ?? existingObj?.etag);
    return { success: true, etag: saveResult.etag };
  }

  async reorderExperience(
    orderedIds: string[],
    expectedEtag?: string
  ): Promise<{ experiences: WorkExperience[]; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getExperience();
    const experiences = existingObj ? [...existingObj.data] : [];

    const updated = experiences.map((exp) => {
      const newOrder = orderedIds.indexOf(exp.id);
      return newOrder !== -1 ? { ...exp, order: newOrder + 1 } : exp;
    });

    updated.sort((a, b) => a.order - b.order);
    const saveResult = await this.store.saveExperience(updated, expectedEtag ?? existingObj?.etag);
    return { experiences: updated, etag: saveResult.etag };
  }

  // ==========================================
  // CERTIFICATIONS MUTATIONS
  // ==========================================

  async createCertification(
    data: Partial<Certification> & { title: string; issuer: string },
    expectedEtag?: string
  ): Promise<{ certification: Certification; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getCertifications();
    const certifications = existingObj ? [...existingObj.data] : [];

    const now = new Date().toISOString();
    const newCert: Certification = {
      id: data.id || crypto.randomUUID(),
      title: data.title.trim(),
      issuer: data.issuer.trim(),
      issueDate: data.issueDate ? data.issueDate.trim() : null,
      expiryDate: data.expiryDate ? data.expiryDate.trim() : null,
      credentialId: data.credentialId?.trim() || undefined,
      credentialUrl: data.credentialUrl ? data.credentialUrl.trim() : null,
      badgeImage: data.badgeImage ?? null,
      description: data.description?.trim() || undefined,
      verificationStatus: data.verificationStatus || 'NOT PROVIDED',
      order: data.order ?? certifications.length + 1,
      published: data.published ?? true,
      createdAt: data.createdAt || now,
      updatedAt: now,
      revision: 1,
    };

    const parsed = CertificationSchema.safeParse(newCert);
    if (!parsed.success) {
      throw new ValidationError(`Invalid certification data: ${parsed.error.message}`);
    }

    certifications.push(parsed.data);
    const saveResult = await this.store.saveCertifications(certifications, expectedEtag ?? existingObj?.etag);
    return { certification: parsed.data, etag: saveResult.etag };
  }

  async updateCertification(
    id: string,
    updates: Partial<Certification>,
    expectedEtag?: string
  ): Promise<{ certification: Certification; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getCertifications();
    const certifications = existingObj ? [...existingObj.data] : [];

    const index = certifications.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new NotFoundError(`Certification with id "${id}" not found.`);
    }

    const merged: Certification = {
      ...certifications[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
      revision: (certifications[index].revision || 1) + 1,
    };

    const parsed = CertificationSchema.safeParse(merged);
    if (!parsed.success) {
      throw new ValidationError(`Invalid certification data: ${parsed.error.message}`);
    }

    certifications[index] = parsed.data;
    const saveResult = await this.store.saveCertifications(certifications, expectedEtag ?? existingObj?.etag);
    return { certification: parsed.data, etag: saveResult.etag };
  }

  async deleteCertification(id: string, expectedEtag?: string): Promise<{ success: boolean; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getCertifications();
    const certifications = existingObj ? [...existingObj.data] : [];

    const index = certifications.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new NotFoundError(`Certification with id "${id}" not found.`);
    }

    certifications.splice(index, 1);
    const saveResult = await this.store.saveCertifications(certifications, expectedEtag ?? existingObj?.etag);
    return { success: true, etag: saveResult.etag };
  }

  async reorderCertifications(
    orderedIds: string[],
    expectedEtag?: string
  ): Promise<{ certifications: Certification[]; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getCertifications();
    const certifications = existingObj ? [...existingObj.data] : [];

    const updated = certifications.map((cert) => {
      const newOrder = orderedIds.indexOf(cert.id);
      return newOrder !== -1 ? { ...cert, order: newOrder + 1 } : cert;
    });

    updated.sort((a, b) => a.order - b.order);
    const saveResult = await this.store.saveCertifications(updated, expectedEtag ?? existingObj?.etag);
    return { certifications: updated, etag: saveResult.etag };
  }

  // ==========================================
  // EDUCATION MUTATIONS
  // ==========================================

  async createEducation(
    data: Partial<Education> & { degree: string; institution: string; fieldOfStudy: string },
    expectedEtag?: string
  ): Promise<{ education: Education; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getEducation();
    const educations = existingObj ? [...existingObj.data] : [];

    if (data.startDate && data.endDate && this.isDateChronologicallyEarlier(data.endDate, data.startDate)) {
      throw new ValidationError('End date cannot be earlier than start date.');
    }

    const now = new Date().toISOString();
    const newEdu: Education = {
      id: data.id || crypto.randomUUID(),
      degree: data.degree.trim(),
      institution: data.institution.trim(),
      fieldOfStudy: data.fieldOfStudy.trim(),
      startDate: data.startDate?.trim() || undefined,
      endDate: data.endDate ? data.endDate.trim() : null,
      startYear: data.startYear,
      endYear: data.endYear,
      description: data.description?.trim() || undefined,
      grade: data.grade?.trim() || undefined,
      order: data.order ?? educations.length + 1,
      published: data.published ?? true,
      createdAt: data.createdAt || now,
      updatedAt: now,
      revision: 1,
    };

    const parsed = EducationSchema.safeParse(newEdu);
    if (!parsed.success) {
      throw new ValidationError(`Invalid education data: ${parsed.error.message}`);
    }

    educations.push(parsed.data);
    const saveResult = await this.store.saveEducation(educations, expectedEtag ?? existingObj?.etag);
    return { education: parsed.data, etag: saveResult.etag };
  }

  async updateEducation(
    id: string,
    updates: Partial<Education>,
    expectedEtag?: string
  ): Promise<{ education: Education; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getEducation();
    const educations = existingObj ? [...existingObj.data] : [];

    const index = educations.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new NotFoundError(`Education with id "${id}" not found.`);
    }

    const startDate = updates.startDate ?? educations[index].startDate;
    const endDate = updates.endDate !== undefined ? updates.endDate : educations[index].endDate;
    if (startDate && endDate && this.isDateChronologicallyEarlier(endDate, startDate)) {
      throw new ValidationError('End date cannot be earlier than start date.');
    }

    const merged: Education = {
      ...educations[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
      revision: (educations[index].revision || 1) + 1,
    };

    const parsed = EducationSchema.safeParse(merged);
    if (!parsed.success) {
      throw new ValidationError(`Invalid education data: ${parsed.error.message}`);
    }

    educations[index] = parsed.data;
    const saveResult = await this.store.saveEducation(educations, expectedEtag ?? existingObj?.etag);
    return { education: parsed.data, etag: saveResult.etag };
  }

  async deleteEducation(id: string, expectedEtag?: string): Promise<{ success: boolean; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getEducation();
    const educations = existingObj ? [...existingObj.data] : [];

    const index = educations.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new NotFoundError(`Education with id "${id}" not found.`);
    }

    educations.splice(index, 1);
    const saveResult = await this.store.saveEducation(educations, expectedEtag ?? existingObj?.etag);
    return { success: true, etag: saveResult.etag };
  }

  async reorderEducation(
    orderedIds: string[],
    expectedEtag?: string
  ): Promise<{ educations: Education[]; etag: string }> {
    await this.store.ensureInitialized();
    const existingObj = await this.store.getEducation();
    const educations = existingObj ? [...existingObj.data] : [];

    const updated = educations.map((edu) => {
      const newOrder = orderedIds.indexOf(edu.id);
      return newOrder !== -1 ? { ...edu, order: newOrder + 1 } : edu;
    });

    updated.sort((a, b) => a.order - b.order);
    const saveResult = await this.store.saveEducation(updated, expectedEtag ?? existingObj?.etag);
    return { educations: updated, etag: saveResult.etag };
  }

  // ==========================================
  // PROFILE, SETTINGS & RESUME MUTATIONS
  // ==========================================

  async updateProfile(profileData: Profile, expectedEtag?: string): Promise<{ profile: Profile; etag: string }> {
    await this.store.ensureInitialized();
    const saveResult = await this.store.saveProfile(profileData, expectedEtag);
    return { profile: saveResult.data, etag: saveResult.etag };
  }

  async updateSettings(settingsData: SiteSettings, expectedEtag?: string): Promise<{ settings: SiteSettings; etag: string }> {
    await this.store.ensureInitialized();
    const saveResult = await this.store.saveSettings(settingsData, expectedEtag);
    return { settings: saveResult.data, etag: saveResult.etag };
  }

  async updateResume(resumeData: Resume, expectedEtag?: string): Promise<{ resume: Resume; etag: string }> {
    await this.store.ensureInitialized();
    const saveResult = await this.store.saveResume(resumeData, expectedEtag);
    return { resume: saveResult.data, etag: saveResult.etag };
  }

  async updateProfileAvatar(
    avatarAsset: MediaAsset | null,
    expectedEtag?: string
  ): Promise<{ profile: Profile; etag: string }> {
    await this.store.ensureInitialized();
    const profileObj = await this.store.getProfile();
    if (!profileObj) {
      throw new NotFoundError('Profile not found.');
    }

    const updatedProfile: Profile = {
      ...profileObj.data,
      avatar: avatarAsset,
    };

    const saveResult = await this.store.saveProfile(updatedProfile, expectedEtag ?? profileObj.etag);
    return { profile: saveResult.data, etag: saveResult.etag };
  }

  async publishResume(
    published: boolean,
    expectedEtag?: string
  ): Promise<{ resume: Resume; etag: string }> {
    await this.store.ensureInitialized();
    const resumeObj = await this.store.getResume();
    if (!resumeObj) {
      throw new NotFoundError('Resume data not found.');
    }

    const updatedResume: Resume = {
      ...resumeObj.data,
      published,
    };

    const saveResult = await this.store.saveResume(updatedResume, expectedEtag ?? resumeObj.etag);
    return { resume: saveResult.data, etag: saveResult.etag };
  }

  async deleteResume(
    expectedEtag?: string
  ): Promise<{ resume: Resume; etag: string }> {
    await this.store.ensureInitialized();
    const resumeObj = await this.store.getResume();
    if (!resumeObj) {
      throw new NotFoundError('Resume data not found.');
    }

    const updatedResume: Resume = {
      ...resumeObj.data,
      activeResume: null,
      published: false,
      fileSizeBytes: 0,
    };

    const saveResult = await this.store.saveResume(updatedResume, expectedEtag ?? resumeObj.etag);
    return { resume: saveResult.data, etag: saveResult.etag };
  }
}
