import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const vendor = 'src/ui/vendor/box-ui';
const cssFiles = ['primitives.css', 'theme.css', 'controls.css'];
const styles = cssFiles.map((f) => readFileSync(`${vendor}/${f}`, 'utf8')).join('\n');
const refs = (text: string): string[] =>
  [...text.matchAll(/var\(\s*(--[\w-]+)\s*[,)]/g)].map((m) => m[1] ?? '');
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'vendor') return [];
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? sources(path) : /\.(css|tsx?|html)$/.test(path) ? [path] : [];
  });
}
const ui = sources('src/ui')
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');
const config = readFileSync('tailwind.config.js', 'utf8');

describe('контракт токенов Box UI', () => {
  it('вендорная копия совпадает с зафиксированными SHA-256', () => {
    const manifest = JSON.parse(readFileSync(`${vendor}/tokens-source.json`, 'utf8')) as {
      files: Record<string, string>;
    };
    for (const file of cssFiles) {
      expect(
        createHash('sha256')
          .update(readFileSync(`${vendor}/${file}`))
          .digest('hex'),
        file,
      ).toBe(manifest.files[file]);
    }
  });

  it('каждая статическая ссылка UI, темы и aliases имеет объявление', () => {
    const declared = new Set<string>();
    for (const css of [
      styles,
      readFileSync('src/ui/index.css', 'utf8'),
      readFileSync('src/ui/local-tokens.css', 'utf8'),
    ]) {
      postcss.parse(css).walkDecls((d) => {
        if (d.prop.startsWith('--')) declared.add(d.prop);
      });
    }
    for (const name of refs(styles + ui + config)) expect(declared.has(name), name).toBe(true);
  });

  it('UI не обходит токены литеральными цветами и произвольными px/rem-классами', () => {
    expect(ui).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    expect(ui).not.toMatch(/\[[0-9.]+(?:px|rem)\]/);
    expect(ui).not.toMatch(/(?:bg|text|border)-(?:red|blue|green|gray|slate|white|black)(?:-|\b)/);
  });

  it('цепочки Box UI разрешаются без циклов в обеих темах и всех статусах', () => {
    for (const theme of ['light', 'dark'])
      for (const status of ['positive', 'warning', 'negative', 'information']) {
        const attrs: Record<string, string> = {
          'data-theme': theme,
          'data-status': status,
          'data-accent': 'deep',
          'data-radius': 'medium',
          'data-font': 'inter',
          'data-device': 'desktop',
          'data-appearance': 'solid',
          'data-state': 'default',
          'data-icon-style': 'bold',
          'data-box-control': '',
        };
        const values = new Map<string, string>();
        postcss.parse(styles).walkRules((rule) => {
          if (
            !rule.selectors.some((s) => {
              if (/:(hover|active|disabled)|aria-disabled/.test(s)) return false;
              return [...s.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)].every(
                (m) => (m[1] ?? '') in attrs && (m[2] === undefined || attrs[m[1] ?? ''] === m[2]),
              );
            })
          )
            return;
          rule.walkDecls((d) => {
            if (d.prop.startsWith('--')) values.set(d.prop, d.value);
          });
        });
        const visit = (name: string, path: string[]): void => {
          expect(path.includes(name), `${theme}/${status}: ${path.join(' → ')} → ${name}`).toBe(
            false,
          );
          const value = values.get(name);
          expect(value, `${theme}/${status}: ${name}`).toBeDefined();
          for (const ref of refs(value ?? '')) visit(ref, [...path, name]);
        };
        for (const name of values.keys()) visit(name, []);
        expect(values.get('--rounding-full')).toBe('var(--brand-rounding-full)');
      }
  });
});
