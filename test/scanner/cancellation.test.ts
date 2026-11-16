import { afterEach, expect, it, vi } from 'vitest';
import { setupScan } from '../helpers/scan';
import { instance, rectangle, variableAlias } from '../factories/node';
import { VariableResolver } from '../../src/main/scanner/variables';

afterEach(() => vi.unstubAllGlobals());

it('отмена во время мастеров не запускает остальные запросы и не сохраняет снимок', async () => {
  const a = instance();
  const b = instance();
  const h = await setupScan([a, b]);
  b.getMainComponentAsync = () => {
    h.send({ type: 'ui/scan-cancelled' });
    return Promise.resolve(null);
  };
  const next = vi.fn().mockResolvedValue(null);
  a.getMainComponentAsync = next;
  h.send({ type: 'ui/scan-requested', scope: 'page' });
  expect((await h.finished()).cancelled).toBe(true);
  expect(next).not.toHaveBeenCalled();
  expect(h.root.setPluginData).not.toHaveBeenCalled();
  expect(h.library).not.toHaveBeenCalled();
});

it('отмена во время переменных не запускает следующие id и мастера', async () => {
  const node = rectangle({
    boundVariables: { width: variableAlias('a'), height: variableAlias('b') },
  });
  const request = vi.fn((): Promise<Variable | null> => {
    h.send({ type: 'ui/scan-cancelled' });
    return Promise.resolve(null);
  });
  const h = await setupScan([node], { getVariableByIdAsync: request });
  h.send({ type: 'ui/scan-requested', scope: 'page' });
  expect((await h.finished()).cancelled).toBe(true);
  expect(request).toHaveBeenCalledTimes(1);
  expect(h.root.setPluginData).not.toHaveBeenCalled();
});

it('отмена после получения переменной не начинает загрузку её коллекции', async () => {
  let cancelled = false;
  const collection = vi.fn().mockResolvedValue(null);
  const resolver = await VariableResolver.build({
    getLocalVariableCollectionsAsync: () => Promise.resolve([]),
    getLocalVariablesAsync: () => Promise.resolve([]),
    getVariableByIdAsync: () => {
      cancelled = true;
      return Promise.resolve({ id: 'a', remote: true, variableCollectionId: 'c' } as Variable);
    },
    getVariableCollectionByIdAsync: collection,
  });
  await resolver.hydrate(['a', 'b'], () => cancelled);
  expect(collection).not.toHaveBeenCalled();
});

it('повторный запрос не сбрасывает отмену работающего скана', async () => {
  let resolve: ((value: Variable[]) => void) | undefined;
  const request = vi.fn(
    () =>
      new Promise<Variable[]>((r) => {
        resolve = r;
      }),
  );
  const h = await setupScan([], { getLocalVariablesAsync: request });
  h.send({ type: 'ui/scan-requested', scope: 'page' });
  await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  h.send({ type: 'ui/scan-cancelled' });
  h.send({ type: 'ui/scan-requested', scope: 'page' });
  resolve?.([]);
  expect((await h.finished()).cancelled).toBe(true);
  expect(request).toHaveBeenCalledTimes(1);
});
