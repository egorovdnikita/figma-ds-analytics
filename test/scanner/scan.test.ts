import { afterEach, expect, it, vi } from 'vitest';
import type { MainMessage, UiMessage } from '../../src/shared/messages';
import { component, document, instance, page, tree } from '../factories/node';

afterEach(() => vi.unstubAllGlobals());

it('реальный обработчик скана считает верхний инстанс и его источник', async () => {
  const master = { ...component(), key: 'master', remote: true };
  const outer = tree(instance(), [instance()]);
  const getMaster = vi.fn().mockResolvedValue(master);
  outer.getMainComponentAsync = getMaster;
  const disconnected = instance({ name: 'Без мастера' });
  const currentPage = page({ children: [outer, disconnected] });
  const messages: MainMessage[] = [];
  const ui = {
    onmessage: (message: UiMessage): void => {
      void message;
    },
    postMessage: (message: MainMessage): void => {
      messages.push(message);
    },
  };
  vi.stubGlobal('__html__', '');
  vi.stubGlobal('figma', {
    root: { ...document([currentPage]), getPluginData: () => '', setPluginData: vi.fn() },
    currentPage,
    ui,
    showUI: vi.fn(),
    clientStorage: { setAsync: vi.fn().mockResolvedValue(undefined) },
    variables: {
      getLocalVariableCollectionsAsync: vi.fn().mockResolvedValue([]),
      getLocalVariablesAsync: vi.fn().mockResolvedValue([]),
    },
    teamLibrary: { getAvailableLibraryVariableCollectionsAsync: vi.fn().mockResolvedValue([]) },
  });
  await import('../../src/main/index');
  ui.onmessage({ type: 'ui/scan-requested', scope: 'page' });
  await vi.waitFor(() =>
    expect(messages.some((message) => message.type === 'main/scan-finished')).toBe(true),
  );
  const finished = messages.find((message) => message.type === 'main/scan-finished');
  expect(finished?.report.adoption.instancesCounted).toBe(2);
  expect(finished?.report.adoption.fromLibrary).toBe(1);
  expect(finished?.report.adoption.unknown).toBe(1);
  expect(
    finished?.report.adoption.masters.find((item) => item.origin === 'unknown')?.places[0]?.nodeId,
  ).toBe(disconnected.id);
  expect(getMaster).toHaveBeenCalledOnce();
});
