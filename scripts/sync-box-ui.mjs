/** Сборка токенов Box UI в изолированной копии. Исходник доступен только для чтения. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.env.BOX_UI_DIR ?? join(homedir(), 'Projects/box-ui'));
const out = join(root, 'src/ui/vendor/box-ui');
const files = ['primitives.css', 'theme.css', 'controls.css'];
const hash = (value) => createHash('sha256').update(value).digest('hex');
const checking = process.argv.includes('--check');
const offline = process.argv.includes('--offline');
const manifestPath = join(out, 'tokens-source.json');

if (offline) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const file of files) {
    if (hash(readFileSync(join(out, file))) !== manifest.files[file]) {
      throw new Error(`Дрейф вендорного файла ${file}: запустите npm run sync:box-ui`);
    }
  }
  console.log('Box UI: контрольные суммы токенов совпадают');
} else {
  const temp = mkdtempSync(join(tmpdir(), 'figma-ds-box-ui-'));
  try {
    // Копируем входы генератора, а не dist: он может быть устаревшим.
    for (const path of ['tokens/figma', 'packages/tokens/scripts']) {
      cpSync(join(source, path), join(temp, path), { recursive: true });
    }
    const inputs = {};
    for (const path of ['tokens/figma', 'packages/tokens/scripts']) {
      for (const file of readdirSync(join(temp, path)).sort()) {
        inputs[`${path}/${file}`] = hash(readFileSync(join(temp, path, file)));
      }
    }
    const commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    execFileSync(process.execPath, [join(temp, 'packages/tokens/scripts/build.mjs')], {
      cwd: temp,
      stdio: 'pipe',
    });
    const generated = Object.fromEntries(
      files.map((file) => [file, readFileSync(join(temp, 'packages/tokens/dist/css', file))]),
    );
    const manifest = {
      repository: 'https://github.com/egorovdnikita/box-ui',
      commit,
      inputs,
      files: Object.fromEntries(files.map((file) => [file, hash(generated[file])])),
    };
    if (checking) {
      const pinned = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (JSON.stringify(pinned.inputs) !== JSON.stringify(inputs))
        throw new Error('Изменились исходники Box UI: требуется проверка и синхронизация');
      for (const file of files) {
        if (!readFileSync(join(out, file)).equals(generated[file]))
          throw new Error(`Расхождение с Box UI: ${file}`);
      }
      console.log(`Box UI ${commit.slice(0, 7)}: исходники и все 3 CSS совпадают`);
    } else {
      const sourceDoc = readFileSync(join(out, 'SOURCE.md'), 'utf8').replace(
        /(- Токены — коммит: )`[^`]+`/,
        (_, prefix) => `${prefix}\`${commit}\``,
      );
      mkdirSync(out, { recursive: true });
      for (const file of files) writeFileSync(join(out, file), generated[file]);
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      writeFileSync(join(out, 'SOURCE.md'), sourceDoc);
      console.log(`Box UI ${commit.slice(0, 7)}: синхронизированы только токены; иконки сохранены`);
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
