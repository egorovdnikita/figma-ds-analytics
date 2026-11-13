/* global document -- callbacks выполняются в браузере Playwright */
/** Обложки Community: настоящие экраны, вымышленные данные, один тезис на кадр.
 * PLAYWRIGHT_PATH=/path/to/package.json node scripts/promo/covers.mjs
 * Перед запуском: node scripts/create-preview.mjs; сервер dist на 4174.
 */
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(process.env.PLAYWRIGHT_PATH);
const { chromium } = require('playwright');
const out = resolve('docs/publication');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1100, height: 800 },
  deviceScaleFactor: 2,
});
const shots = {};
for (const screen of ['summary', 'components', 'collections']) {
  await page.goto(`http://127.0.0.1:4174/preview.html?screen=${screen}`);
  await page.waitForFunction(() => {
    const doc = document.querySelector('iframe')?.contentDocument;
    return doc?.querySelector('nav') && doc?.querySelector('main');
  });
  await page.waitForTimeout(500);
  shots[screen] = (await page.locator('iframe').first().screenshot()).toString('base64');
}
const icon = readFileSync('docs/assets/plugin-icon.png').toString('base64');
const slides = [
  {
    name: 'cover',
    title: 'Дизайн-система.<br>В цифрах.',
    screen: 'summary',
    color: '#6366f1',
    tint: '#ededff',
    top: -250,
    label: 'Аналитика дизайн-системы',
  },
  {
    name: 'components',
    title: 'Компоненты.<br>Всё по местам.',
    screen: 'components',
    color: '#7c3aed',
    tint: '#f0eaff',
    top: -255,
    label: 'Компоненты',
  },
  {
    name: 'tokens',
    title: 'Токены.<br>Все источники.',
    screen: 'collections',
    color: '#2563eb',
    tint: '#eaf1ff',
    top: -255,
    label: 'Токены',
  },
];
await page.setViewportSize({ width: 1920, height: 1080 });
for (const s of slides) {
  const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#fff;color:#181818;font-family:Arial,sans-serif}
  .brand{position:absolute;left:104px;top:84px;display:flex;align-items:center;gap:20px;font-size:28px;font-weight:600;letter-spacing:-.5px}.brand img{width:58px;height:58px;border-radius:16px}
  h1{position:absolute;left:104px;top:322px;margin:0;font-size:108px;line-height:1.03;letter-spacing:-6px;font-weight:700;z-index:2}h1 span{color:${s.color}}
  .stage{position:absolute;left:1024px;top:0;width:896px;height:1080px;background:${s.tint}}
  .panel{position:absolute;left:1100px;top:180px;width:824px;height:784px;background:white;overflow:hidden;border-radius:44px 0 0 44px;box-shadow:0 24px 80px #2525470c}
  .panel img{position:absolute;top:${s.top}px;width:824px;height:auto;display:block}
  .footer{position:absolute;left:104px;bottom:90px;display:flex;gap:12px;align-items:center;color:#727272;font-size:26px}.footer i{display:block;width:9px;height:9px;background:${s.color};border-radius:3px}
  </style><div class="stage"></div><div class="brand"><img src="data:image/png;base64,${icon}">${s.label}</div><h1>${s.title.replace('<br>', '<br><span>')}</span></h1><div class="panel"><img src="data:image/png;base64,${shots[s.screen]}"></div><div class="footer"><i></i>Плагин для Figma</div></html>`;
  await page.setContent(html);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  await page.screenshot({ path: `${out}/${s.name}.png`, scale: 'css' });
}
await browser.close();
