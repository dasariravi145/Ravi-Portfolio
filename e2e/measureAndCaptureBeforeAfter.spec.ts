import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BEFORE_DIR = path.resolve('test-evidence', 'step1-before');
const AFTER_DIR = path.resolve('test-evidence', 'step2-after');

test.describe('Step 1 Diagnosis: Capture Live Before Metrics & Screenshots', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(BEFORE_DIR)) {
      fs.mkdirSync(BEFORE_DIR, { recursive: true });
    }
    if (!fs.existsSync(AFTER_DIR)) {
      fs.mkdirSync(AFTER_DIR, { recursive: true });
    }
  });

  const viewports = [
    { name: '1280x720-dpr1.5', width: 1280, height: 720, dpr: 1.5, desc: 'Windows 150% Scale' },
    { name: '1280x720-dpr1.0', width: 1280, height: 720, dpr: 1.0, desc: '1280px 100% Zoom' },
    { name: '1366x768-dpr1.0', width: 1366, height: 768, dpr: 1.0, desc: 'Standard 1366px Laptop' },
    { name: '1440x900-dpr1.0', width: 1440, height: 900, dpr: 1.0, desc: 'Standard 1440px Desktop' },
    { name: '1920x1080-dpr1.0', width: 1920, height: 1080, dpr: 1.0, desc: 'Full HD 1080p Desktop' },
  ];

  for (const vp of viewports) {
    test(`Capture Before at ${vp.name}`, async ({ browser }) => {
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

      // Wait for image to decode
      await page.waitForFunction(() => {
        const img = document.querySelector('section#hero img') as HTMLImageElement;
        return img && img.complete && img.naturalWidth > 0;
      }, { timeout: 10000 });

      await page.waitForTimeout(400);

      // Screenshot above-the-fold
      await page.screenshot({
        path: path.join(BEFORE_DIR, `before-${vp.name}.png`),
        fullPage: false,
      });

      const metrics = await page.evaluate(() => {
        const header = document.querySelector('header');
        const headerContainer = header?.querySelector('div');
        const headerNav = header?.querySelector('nav');
        const main = document.querySelector('main');
        const hero = document.querySelector('section#hero');
        const heroContainer = hero?.querySelector('div');
        const h1 = hero?.querySelector('h1');
        const desc = hero?.querySelector('p');
        const btnPrimary = hero?.querySelector('a[href="#projects"]');
        const btnSecondary = hero?.querySelector('a[href="#contact"]');
        const cardBox = hero?.querySelector('.lg\\:col-span-5 .relative, [class*="col-span-5"] .relative');
        const img = hero?.querySelector('img');

        const getBox = (el: Element | null | undefined) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const s = window.getComputedStyle(el);
          return {
            width: Math.round(r.width * 100) / 100,
            height: Math.round(r.height * 100) / 100,
            top: Math.round(r.top * 100) / 100,
            bottom: Math.round(r.bottom * 100) / 100,
            left: Math.round(r.left * 100) / 100,
            fontSize: s.fontSize,
            lineHeight: s.lineHeight,
            padding: s.padding,
            margin: s.margin,
            maxWidth: s.maxWidth,
          };
        };

        const h1Rect = h1?.getBoundingClientRect();
        const h1Style = h1 ? window.getComputedStyle(h1) : null;
        const lineCount = h1Rect && h1Style ? Math.round(h1Rect.height / parseFloat(h1Style.lineHeight)) : 0;

        return {
          windowInnerWidth: window.innerWidth,
          windowInnerHeight: window.innerHeight,
          header: getBox(header),
          headerContainer: getBox(headerContainer),
          headerNav: getBox(headerNav),
          mainPaddingTop: main ? window.getComputedStyle(main).paddingTop : null,
          heroPaddingTop: hero ? window.getComputedStyle(hero).paddingTop : null,
          heroContainer: getBox(heroContainer),
          h1: {
            text: h1?.textContent?.trim().replace(/\s+/g, ' '),
            lineCount,
            box: getBox(h1),
          },
          desc: getBox(desc),
          btnPrimary: getBox(btnPrimary),
          btnSecondary: getBox(btnSecondary),
          cardBox: getBox(cardBox),
          image: {
            complete: img?.complete,
            naturalWidth: img?.naturalWidth,
            naturalHeight: img?.naturalHeight,
            box: getBox(img),
          },
          isCtaVisibleInFold: btnPrimary ? btnPrimary.getBoundingClientRect().bottom <= window.innerHeight : false,
        };
      });

      console.log(`\n=== BEFORE DIAGNOSTIC METRICS FOR ${vp.name} ===\n`, JSON.stringify(metrics, null, 2));

      await context.close();
    });
  }
});

test.describe('Step 2: Capture Live After Metrics & Screenshots', () => {
  const viewports = [
    { name: '1280x720-dpr1.5', width: 1280, height: 720, dpr: 1.5, desc: 'Windows 150% Scale' },
    { name: '1280x720-dpr1.0', width: 1280, height: 720, dpr: 1.0, desc: '1280px 100% Zoom' },
    { name: '1366x768-dpr1.0', width: 1366, height: 768, dpr: 1.0, desc: 'Standard 1366px Laptop' },
    { name: '1440x900-dpr1.0', width: 1440, height: 900, dpr: 1.0, desc: 'Standard 1440px Desktop' },
    { name: '1920x1080-dpr1.0', width: 1920, height: 1080, dpr: 1.0, desc: 'Full HD 1080p Desktop' },
  ];

  for (const vp of viewports) {
    test(`Capture After at ${vp.name}`, async ({ browser }) => {
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

      // Wait for image to decode
      await page.waitForFunction(() => {
        const img = document.querySelector('section#hero img') as HTMLImageElement;
        return img && img.complete && img.naturalWidth > 0;
      }, { timeout: 10000 });

      await page.waitForTimeout(400);

      // Screenshot above-the-fold
      await page.screenshot({
        path: path.join(AFTER_DIR, `after-${vp.name}.png`),
        fullPage: false,
      });

      const metrics = await page.evaluate(() => {
        const header = document.querySelector('header');
        const headerContainer = header?.querySelector('div');
        const headerNav = header?.querySelector('nav');
        const main = document.querySelector('main');
        const hero = document.querySelector('section#hero');
        const heroContainer = hero?.querySelector('div');
        const h1 = hero?.querySelector('h1');
        const desc = hero?.querySelector('p');
        const btnPrimary = hero?.querySelector('a[href="#projects"]');
        const btnSecondary = hero?.querySelector('a[href="#contact"]');
        const cardBox = hero?.querySelector('.lg\\:col-span-5 .relative, [class*="col-span-5"] .relative');
        const img = hero?.querySelector('img');

        const getBox = (el: Element | null | undefined) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const s = window.getComputedStyle(el);
          return {
            width: Math.round(r.width * 100) / 100,
            height: Math.round(r.height * 100) / 100,
            top: Math.round(r.top * 100) / 100,
            bottom: Math.round(r.bottom * 100) / 100,
            left: Math.round(r.left * 100) / 100,
            fontSize: s.fontSize,
            lineHeight: s.lineHeight,
            padding: s.padding,
            margin: s.margin,
            maxWidth: s.maxWidth,
          };
        };

        const h1Rect = h1?.getBoundingClientRect();
        const h1Style = h1 ? window.getComputedStyle(h1) : null;
        const lineCount = h1Rect && h1Style ? Math.round(h1Rect.height / parseFloat(h1Style.lineHeight)) : 0;

        return {
          windowInnerWidth: window.innerWidth,
          windowInnerHeight: window.innerHeight,
          header: getBox(header),
          headerContainer: getBox(headerContainer),
          headerNav: getBox(headerNav),
          mainPaddingTop: main ? window.getComputedStyle(main).paddingTop : null,
          heroPaddingTop: hero ? window.getComputedStyle(hero).paddingTop : null,
          heroContainer: getBox(heroContainer),
          h1: {
            text: h1?.textContent?.trim().replace(/\s+/g, ' '),
            lineCount,
            box: getBox(h1),
          },
          desc: getBox(desc),
          btnPrimary: getBox(btnPrimary),
          btnSecondary: getBox(btnSecondary),
          cardBox: getBox(cardBox),
          image: {
            complete: img?.complete,
            naturalWidth: img?.naturalWidth,
            naturalHeight: img?.naturalHeight,
            box: getBox(img),
          },
          isCtaVisibleInFold: btnPrimary ? btnPrimary.getBoundingClientRect().bottom <= window.innerHeight : false,
        };
      });

      console.log(`\n=== AFTER COMPACT METRICS FOR ${vp.name} ===\n`, JSON.stringify(metrics, null, 2));

      // Assertions for visual excellence
      expect(metrics.h1.lineCount).toBeLessThanOrEqual(2);
      expect(metrics.isCtaVisibleInFold).toBe(true);
      expect(metrics.headerContainer?.maxWidth).toBe(metrics.heroContainer?.maxWidth);

      await context.close();
    });
  }
});

