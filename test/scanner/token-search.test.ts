import { afterEach, expect, it, vi } from 'vitest';
import { setupScan } from '../helpers/scan';
import { rectangle, variableAlias } from '../factories/node';

afterEach(() => vi.unstubAllGlobals());

it('обработчик ищет за пределами топа и возвращает requestId с ограниченной страницей', async () => {
  const variables = Array.from(
    { length: 125 },
    (_, i) =>
      ({ id: String(i), name: `token-${i}`, variableCollectionId: 'c', remote: false }) as Variable,
  );
  const h = await setupScan(
    variables.map((v) => rectangle({ boundVariables: { width: variableAlias(v.id) } })),
    {
      getLocalVariablesAsync: () => Promise.resolve(variables),
    },
  );
  h.send({ type: 'ui/scan-requested', scope: 'page' });
  expect((await h.finished()).adoption.topVariables).toHaveLength(60);
  h.send({ type: 'ui/tokens-search', requestId: 7, query: 'token-124', offset: 0 });
  const result = h.messages.find((m) => m.type === 'main/tokens-found');
  expect(result).toMatchObject({ requestId: 7, total: 1, items: [{ id: '124' }] });
  h.send({ type: 'ui/tokens-search', requestId: 8, query: '', offset: 100 });
  const last = h.messages[h.messages.length - 1];
  expect(last).toMatchObject({ type: 'main/tokens-found', requestId: 8, total: 125, offset: 100 });
  if (last?.type === 'main/tokens-found') expect(last.items).toHaveLength(25);
});
