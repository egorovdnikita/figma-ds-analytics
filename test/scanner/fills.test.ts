import { expect, it } from 'vitest';
import { fillBindings } from '../../src/main/scanner/fills';
import { rectangle, solidPaint, variableAlias } from '../factories/node';

it('токен ширины не скрывает цвет без токена', () => {
  const node = rectangle({
    fills: [solidPaint(1, 0, 0)],
    boundVariables: { width: variableAlias('width') },
  });
  expect(fillBindings(node)).toEqual({ kind: 'raw' });
});

it('учитывает только цветовые привязки видимых заливок', () => {
  const paint = { ...solidPaint(1, 0, 0), boundVariables: { color: variableAlias('color') } };
  expect(
    fillBindings(rectangle({ fills: [paint, { ...solidPaint(0, 0, 0), visible: false }] })),
  ).toEqual({ kind: 'bound', ids: ['color'] });
});

it('частично токенизированная заливка остаётся кандидатом на исправление', () => {
  expect(
    fillBindings(
      rectangle({
        fills: [
          { ...solidPaint(1, 0, 0), boundVariables: { color: variableAlias('color') } },
          solidPaint(0, 0, 0),
        ],
      }),
    ),
  ).toEqual({ kind: 'raw' });
});

it('слои без видимого цвета не входят в знаменатель', () => {
  expect(fillBindings(rectangle())).toEqual({ kind: 'none' });
  expect(fillBindings(rectangle({ visible: false, fills: [solidPaint(1, 0, 0)] }))).toEqual({
    kind: 'none',
  });
  expect(fillBindings(rectangle({ fills: [{ ...solidPaint(1, 0, 0), opacity: 0 }] }))).toEqual({
    kind: 'none',
  });
});
