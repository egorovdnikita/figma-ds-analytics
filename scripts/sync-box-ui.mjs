/**
 * Синхронизация с дизайн-системой Box UI.
 *
 *   npm run sync:box-ui                         # клонирует свежий main
 *   BOX_UI_DIR=../box-ui npm run sync:box-ui    # из локальной копии
 *
 * Пакеты Box UI не опубликованы в npm, поэтому нужное вендорится в
 * src/ui/vendor/box-ui/ и коммитится — сборка плагина не должна зависеть от
 * сети и от чужого репозитория.
 *
 * Токены берутся целиком: тема переключается атрибутами и ссылается на всю
 * цепочку примитивов, выдернуть часть значит получить var() в пустоту.
 * Иконки — только из списков src/ui/icons.ts: стиль целиком весит 640 KB,
 * а бюджет всего UI — 500 KB. Каждая иконка берётся из своего стиля:
 * BOLD_ICONS — bold, LINEAR_ICONS — linear.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO = 'https://github.com/egorovdnikita/box-ui.git';
const ICON_STYLES = { BOLD_ICONS: 'bold', LINEAR_ICONS: 'linear' };
const OUT = resolve('src/ui/vendor/box-ui');

let source = process.env.BOX_UI_DIR ? resolve(process.env.BOX_UI_DIR) : null;
let cleanup = null;
if (source === null) {
  const dir = mkdtempSync(join(tmpdir(), 'box-ui-'));
  execFileSync('git', ['clone', '--quiet', '--depth', '1', REPO, dir], { stdio: 'inherit' });
  source = dir;
  cleanup = dir;
}

try {
  const commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

  // Токены собираются из дампов Figma скриптом самой Box UI — тем же, что
  // кормит её Storybook. Своей интерпретации дампов здесь нет.
  execFileSync('node', [join(source, 'packages/tokens/scripts/build.mjs')], {
    cwd: source,
    stdio: 'ignore',
  });
  const cssDir = join(source, 'packages/tokens/dist/css');

  mkdirSync(OUT, { recursive: true });
  for (const file of ['primitives.css', 'theme.css', 'controls.css']) {
    writeFileSync(join(OUT, file), readFileSync(join(cssDir, file)));
  }

  const list = readFileSync('src/ui/icons.ts', 'utf8');
  const icons = {};
  const counts = [];
  for (const [constant, style] of Object.entries(ICON_STYLES)) {
    const block = new RegExp(`export const ${constant} = \\[([\\s\\S]*?)\\] as const`).exec(list);
    if (block === null) throw new Error(`В src/ui/icons.ts нет списка ${constant}`);
    const wanted = [...block[1].matchAll(/'([a-z0-9-]+)'/g)].map((match) => match[1]);
    const all = JSON.parse(
      readFileSync(join(source, `packages/icons/src/data/${style}.json`), 'utf8'),
    );
    const missing = wanted.filter((name) => !(name in all));
    if (missing.length > 0) {
      throw new Error(`В Box UI (${style}) нет иконок: ${missing.join(', ')}`);
    }
    for (const name of wanted) icons[name] = all[name];
    counts.push(`${wanted.length} \`${style}\``);
  }
  const wanted = Object.keys(icons);
  // Зашитый цвет проигнорировал бы токен текста вокруг — Box UI запрещает
  // такое в своих тестах, и здесь это проверяется повторно.
  for (const [name, body] of Object.entries(icons)) {
    if (/fill="#|stroke="#/i.test(body)) throw new Error(`Иконка ${name} с зашитым цветом`);
  }
  writeFileSync(join(OUT, 'icons.json'), `${JSON.stringify(icons, null, 2)}\n`);

  writeFileSync(
    join(OUT, 'SOURCE.md'),
    `# Box UI — вендорная копия

Не редактировать руками: файлы перезаписывает \`npm run sync:box-ui\`.

- Источник: ${REPO.replace(/\.git$/, '')}
- Коммит: \`${commit}\`
- Токены: \`primitives.css\`, \`theme.css\`, \`controls.css\` — сборка \`packages/tokens\`, без изменений
- Иконки: ${wanted.length} шт. (${counts.join(', ')}), списки — \`src/ui/icons.ts\`

Иконки — набор Solar © 480 Design, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
`,
  );

  console.log(`Box UI ${commit.slice(0, 7)}: токены + ${wanted.length} иконок → ${OUT}`);
} finally {
  if (cleanup !== null && existsSync(cleanup)) rmSync(cleanup, { recursive: true, force: true });
}
