import { expect, it } from 'vitest';
import { scanIdentity } from '../../src/main/scanner/scope';
import { page, rectangle } from '../factories/node';

it('разные страницы имеют разную идентичность', () => {
  expect(scanIdentity({ kind: 'page', page: page({ id: 'a' }) }).key).not.toBe(
    scanIdentity({ kind: 'page', page: page({ id: 'b' }) }).key,
  );
});

it('переименование страницы не сбрасывает её тренд', () => {
  expect(scanIdentity({ kind: 'page', page: page({ id: 'a', name: 'old' }) }).key).toBe(
    scanIdentity({ kind: 'page', page: page({ id: 'a', name: 'new' }) }).key,
  );
});

it('выделение сравнивается по множеству корней, а не порядку', () => {
  const p = page();
  const a = rectangle();
  const b = rectangle();
  const key = (nodes: SceneNode[]) => scanIdentity({ kind: 'selection', page: p, nodes }).key;
  expect(key([a, b])).toBe(key([b, a, a]));
  expect(key([a])).not.toBe(key([b]));
});
