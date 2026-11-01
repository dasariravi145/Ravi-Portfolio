import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.resolve('test-evidence', 'screenshots');

test.describe('Desktop Homepage Visual Proportions Audit', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  const viewports = [
    { name: 'desktop-1366', width: 1366, height: 768 },
    { name: 'desktop-1440', width: 1440, height: 900 },
    { name: 'desktop-1920', width: 1920, height: 1080 },
    { name: 'tablet-1024', width: 1024, height: 768 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'mobile-390', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`Inspect layout at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://127.0.0.1:8787/');
      await page.waitForLoadState('networkidle');

      // Screenshot for visual evidence
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `audit-${vp.name}.png`),
        fullPage: false,
      });

      // Extract metrics
      const metrics = await page.evaluate(() => {
        const h1 = document.querySelector('section#hero h1');
        const h1Style = h1 ? window.getComputedStyle(h1) : null;
        const h1Rect = h1 ? h1.getBoundingClientRect() : null;

        const sub = document.querySelector('section#hero p');
        const subStyle = sub ? window.getComputedStyle(sub) : null;
        const subRect = sub ? sub.getBoundingClientRect() : null;

        const nav = document.querySelector('header nav');
        const navStyle = nav ? window.getComputedStyle(nav) : null;
        const navRect = nav ? nav.getBoundingClientRect() : null;

        const heroLeft = document.querySelector('section#hero .lg\\:col-span-7, section#hero [class*="col-span-7"]');
        const heroRight = document.querySelector('section#hero .lg\\:col-span-5, section#hero [class*="col-span-5"]');

        const leftRect = heroLeft ? heroLeft.getBoundingClientRect() : null;
        const rightRect = heroRight ? heroRight.getBoundingClientRect() : null;

        const card = document.querySelector('section#hero .shadow-floating, section#hero [class*="shadow-floating"]');
        const cardRect = card ? card.getBoundingClientRect() : null;

        return {
          h1: {
            fontSize: h1Style?.fontSize,
            lineHeight: h1Style?.lineHeight,
            width: h1Rect?.width,
            height: h1Rect?.height,
            estimatedLines: h1Rect && h1Style ? Math.round(h1Rect.height / parseFloat(h1Style.lineHeight)) : 0,
            text: h1?.textContent?.trim().replace(/\s+/g, ' '),
          },
          subtitle: {
            fontSize: subStyle?.fontSize,
            lineHeight: subStyle?.lineHeight,
            width: subRect?.width,
            height: subRect?.height,
          },
          nav: {
            display: navStyle?.display,
            width: navRect?.width,
            height: navRect?.height,
          },
          columns: {
            leftHeight: leftRect?.height,
            leftWidth: leftRect?.width,
            rightHeight: rightRect?.height,
            rightWidth: rightRect?.width,
            heightDelta: leftRect && rightRect ? Math.round(leftRect.height - rightRect.height) : 0,
          },
          card: {
            width: cardRect?.width,
            height: cardRect?.height,
          },
        };
      });

      console.log(`\n=== METRICS FOR ${vp.name} (${vp.width}px) ===\n`, JSON.stringify(metrics, null, 2));
      expect(metrics.h1.fontSize).toBeDefined();
    });
  }
});

