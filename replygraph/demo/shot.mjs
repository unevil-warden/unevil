import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;

const file = 'file://' + process.cwd() + '/index.html';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
await page.goto(file);
await page.waitForTimeout(600);

async function shot(name, clickTab) {
  if (clickTab) {
    await page.evaluate((t) => window.go(t), clickTab);
    await page.waitForTimeout(350);
  }
  await page.screenshot({ path: `shot_${name}.png` });
  console.log('wrote shot_' + name + '.png');
}

await shot('dashboard');
await shot('inbox', 'inbox');
await shot('followups', 'followups');
await shot('analytics', 'analytics');
await shot('settings', 'settings');

await browser.close();
