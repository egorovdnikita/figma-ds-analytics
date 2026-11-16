import { afterEach, expect, it, vi } from 'vitest';
import { setupScan } from '../helpers/scan';
import { instance, rectangle, solidPaint, tree, variableAlias } from '../factories/node';
import { toMarkdown } from '../../src/shared/export';

const variable = (id: string, remote = false): Variable =>
  ({ id, name: id, remote, variableCollectionId: 'c' }) as Variable;
const boundPaint = (id: string): SolidPaint => ({
  ...solidPaint(1, 0, 0),
  boundVariables: { color: variableAlias(id) },
});
afterEach(() => vi.unstubAllGlobals());

it('полный скан не считает токен размера покрытием raw-fill', async () => {
  const h = await setupScan(
    [
      rectangle({
        fills: [solidPaint(1, 0, 0)],
        boundVariables: { width: variableAlias('width') },
      }),
    ],
    {
      getLocalVariablesAsync: () => Promise.resolve([variable('width')]),
    },
  );
  h.send({ type: 'ui/scan-requested', scope: 'page' });
  const report = await h.finished();
  expect(report.adoption.nodesWithoutVariable).toBe(1);
  expect(report.adoption.nodesOnLocalVariable).toBe(0);
  expect(report.adoption.topVariables[0]?.id).toBe('width');
  expect(report.trend.points[0]).toMatchObject({ fills: 1, onTokens: 0 });
  expect(toMarkdown(report, new Date())).toContain('| Заливки на токенах | 0% · 0 из 1 |');
});

it('недоступная цветовая привязка не попадает в подтверждённое покрытие и экспорт', async () => {
  const h = await setupScan([
    rectangle({
      fills: [boundPaint('missing')],
      boundVariables: { fills: [variableAlias('missing')] },
    }),
  ]);
  h.send({ type: 'ui/scan-requested', scope: 'page' });
  const report = await h.finished();
  expect(report.adoption).toMatchObject({
    nodesOnLibraryVariable: 0,
    nodesOnLocalVariable: 0,
    nodesOnUnavailableVariable: 1,
  });
  expect(report.trend.points[0]?.onTokens).toBe(0);
  expect(toMarkdown(report, new Date())).toContain('Не удалось проверить привязки: 1 слой');
});

it('заливки внутри инстансов входят в тот же набор кандидатов', async () => {
  const local = rectangle({ fills: [boundPaint('local')] });
  const raw = rectangle({ fills: [solidPaint(0, 0, 0)] });
  const h = await setupScan([tree(instance(), [local, raw])], {
    getLocalVariablesAsync: () => Promise.resolve([variable('local')]),
  });
  h.send({ type: 'ui/scan-requested', scope: 'page' });
  const report = await h.finished();
  expect(report.adoption).toMatchObject({ nodesOnLocalVariable: 1, nodesWithoutVariable: 1 });
  expect(report.trend.points[0]).toMatchObject({ fills: 2, onTokens: 1 });
});

it('текстовая и булева привязки свойств доступны через полный обработчик', async () => {
  const node = instance();
  Object.assign(node, {
    boundVariables: {
      componentProperties: { label: variableAlias('text'), show: variableAlias('boolean') },
    },
  });
  const h = await setupScan([node], {
    getLocalVariablesAsync: () => Promise.resolve([variable('text'), variable('boolean')]),
  });
  h.send({ type: 'ui/scan-requested', scope: 'page' });
  const report = await h.finished();
  expect(report.adoption.topVariables.map((v) => v.id).sort()).toEqual(['boolean', 'text']);
  expect(report.adoption.nodesOnLocalVariable).toBe(0);
});
