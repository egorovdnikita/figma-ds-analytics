import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * Убирает из собранного HTML объявления CSS-переменных, на которые нет ни одной
 * ссылки `var(--…)` — ни в CSS, ни в JS.
 *
 * Токены Box UI вендорятся целиком: тема ссылается на всю цепочку примитивов,
 * и частичная копия оставила бы `var()` в пустоту. Но плагину нужна треть
 * переменных, а остальное — около 40 KB при бюджете бандла 500 KB. Чистка идёт
 * после сборки, по готовому HTML, до неподвижной точки: переменная, на которую
 * ссылалась только удалённая, тоже удаляется. Вендорная копия не меняется.
 *
 * Имена, которые код собирает на лету (`var(--size-${size})`), статически
 * не видны — их префиксы перечислены в `KEEP_PREFIXES`.
 */
export const KEEP_PREFIXES = ['--size-'];

const STYLE = /(<style[^>]*>)([\s\S]*?)(<\/style>)/g;
const REFERENCE = /var\(\s*(--[\w-]+)/g;

/** Объявления `--имя:значение` верхнего уровня с границами в строке. */
function declarations(css) {
  const found = [];
  const start = /(^|[{;\s])(--[\w-]+)\s*:/g;
  let match;
  while ((match = start.exec(css)) !== null) {
    const from = match.index + match[1].length;
    let i = start.lastIndex;
    let depth = 0;
    let quote = null;
    for (; i < css.length; i++) {
      const c = css[i];
      if (quote !== null) {
        if (c === '\\') i++;
        else if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (depth === 0 && (c === ';' || c === '}')) break;
    }
    const to = css[i] === ';' ? i + 1 : i;
    found.push({ name: match[2], from, to });
    start.lastIndex = i;
  }
  return found;
}

function references(text) {
  return new Set([...text.matchAll(REFERENCE)].map((m) => m[1]));
}

function keep(name, used) {
  return used.has(name) || KEEP_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/** Чистит CSS при известном наборе ссылок извне (из JS). */
export function pruneCss(css, outside = new Set()) {
  let current = css;
  for (;;) {
    const used = new Set([...outside, ...references(current)]);
    const unused = declarations(current).filter((d) => !keep(d.name, used));
    if (unused.length === 0) break;
    let next = '';
    let cursor = 0;
    for (const d of unused) {
      next += current.slice(cursor, d.from);
      cursor = d.to;
    }
    current = next + current.slice(cursor);
  }
  // Пустые правила после чистки: `:root{}`, `[data-theme=dark]{}`.
  return current.replace(/(^|[{}])[^{}@]+\{\s*\}/g, '$1').replace(/;\}/g, '}');
}

export function pruneHtml(html) {
  const outside = references(html.replace(STYLE, ''));
  return html.replace(STYLE, (_, open, css, close) => open + pruneCss(css, outside) + close);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const target = process.argv[2] ?? 'dist/index.html';
  const before = readFileSync(target, 'utf8');
  const after = pruneHtml(before);
  writeFileSync(target, after);
  const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1);
  console.log(`CSS-переменные без ссылок убраны: ${kb(before)} → ${kb(after)} KB`);
}
