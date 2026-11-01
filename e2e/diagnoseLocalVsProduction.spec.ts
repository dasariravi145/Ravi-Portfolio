import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const FIX_EVIDENCE_DIR = path.resolve('test-evidence', 'visual-fix');

test.describe('Verify Compact Centered Homepage Visual Fix (Local vs. Production)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(FIX_EVIDENCE_DIR)) {
      fs.mkdirSync(FIX_EVIDENCE_DIR, { recursive: true });
    }
  });

  const viewports = [
    { name: 'desktop-1280x720-dpr1.5', width: 1280, height: 720, dpr: 1.5, desc: 'Windows 150% Scale' },
    { name: 'desktop-1280x720-dpr1.0', width: 1280, height: 720, dpr: 1.0, desc: '1280px Desktop 100%' },
    { name: 'desktop-1366x768-dpr1.0', width: 1366, height: 768, dpr: 1.0, desc: '1366px Laptop 100%' },
    { name: 'desktop-1440x900-dpr1.0', width: 1440, height: 900, dpr: 1.0, desc: '1440px Desktop 100%' },
    { name: 'desktop-1920x1080-dpr1.0', width: 1920, height: 1080, dpr: 1.0, desc: '1920px Full HD 100%' },
    { name: 'tablet-1024x768', width: 1024, height: 768, dpr: 1.0, desc: 'Tablet Landscape' },
    { name: 'tablet-768x1024', width: 768, height: 1024, dpr: 1.0, desc: 'Tablet Portrait' },
    { name: 'mobile-390x844', width: 390, height: 844, dpr: 1.0, desc: 'Mobile Screen' },
  ];

  for (const vp of viewports) {
    test(`Verify visual fix at ${vp.name} (${vp.desc})`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.dpr,
      });
      const page = await context.newPage();

      // Intercept /api/public/content on localhost to return the real production content
      await page.route('**/api/public/content', async (route) => {
        try {
          const res = await fetch('https://ravi-portfolio.dsecops88.online/api/public/content');
          const data = await res.json();
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(data),
          });
        } catch {
          await route.continue();
        }
      });

      // Intercept /api/public/media/** on localhost to fetch the real uploaded photo
      await page.route('**/api/public/media/**', async (route) => {
        try {
          const prodUrl = route.request().url().replace('http://localhost:3000', 'https://ravi-portfolio.dsecops88.online');
          const imgRes = await fetch(prodUrl);
          const buffer = await imgRes.arrayBuffer();
          await route.fulfill({
            status: imgRes.status,
            contentType: imgRes.headers.get('content-type') || 'image/jpeg',
            body: Buffer.from(buffer),
          });
        } catch {
          await route.continue();
        }
      });

      await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

      // Ensure the real profile photo decoded
      await page.waitForFunction(() => {
        const img = document.querySelector('section#hero img') as HTMLImageElement;
        return img && img.complete && img.naturalWidth > 0;
      }, { timeout: 10000 });

      await page.waitForTimeout(400);

      // Capture screenshot for visual evidence
      await page.screenshot({
        path: path.join(FIX_EVIDENCE_DIR, `local-fixed-${vp.name}.png`),
        fullPage: false,
      });

      // Capture computed layout metrics
      const metrics = await page.evaluate(() => {
        const hero = document.querySelector('section#hero');
        const heroContainer = hero ? hero.querySelector('div') : null;
        const h1 = hero ? hero.querySelector('h1') : null;
        const rightCol = hero ? hero.querySelector('.lg\\:col-span-5, [class*="col-span-5"]') : null;
        const cardBox = rightCol ? rightCol.querySelector('.relative') : null;
        const card = rightCol ? rightCol.querySelector('.shadow-floating, [class*="shadow-floating"]') : null;
        const img = rightCol ? rightCol.querySelector('img') : null;

        const getBox = (el: Element | null | undefined) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const s = window.getComputedStyle(el);
          return {
            width: Math.round(r.width * 100) / 100,
            height: Math.round(r.height * 100) / 100,
            left: Math.round(r.left * 100) / 100,
            margin: s.margin,
            maxWidth: s.maxWidth,
          };
        };

        return {
          windowInnerWidth: window.innerWidth,
          container: getBox(heroContainer),
          h1: {
            text: h1?.textContent?.trim().replace(/\s+/g, ' '),
            fontSize: h1 ? window.getComputedStyle(h1).fontSize : null,
            lineHeight: h1 ? window.getComputedStyle(h1).lineHeight : null,
          },
          cardBox: getBox(cardBox),
          card: getBox(card),
          image: {
            rendered: !!img,
            src: img?.getAttribute('src'),
            naturalWidth: img?.naturalWidth,
            naturalHeight: img?.naturalHeight,
            complete: img?.complete,
            objectFit: img ? window.getComputedStyle(img).objectFit : null,
            objectPosition: img ? window.getComputedStyle(img).objectPosition : null,
            box: getBox(img),
          },
        };
      });

      console.log(`\n=== VERIFIED FIXED METRICS: ${vp.name} ===\n`, JSON.stringify(metrics, null, 2));

      // Assertions
      if (vp.width >= 1280) {
        // Container must be constrained to ~1152px (max-w-6xl)
        expect(metrics.container?.width).toBeLessThanOrEqual(1152);
        // Container must be centered (left margin > 0)
        expect(metrics.container?.left).toBeGreaterThan(0);
        // Profile card must be ~300x365px
        expect(metrics.cardBox?.width).toBe(300);
        expect(metrics.cardBox?.height).toBe(365);
      }
      expect(metrics.image.rendered).toBe(true);
      expect(metrics.image.complete).toBe(true);
      expect(metrics.image.naturalWidth).toBeGreaterThan(0);

      await context.close();
    });
  }
});
