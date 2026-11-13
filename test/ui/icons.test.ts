import { describe, expect, it } from 'vitest';
import bodies from '../../src/ui/vendor/box-ui/icons.json';
import { BOLD_ICONS, ICON_NAMES, LINEAR_ICONS } from '../../src/ui/icons';

const vendored: Record<string, string> = bodies;

describe('иконки Box UI', () => {
  it('каждая объявленная иконка завезена — и ничего лишнего', () => {
    // Расхождение значит, что список правили без `npm run sync:box-ui`:
    // в первом случае иконка отрисуется пустотой, во втором бандл везёт мёртвый груз.
    expect(Object.keys(vendored).sort()).toEqual([...ICON_NAMES].sort());
  });

  it('геометрия не зашивает цвет — красится токеном текста вокруг', () => {
    for (const [name, body] of Object.entries(vendored)) {
      expect(body, name).not.toMatch(/(fill|stroke)="#/i);
    }
  });

  it('у каждой иконки есть геометрия', () => {
    for (const [name, body] of Object.entries(vendored)) {
      expect(body.length, name).toBeGreaterThan(20);
    }
  });

  it('стрелки и поиск — контурные, остальное — залитое', () => {
    // linear рисуется обводкой, bold — заливкой. Перепутанный стиль после
    // синхронизации сразу бросается в глаза в панели, но тест ловит раньше.
    for (const name of LINEAR_ICONS) expect(vendored[name], name).toMatch(/stroke="currentColor"/);
    for (const name of BOLD_ICONS) expect(vendored[name], name).toMatch(/fill="currentColor"/);
  });
});
