import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const EVIDENCE_DIR = path.resolve('test-evidence', 'pre-deployment');

test.describe('Final Pre-Deployment Homepage Verification (1280x720 DPR 1.5)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('Verify homepage with actual uploaded profile photo at 1280x720 DPR 1.5', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1.5,
    });
    const page = await context.newPage();

    // Navigate to local production-style Worker
    await page.goto('http://127.0.0.1:8787/', { waitUntil: 'networkidle' });

    // Ensure the real profile photo has fully decoded and loaded
    await page.waitForFunction(() => {
      const img = document.querySelector('section#hero img') as HTMLImageElement;
      return img && img.complete && img.naturalWidth > 0;
    }, { timeout: 10000 });

    // Wait a brief tick for fonts & smooth layout rendering
    await page.waitForTimeout(500);

    // Capture above-the-fold viewport screenshot
    const viewportScreenshotPath = path.join(EVIDENCE_DIR, 'homepage-viewport-1280x720-dpr1.5.png');
    await page.screenshot({
      path: viewportScreenshotPath,
      fullPage: false,
    });

    // Capture hero section screenshot
    const heroSection = page.locator('section#hero');
    const heroScreenshotPath = path.join(EVIDENCE_DIR, 'hero-section-1280x720-dpr1.5.png');
    await heroSection.screenshot({
      path: heroScreenshotPath,
    });

    // Capture full-page screenshot
    const fullpageScreenshotPath = path.join(EVIDENCE_DIR, 'homepage-fullpage-1280x720-dpr1.5.png');
    await page.screenshot({
      path: fullpageScreenshotPath,
      fullPage: true,
    });

    // Extract exact computed layout metrics and styling
    const auditData = await page.evaluate(() => {
      // Header / Navigation
      const header = document.querySelector('header');
      const navLinks = Array.from(header?.querySelectorAll('nav a') || []).map(a => ({
        text: a.textContent?.trim(),
        href: a.getAttribute('href'),
      }));
      const navCta = header?.querySelector('a[href*="contact"], button')?.textContent?.trim();

      // Hero Elements
      const hero = document.querySelector('section#hero');
      const eyebrow = hero?.querySelector('.rounded-full');
      const h1 = hero?.querySelector('h1');
      const desc = hero?.querySelector('p');
      const expCards = Array.from(hero?.querySelectorAll('.rounded-xl.bg-white\\/95') || []).map(card => {
        const title = card.querySelector('span.text-sm')?.textContent?.trim();
        const subtitle = card.querySelector('span.text-xs')?.textContent?.trim();
        return `${title} - ${subtitle}`;
      });
      const primaryCta = hero?.querySelector('a[href="#projects"]');
      const secondaryCta = hero?.querySelector('a[href="#contact"]');
      const resumeCta = hero?.querySelector('a[download], a[title*="Resume"], a[href*="resume"]');
      const socialLinks = Array.from(hero?.querySelectorAll('a[aria-label*="Profile"], a[aria-label*="email"]') || []).map(a => ({
        label: a.getAttribute('aria-label'),
        href: a.getAttribute('href'),
      }));

      // Photo Card Elements
      const cardContainer = hero?.querySelector('.shadow-floating')?.parentElement;
      const innerMat = hero?.querySelector('.rounded-xl.bg-slate-50\\/90');
      const img = hero?.querySelector('img') as HTMLImageElement;
      const floatingPills = Array.from(hero?.querySelectorAll('.shadow-card') || []).map(p => p.textContent?.trim());

      // Metrics Bar
      const metricBoxes = Array.from(hero?.querySelectorAll('.grid-cols-2.md\\:grid-cols-4 > div') || []).map(box => ({
        metric: box.querySelector('span.text-sm')?.textContent?.trim(),
        label: box.querySelector('span.text-xs')?.textContent?.trim(),
      }));

      // Bounding Rects & Computed Styles
      const h1Rect = h1?.getBoundingClientRect();
      const h1Style = h1 ? window.getComputedStyle(h1) : null;
      const cardRect = cardContainer?.getBoundingClientRect();
      const imgRect = img?.getBoundingClientRect();
      const imgStyle = img ? window.getComputedStyle(img) : null;
      const heroRect = hero?.getBoundingClientRect();

      return {
        viewport: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
        },
        header: {
          height: header?.getBoundingClientRect().height,
          navLinksCount: navLinks.length,
          navLinks,
          navCta,
        },
        hero: {
          totalHeight: heroRect?.height,
          eyebrow: eyebrow?.textContent?.trim().replace(/\s+/g, ' '),
          headline: {
            text: h1?.textContent?.trim().replace(/\s+/g, ' '),
            fontSize: h1Style?.fontSize,
            lineHeight: h1Style?.lineHeight,
            fontWeight: h1Style?.fontWeight,
            width: h1Rect?.width,
            height: h1Rect?.height,
          },
          description: {
            text: desc?.textContent?.trim().replace(/\s+/g, ' '),
            fontSize: desc ? window.getComputedStyle(desc).fontSize : null,
            lineHeight: desc ? window.getComputedStyle(desc).lineHeight : null,
          },
          experienceCallouts: expCards,
          ctas: {
            primary: primaryCta?.textContent?.trim(),
            secondary: secondaryCta?.textContent?.trim(),
            resume: resumeCta?.textContent?.trim(),
          },
          socialCount: socialLinks.length,
          socialLinks,
        },
        photoCard: {
          containerWidth: cardRect?.width,
          containerHeight: cardRect?.height,
          innerMatWidth: innerMat?.getBoundingClientRect().width,
          innerMatHeight: innerMat?.getBoundingClientRect().height,
          image: {
            rendered: !!img,
            src: img?.getAttribute('src'),
            naturalWidth: img?.naturalWidth,
            naturalHeight: img?.naturalHeight,
            renderedWidth: imgRect?.width,
            renderedHeight: imgRect?.height,
            objectPosition: imgStyle?.objectPosition,
            objectFit: imgStyle?.objectFit,
          },
          floatingPills,
        },
        bottomMetrics: metricBoxes,
        overflow: {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        },
      };
    });

    console.log('\n=== COMPREHENSIVE PRE-DEPLOYMENT AUDIT DATA ===\n', JSON.stringify(auditData, null, 2));

    // Assertions for visual ready criteria
    expect(auditData.overflow.hasHorizontalOverflow).toBe(false);
    expect(auditData.hero.headline.text).toContain('Building Reliable Cloud Infrastructure');
    expect(auditData.hero.headline.text).toContain('Making Deployments Simpler');
    expect(auditData.hero.headline.height).toBe(80); // Exactly 2 lines at 40px line-height
    expect(auditData.hero.ctas.primary).toBe('Explore My Work');
    expect(auditData.hero.ctas.secondary).toBe('Get in Touch');
    expect(auditData.photoCard.image.rendered).toBe(true);
    expect(auditData.photoCard.image.naturalWidth).toBeGreaterThan(0);
    expect(auditData.photoCard.image.naturalHeight).toBeGreaterThan(0);
    expect(auditData.photoCard.image.objectPosition).toBe('50% 0%');
    expect(auditData.photoCard.image.objectFit).toBe('cover');
    expect(auditData.photoCard.containerWidth).toBe(340);
    expect(auditData.photoCard.containerHeight).toBe(410);

    await context.close();
  });
});

