import { describe, it, expect } from 'vitest';
import { INITIAL_PORTFOLIO_FIXTURE } from '../fixtures/initialContent';
import { PortfolioDataSchema } from '../types/portfolio';

describe('Initial Content Fixtures & Business Invariants', () => {
  it('validates INITIAL_PORTFOLIO_FIXTURE against strict Zod PortfolioDataSchema', () => {
    const parseResult = PortfolioDataSchema.safeParse(INITIAL_PORTFOLIO_FIXTURE);
    expect(parseResult.success).toBe(true);
  });

  it('enforces factual status on Zynpath project (Closed Testing ONLY)', () => {
    const zynpath = INITIAL_PORTFOLIO_FIXTURE.projects.find((p) => p.slug === 'zynpath-puzzle-game');
    expect(zynpath).toBeDefined();
    expect(zynpath?.deploymentStatus).toBe('Google Play Closed Testing ONLY');
    expect(zynpath?.deploymentStatus).not.toContain('Production');
  });

  it('enforces factual status on RoboShop DevSecOps project', () => {
    const roboshop = INITIAL_PORTFOLIO_FIXTURE.projects.find((p) => p.slug === 'roboshop-devsecops');
    expect(roboshop).toBeDefined();
    expect(roboshop?.deploymentStatus).toBe('Production Pipeline Automated');
    expect(roboshop?.techStack).toContain('Kubernetes');
    expect(roboshop?.techStack).toContain('Trivy');
  });

  it('enforces factual status on Mandi Ledger project', () => {
    const mandi = INITIAL_PORTFOLIO_FIXTURE.projects.find((p) => p.slug === 'mandi-ledger-app');
    expect(mandi).toBeDefined();
    expect(mandi?.deploymentStatus).toBe('Published on Google Play Store');
  });

  it('enforces factual status note on NEXORA project', () => {
    const nexora = INITIAL_PORTFOLIO_FIXTURE.projects.find((p) => p.slug === 'nexora-ecommerce');
    expect(nexora).toBeDefined();
    expect(nexora?.deploymentStatus).toBe('Interactive Showcase Demo (Static Frontend Only)');
    expect(nexora?.liveDemoUrl).toBe('https://nexora.dsecops88.online');
  });

  it('contains all 8 required AI automation service categories with valid 4-state statuses', () => {
    const aiServices = INITIAL_PORTFOLIO_FIXTURE.aiServices;
    expect(aiServices).toHaveLength(8);

    const validStatuses = [
      'Verified Live Implementation',
      'Working Prototype',
      'In Active Development',
      'Planned Capability',
    ];

    aiServices.forEach((service) => {
      expect(validStatuses).toContain(service.status);
    });
  });

  it('profile details accurately position Ravi Dasari without fabricated claims', () => {
    const profile = INITIAL_PORTFOLIO_FIXTURE.profile;
    expect(profile.fullName).toBe('Ravi Dasari');
    expect(profile.headline).toBe('DevOps Engineer');
    expect(profile.bioShort).toContain('6.6');
    expect(profile.bioShort).toContain('4 years in DevOps');
    expect(profile.bioShort).toContain('2.6 years in Java');
    expect(['contact@dsecops88.online', 'dasariravid145@gmail.com']).toContain(profile.contactEmail);
    expect(profile.availabilityStatus).toBe('Available for Engineering Roles & Consulting');
  });

  it('contains exactly six factual experience records matching owner-provided resume', () => {
    const experience = INITIAL_PORTFOLIO_FIXTURE.experience;
    expect(experience).toHaveLength(6);

    const companies = experience.map((e) => e.company);
    expect(companies).toEqual([
      'Capgemini',
      'Independent Freelance Consulting',
      'Virtusa',
      'Incedo Inc.',
      'Trigent Software Inc.',
      'Lobo Staffing Solutions',
    ]);

    // Verify all roles are not current (no fabricated present employer)
    experience.forEach((e) => {
      expect(e.isCurrent).toBe(false);
      expect(e.published).toBe(true);
    });

    // Verify Capgemini dates
    expect(experience[0].startDate).toBe('May 2024');
    expect(experience[0].endDate).toBe('February 2026');

    // Verify Freelance dates
    expect(experience[1].startDate).toBe('June 2023');
    expect(experience[1].endDate).toBe('May 2024');

    // Verify Virtusa dates
    expect(experience[2].startDate).toBe('November 2021');
    expect(experience[2].endDate).toBe('May 2023');
  });

  it('contains exactly one verified education record (MCA) matching owner-provided resume', () => {
    const education = INITIAL_PORTFOLIO_FIXTURE.education;
    expect(education).toHaveLength(1);
    expect(education[0].degree).toBe('Master of Computer Applications (MCA)');
    expect(education[0].institution).toBe('Emeralds Advanced Institute of Management Studies');
    expect(education[0].fieldOfStudy).toBe('Computer Science');
    expect(education[0].startYear).toBe(2011);
    expect(education[0].endYear).toBe(2014);
    expect(education[0].published).toBe(true);
  });

  it('enforces that no uncompleted certifications are published publicly', () => {
    const certifications = INITIAL_PORTFOLIO_FIXTURE.certifications;
    const published = certifications.filter((c) => c.published === true);
    expect(published).toHaveLength(0);
  });
});

