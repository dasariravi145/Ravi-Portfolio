import { ContentStore } from '../storage/contentStore';
import { Project, AIService } from '../types/portfolio';

export interface RouteSeoData {
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  robots: string;
}

/**
 * Escapes strings for safe embedding into HTML attributes
 */
export function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Safely serializes JSON-LD data preventing <script> injection attacks
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

/**
 * Generates dynamic route-specific SEO metadata from persistent CMS store
 */
export async function generateRouteSeo(
  pathname: string,
  store: ContentStore,
  origin: string
): Promise<RouteSeoData> {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanPath = pathname.split('?')[0];

  // Block admin routes from search indexing
  if (cleanPath.startsWith('/admin') || cleanPath === '/login') {
    return {
      title: 'Admin Portal | Ravi Dasari Portfolio',
      description: 'Authorized administration console.',
      canonicalUrl: `${cleanOrigin}${cleanPath}`,
      ogTitle: 'Admin Portal',
      ogDescription: 'Authorized administration console.',
      ogImage: `${cleanOrigin}/og-default.png`,
      ogUrl: `${cleanOrigin}${cleanPath}`,
      twitterCard: 'summary',
      twitterTitle: 'Admin Portal',
      twitterDescription: 'Authorized administration console.',
      robots: 'noindex, nofollow',
    };
  }

  await store.ensureInitialized();
  const [profileObj, settingsObj] = await Promise.all([
    store.getProfile(),
    store.getSettings(),
  ]);

  const profile = profileObj?.data;
  const settings = settingsObj?.data;

  const defaultTitle = settings?.siteTitle || 'Ravi Dasari — DevOps Engineer';
  const defaultDesc =
    settings?.metaDescription ||
    profile?.bioShort ||
    'Portfolio of Ravi Dasari, DevOps Engineer with 6.6 years of IT experience across AWS cloud infrastructure, Terraform, Docker, Kubernetes, CI/CD pipelines, and Java backend development.';
  const defaultImage = `${cleanOrigin}/og-default.png`;

  // 1. Project Case Study Page: /projects/:slug
  const projectMatch = cleanPath.match(/^\/projects\/([a-z0-9-]+)$/i);
  if (projectMatch) {
    const slug = projectMatch[1];
    const projectsObj = await store.getProjects();
    const project = (projectsObj?.data || []).find((p: Project) => p.slug === slug);

    if (project && project.published) {
      const title = project.seo?.metaTitle || `${project.title} — Case Study | Ravi Dasari`;
      const description = project.seo?.metaDescription || project.summary;
      const canonicalUrl = `${cleanOrigin}/projects/${project.slug}`;
      const ogImage =
        project.coverImage?.url ||
        project.architectureDiagram?.url ||
        (project.architectureDiagrams?.[0]?.image?.url) ||
        defaultImage;

      return {
        title,
        description,
        canonicalUrl,
        ogTitle: title,
        ogDescription: description,
        ogImage: ogImage.startsWith('http') ? ogImage : `${cleanOrigin}${ogImage}`,
        ogUrl: canonicalUrl,
        twitterCard: 'summary_large_image',
        twitterTitle: title,
        twitterDescription: description,
        robots: 'index, follow',
      };
    } else {
      // Draft or non-existent project
      return {
        title: 'Project Case Study | Ravi Dasari',
        description: 'Project details and technical architecture.',
        canonicalUrl: `${cleanOrigin}${cleanPath}`,
        ogTitle: 'Project Case Study',
        ogDescription: 'Project details and technical architecture.',
        ogImage: defaultImage,
        ogUrl: `${cleanOrigin}${cleanPath}`,
        twitterCard: 'summary',
        twitterTitle: 'Project Case Study',
        twitterDescription: 'Project details and technical architecture.',
        robots: 'noindex, nofollow',
      };
    }
  }

  // 2. Full Projects Catalog Page: /projects
  if (cleanPath === '/projects') {
    const title = 'Engineering Projects & Technical Architecture | Ravi Dasari';
    const description =
      'Production DevSecOps pipelines, Android applications, and interactive modern platforms engineered by Ravi Dasari.';
    const canonicalUrl = `${cleanOrigin}/projects`;

    return {
      title,
      description,
      canonicalUrl,
      ogTitle: title,
      ogDescription: description,
      ogImage: defaultImage,
      ogUrl: canonicalUrl,
      twitterCard: 'summary_large_image',
      twitterTitle: title,
      twitterDescription: description,
      robots: 'index, follow',
    };
  }

  // 3. AI Service Detail Page: /ai-solutions/:slug
  const aiMatch = cleanPath.match(/^\/ai-solutions\/([a-z0-9-]+)$/i);
  if (aiMatch) {
    const slug = aiMatch[1];
    const aiObj = await store.getAIServices();
    const service = (aiObj?.data || []).find((s: AIService) => s.slug === slug);

    if (service && service.published) {
      const title = `${service.title} — Autonomous AI Solution | Ravi Dasari`;
      const description = service.shortDescription || service.description;
      const canonicalUrl = `${cleanOrigin}/ai-solutions/${service.slug}`;
      const ogImage = service.coverImage?.url || defaultImage;

      return {
        title,
        description,
        canonicalUrl,
        ogTitle: title,
        ogDescription: description,
        ogImage: ogImage.startsWith('http') ? ogImage : `${cleanOrigin}${ogImage}`,
        ogUrl: canonicalUrl,
        twitterCard: 'summary_large_image',
        twitterTitle: title,
        twitterDescription: description,
        robots: 'index, follow',
      };
    } else {
      return {
        title: 'AI Solutions | Ravi Dasari',
        description: 'Autonomous AI agents and automation solutions.',
        canonicalUrl: `${cleanOrigin}${cleanPath}`,
        ogTitle: 'AI Solutions',
        ogDescription: 'Autonomous AI agents and automation solutions.',
        ogImage: defaultImage,
        ogUrl: `${cleanOrigin}${cleanPath}`,
        twitterCard: 'summary',
        twitterTitle: 'AI Solutions',
        twitterDescription: 'Autonomous AI agents and automation solutions.',
        robots: 'noindex, nofollow',
      };
    }
  }

  // 4. Default Homepage: /
  const canonicalUrl = `${cleanOrigin}/`;
  return {
    title: defaultTitle,
    description: defaultDesc,
    canonicalUrl,
    ogTitle: defaultTitle,
    ogDescription: defaultDesc,
    ogImage: defaultImage,
    ogUrl: canonicalUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: defaultTitle,
    twitterDescription: defaultDesc,
    robots: 'index, follow',
  };
}

/**
 * Generates Schema.org JSON-LD Structured Data for the given route
 */
export async function generateJsonLd(
  pathname: string,
  store: ContentStore,
  origin: string
): Promise<Record<string, unknown> | null> {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanPath = pathname.split('?')[0];

  if (cleanPath.startsWith('/admin') || cleanPath === '/login') {
    return null;
  }

  await store.ensureInitialized();

  // Project Detail JSON-LD
  const projectMatch = cleanPath.match(/^\/projects\/([a-z0-9-]+)$/i);
  if (projectMatch) {
    const slug = projectMatch[1];
    const projectsObj = await store.getProjects();
    const project = (projectsObj?.data || []).find((p: Project) => p.slug === slug);

    if (project && project.published) {
      return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: project.title,
        description: project.summary,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Cloud / Linux / Android',
        author: {
          '@type': 'Person',
          name: 'Ravi Dasari',
          url: `${cleanOrigin}/`,
        },
        url: `${cleanOrigin}/projects/${project.slug}`,
        keywords: (project.techStack || []).join(', '),
      };
    }
  }

  // AI Service Detail JSON-LD
  const aiMatch = cleanPath.match(/^\/ai-solutions\/([a-z0-9-]+)$/i);
  if (aiMatch) {
    const slug = aiMatch[1];
    const aiObj = await store.getAIServices();
    const service = (aiObj?.data || []).find((s: AIService) => s.slug === slug);

    if (service && service.published) {
      return {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: service.title,
        description: service.shortDescription || service.description,
        creator: {
          '@type': 'Person',
          name: 'Ravi Dasari',
          url: `${cleanOrigin}/`,
        },
        url: `${cleanOrigin}/ai-solutions/${service.slug}`,
        keywords: (service.tooling || []).join(', '),
      };
    }
  }

  // Homepage / Site-level Person & WebSite JSON-LD
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${cleanOrigin}/#person`,
        name: 'Ravi Dasari',
        jobTitle: 'DevOps Engineer',
        url: `${cleanOrigin}/`,
        sameAs: [
          'https://github.com/dasariravi145',
          'https://linkedin.com/in/ravid145',
        ],
        knowsAbout: [
          'AWS cloud infrastructure',
          'Terraform Infrastructure as Code',
          'Docker and Kubernetes',
          'CI/CD pipelines',
          'Linux administration',
          'Shell scripting',
          'Java backend development',
          'Spring Boot and REST APIs',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${cleanOrigin}/#website`,
        url: `${cleanOrigin}/`,
        name: 'Ravi Dasari Portfolio',
        publisher: { '@id': `${cleanOrigin}/#person` },
      },
    ],
  };
}

/**
 * Injects dynamic SEO tags and JSON-LD directly into HTML string
 */
export function injectSeoMetadata(
  html: string,
  seo: RouteSeoData,
  jsonLd?: Record<string, unknown> | null
): string {
  const safeTitle = escapeHtmlAttr(seo.title);
  const safeDesc = escapeHtmlAttr(seo.description);
  const safeCanonical = escapeHtmlAttr(seo.canonicalUrl);
  const safeOgTitle = escapeHtmlAttr(seo.ogTitle);
  const safeOgDesc = escapeHtmlAttr(seo.ogDescription);
  const safeOgImage = escapeHtmlAttr(seo.ogImage);
  const safeOgUrl = escapeHtmlAttr(seo.ogUrl);
  const safeTwTitle = escapeHtmlAttr(seo.twitterTitle);
  const safeTwDesc = escapeHtmlAttr(seo.twitterDescription);
  const safeRobots = escapeHtmlAttr(seo.robots);

  const metaBlock = `
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <link rel="canonical" href="${safeCanonical}" />
    <meta name="robots" content="${safeRobots}" />

    <!-- Open Graph Metadata -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${safeOgTitle}" />
    <meta property="og:description" content="${safeOgDesc}" />
    <meta property="og:url" content="${safeOgUrl}" />
    <meta property="og:image" content="${safeOgImage}" />

    <!-- Twitter / X Card Metadata -->
    <meta name="twitter:card" content="${seo.twitterCard}" />
    <meta name="twitter:title" content="${safeTwTitle}" />
    <meta name="twitter:description" content="${safeTwDesc}" />
    <meta name="twitter:image" content="${safeOgImage}" />
  `;

  const jsonLdBlock = jsonLd
    ? `\n    <script type="application/ld+json">${serializeJsonLd(jsonLd)}</script>`
    : '';

  // Replace existing <title>, <meta>, og, and twitter tags or insert before </head>
  let modified = html;
  modified = modified.replace(/<title>[\s\S]*?<\/title>/gi, '');
  modified = modified.replace(/<meta\s+name="description"[\s\S]*?>/gi, '');
  modified = modified.replace(/<link\s+rel="canonical"[\s\S]*?>/gi, '');
  modified = modified.replace(/<meta\s+name="robots"[\s\S]*?>/gi, '');
  modified = modified.replace(/<meta\s+property="og:[^"]*"[\s\S]*?>/gi, '');
  modified = modified.replace(/<meta\s+name="twitter:[^"]*"[\s\S]*?>/gi, '');
  if (jsonLd) {
    modified = modified.replace(/<script\s+type="application\/ld\+json"[\s\S]*?<\/script>/gi, '');
  }

  if (modified.includes('</head>')) {
    return modified.replace('</head>', `${metaBlock}${jsonLdBlock}\n  </head>`);
  }

  return `${metaBlock}${jsonLdBlock}\n${modified}`;
}

/**
 * Generates dynamic XML sitemap strictly reflecting CMS publication states
 */
export async function generateSitemapXml(
  store: ContentStore,
  origin: string
): Promise<string> {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const now = new Date().toISOString().split('T')[0];

  await store.ensureInitialized();
  const [projectsObj, aiObj] = await Promise.all([
    store.getProjects(),
    store.getAIServices(),
  ]);

  const publishedProjects = (projectsObj?.data || []).filter((p: Project) => p.published === true);
  const publishedAIServices = (aiObj?.data || []).filter((s: AIService) => s.published === true);

  const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [
    {
      loc: `${cleanOrigin}/`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '1.0',
    },
    {
      loc: `${cleanOrigin}/projects`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.9',
    },
    {
      loc: `${cleanOrigin}/ai-solutions`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.8',
    },
  ];

  // Add all published projects (strictly excluding drafts!)
  for (const proj of publishedProjects) {
    const lastmod = proj.updatedAt?.split('T')[0] || proj.createdAt?.split('T')[0] || now;
    urls.push({
      loc: `${cleanOrigin}/projects/${proj.slug}`,
      lastmod,
      changefreq: 'monthly',
      priority: '0.8',
    });
  }

  // Add all published AI services (strictly excluding drafts!)
  for (const s of publishedAIServices) {
    const lastmod = s.updatedAt?.split('T')[0] || now;
    urls.push({
      loc: `${cleanOrigin}/ai-solutions/${s.slug}`,
      lastmod,
      changefreq: 'monthly',
      priority: '0.7',
    });
  }

  const xmlEntries = urls
    .map(
      (u) => `  <url>
    <loc>${escapeHtmlAttr(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;
}

/**
 * Generates compliant robots.txt with disallow directives for admin routes and sitemap link
 */
export function generateRobotsTxt(origin: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  return `# Robots.txt for Ravi Dasari Portfolio
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/admin/
Disallow: /login

Sitemap: ${cleanOrigin}/sitemap.xml
`;
}
