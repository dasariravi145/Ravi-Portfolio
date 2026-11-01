import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.resolve('test-evidence', 'redesigned-hero');

test.describe('Verify Redesigned Homepage Hero Typography & Layout', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  const viewports = [
    { name: 'desktop-1280x720-dpr1.5', width: 1280, height: 720, dsf: 1.5 },
    { name: 'desktop-1366x768', width: 1366, height: 768, dsf: 1 },
    { name: 'desktop-1440x900', width: 1440, height: 900, dsf: 1 },
    { name: 'desktop-1920x1080', width: 1920, height: 1080, dsf: 1 },
    { name: 'tablet-1024x768', width: 1024, height: 768, dsf: 1 },
    { name: 'mobile-390x844', width: 390, height: 844, dsf: 1 },
  ];

  for (const vp of viewports) {
    test(`Inspect redesigned hero at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://127.0.0.1:8787/', { waitUntil: 'networkidle' });

      // Save screenshot for owner visual review
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `hero-${vp.name}.png`),
        fullPage: false,
      });

      const metrics = await page.evaluate(() => {
        const eyebrow = document.querySelector('section#hero .rounded-full');
        const h1 = document.querySelector('section#hero h1');
        const desc = document.querySelector('section#hero p');
        const primaryCta = document.querySelector('section#hero a[href="#projects"]');
        const secondaryCta = document.querySelector('section#hero a[href="#contact"]');
        const cardParent = document.querySelector('section#hero .shadow-floating')?.parentElement;
        const img = document.querySelector('section#hero img');

        const h1Style = h1 ? window.getComputedStyle(h1) : null;
        const h1Rect = h1?.getBoundingClientRect();
        const cardRect = cardParent?.getBoundingClientRect();

        return {
          eyebrow: eyebrow?.textContent?.trim().replace(/\s+/g, ' '),
          headline: {
            text: h1?.textContent?.trim().replace(/\s+/g, ' '),
            fontSize: h1Style?.fontSize,
            fontWeight: h1Style?.fontWeight,
            lineHeight: h1Style?.lineHeight,
            width: h1Rect?.width,
            height: h1Rect?.height,
          },
          description: desc?.textContent?.trim().replace(/\s+/g, ' '),
          primaryCtaText: primaryCta?.textContent?.trim(),
          secondaryCtaText: secondaryCta?.textContent?.trim(),
          card: {
            width: cardRect?.width,
            height: cardRect?.height,
          },
          image: {
            rendered: !!img,
            src: img?.getAttribute('src'),
            objectPosition: img ? window.getComputedStyle(img).objectPosition : null,
          },
        };
      });

      console.log(`\n=== REDESIGNED HERO METRICS FOR ${vp.name} ===\n`, JSON.stringify(metrics, null, 2));

      expect(metrics.headline.text).toContain('Building Reliable Cloud Infrastructure');
      expect(metrics.headline.text).toContain('Making Deployments Simpler');
      expect(metrics.primaryCtaText).toBe('Explore My Work');
      expect(metrics.secondaryCtaText).toBe('Get in Touch');
      expect(metrics.image.rendered).toBe(true);
      expect(metrics.image.objectPosition).toBe('50% 0%');
    });
  }
});
