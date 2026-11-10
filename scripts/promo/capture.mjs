/* global document, window, requestAnimationFrame -- код внутри page.evaluate выполняется в браузере */
/**
 * Запись промо: настоящий UI плагина (dist/index.html) в Chromium.
 *
 * Песочницу Figma заменяет сценарий: он отвечает UI теми же сообщениями
 * `main/*` из src/shared/messages.ts, данные — вымышленный отчёт demo-data.mjs.
 * Клики выполняются по настоящим кнопкам; центр кольца — измеренный
 * прямоугольник кнопки. Кадры снимаются по виртуальной сетке 60 кадров/с,
 * поэтому скорость машины на результат не влияет.
 *
 *   node scripts/promo/capture.mjs ПАПКА
 *
 * Результат: ПАПКА/panel/*.png и ПАПКА/timeline.json для compose.py.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FILE_NAME, PAGES, PAGE_NODES, REPORT } from './demo-data.mjs';

const require = createRequire(process.env.PLAYWRIGHT_PATH ?? import.meta.url);
const { chromium } = require('playwright');

const FPS = 60;
const PANEL = { width: 480, height: 640 }; // UI_SIZE из src/main/index.ts
const SCALE = 3;

const out = resolve(process.argv[2] ?? '');
if (process.argv[2] === undefined) throw new Error('Укажи папку для кадров');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
rmSync(join(out, 'panel'), { recursive: true, force: true });
mkdirSync(join(out, 'panel'), { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: PANEL,
  deviceScaleFactor: SCALE,
  reducedMotion: 'reduce', // переходы мгновенные: плавность задаёт сетка кадров
  colorScheme: 'dark',
});
const page = await context.newPage();
await page.goto(pathToFileURL(join(root, 'dist/index.html')).href);
await page.waitForSelector('#root > *');
// Тема как у Figma с themeColors: true в тёмном режиме: Figma вешает класс
// на <html>, а applyModes подхватывает его наблюдателем.
await page.evaluate(() => document.documentElement.classList.add('figma-dark'));
await page.evaluate(() => document.fonts.ready);

const frames = [];
const clicks = [];
const camera = [];
let shots = 0;
let current = null;

const now = () => frames.length / FPS;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

async function settle() {
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
}

async function snap() {
  await settle();
  shots += 1;
  const name = `panel/${String(shots).padStart(4, '0')}.png`;
  await page.screenshot({ path: join(out, name) });
  return name;
}

function hold(seconds) {
  for (let i = 0, n = Math.round(seconds * FPS); i < n; i += 1) frames.push({ img: current });
}

/** Переход к новому состоянию: короткое растворение, чтобы смена экрана не мигала. */
async function show(fade = 0.12) {
  const next = await snap();
  const n = Math.round(fade * FPS);
  for (let i = 1; i <= n; i += 1) frames.push({ a: current, b: next, mix: ease(i / (n + 1)) });
  current = next;
}

function main(message) {
  return page.evaluate((m) => window.postMessage({ pluginMessage: m }, '*'), message);
}

/** Камера: центр по вертикали (CSS px панели) и масштаб CSS px → px ролика. */
function cam(cy, s, duration = 0.75) {
  camera.push({ t: now(), cy, s, duration });
}

async function rectOf(locator) {
  const box = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (box.w === 0 || box.h === 0) throw new Error('Цель клика не видна');
  return box;
}

/**
 * Клик по настоящей кнопке. Кольцо появляется за 0,37 с до нажатия,
 * поэтому перед кликом держим текущий кадр, а смена состояния — ровно в момент нажатия.
 */
async function click(locator, label, { fade = 0.12, lead = 0.45, after = 0 } = {}) {
  const box = await rectOf(locator);
  hold(lead);
  clicks.push({ t: now(), x: box.x + box.w / 2, y: box.y + box.h / 2, rect: box, label });
  await locator.evaluate((el) => el.click());
  await show(fade);
  hold(after);
}

async function scroll(to, seconds) {
  const el = page.locator('main');
  const from = await el.evaluate((m) => m.scrollTop);
  const max = await el.evaluate((m) => m.scrollHeight - m.clientHeight);
  const target = Math.min(to, max);
  const n = Math.round(seconds * FPS);
  for (let i = 1; i <= n; i += 1) {
    const y = from + (target - from) * ease(i / n);
    await el.evaluate((m, v) => {
      m.scrollTop = v;
    }, y);
    current = await snap();
    frames.push({ img: current });
  }
  return target;
}

const WIDE = PANEL.height / 2;

// ---------- сценарий ----------

await main({ type: 'main/booted', fileName: FILE_NAME, lastScope: 'page' });
current = await snap();
const first = current;
cam(WIDE, 1.25, 0);
hold(1.0);

// Охват «весь файл» и запуск.
cam(300, 1.75);
hold(0.6);
await click(page.getByRole('button', { name: 'весь файл' }), 'Охват: весь файл', { fade: 0.08 });
await click(page.getByRole('button', { name: 'Проверить' }), 'Проверить', {
  fade: 0.08,
  lead: 0.55,
});

// Прогресс: страницы грузятся по одной, слои считаются.
const scanSeconds = 3.2;
const total = PAGE_NODES.reduce((a, b) => a + b, 0);
const n = Math.round(scanSeconds * FPS);
for (let i = 0; i < n; i += 1) {
  const visited = Math.round(total * ease((i + 1) / n));
  let pagesDone = 0;
  let acc = 0;
  while (pagesDone < PAGES.length - 1 && acc + PAGE_NODES[pagesDone] <= visited) {
    acc += PAGE_NODES[pagesDone];
    pagesDone += 1;
  }
  await main({
    type: 'main/scan-progress',
    nodesVisited: visited,
    pagesDone,
    pagesTotal: PAGES.length,
    currentPageName: PAGES[pagesDone],
  });
  // Подпись меняется не чаще 20 раз в секунду, как и у реального обхода.
  if (i % 3 === 0) current = await snap();
  frames.push({ img: current });
}

// Отчёт: сводка.
await main({ type: 'main/scan-finished', report: REPORT });
await show(0.2);
cam(WIDE, 1.25);
hold(1.6);
cam(250, 1.7);
hold(1.6);
cam(WIDE, 1.25);
hold(0.6);

// Прокрутка до «С чего начать».
const advice = page.getByText('С чего начать', { exact: true });
const adviceTop = await advice.evaluate((el) => {
  const main = document.querySelector('main');
  return el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop;
});
await scroll(adviceTop - 24, 1.6);
hold(0.6);

// Пункт «Компоненты мимо библиотеки» ведёт в отфильтрованный список.
await click(page.getByText('Компоненты мимо библиотеки', { exact: true }), 'С чего начать');
// Вкладка наследует прокрутку сводки — пользователь поднимается к началу списка.
hold(0.3);
await scroll(0, 0.7);
hold(0.6);
await click(
  page.getByRole('cell').getByText('Banner / Sale', { exact: true }),
  'Карточка компонента',
);
cam(330, 1.6);
hold(1.0);
await click(page.getByText('перейти', { exact: true }).first(), 'Перейти к слою', { fade: 0 });
hold(0.5);
await click(page.getByRole('button', { name: 'Закрыть' }), 'Закрыть');
cam(WIDE, 1.25);

// Токены: impact — сколько слоёв сломается.
await click(page.locator('nav button', { hasText: 'Токены' }), 'Токены', { after: 0.6 });
await click(page.getByRole('button', { name: 'токены', exact: true }), 'Вид: токены', {
  after: 0.6,
});
await click(
  page.getByRole('cell').getByText('color/text/primary', { exact: true }),
  'Карточка токена',
);
cam(320, 1.6);
hold(1.8);
await click(page.getByRole('button', { name: 'Закрыть' }), 'Закрыть');
cam(WIDE, 1.25);

// Назад к сводке, затем растворение в стартовый экран — стык петли.
await click(page.locator('nav button', { hasText: 'Сводка' }), 'Сводка', { after: 0.9 });
const fadeFrames = Math.round(0.45 * FPS);
for (let i = 1; i <= fadeFrames; i += 1)
  frames.push({ a: current, b: first, mix: ease(i / fadeFrames) });
current = first;
hold(0.3);

await browser.close();

writeFileSync(
  join(out, 'timeline.json'),
  JSON.stringify({ fps: FPS, panel: PANEL, scale: SCALE, frames, clicks, camera }, null, 1),
);
console.log(
  `Кадров: ${frames.length} (${(frames.length / FPS).toFixed(2)} с), снимков: ${shots}, кликов: ${clicks.length}`,
);
