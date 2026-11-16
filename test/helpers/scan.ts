import { expect, vi } from 'vitest';
import type { MainMessage, UiMessage } from '../../src/shared/messages';
import type { VariablesGateway } from '../../src/main/scanner/variables';
import { document, page } from '../factories/node';

export async function setupScan(nodes: SceneNode[], variables: Partial<VariablesGateway> = {}) {
  vi.resetModules();
  const currentPage = page({ children: nodes });
  const messages: MainMessage[] = [];
  const root = { ...document([currentPage]), getPluginData: () => '', setPluginData: vi.fn() };
  const ui = {
    onmessage: (_message: UiMessage): void => {
      void _message; /* назначается entry */
    },
    postMessage: (message: MainMessage): void => {
      messages.push(message);
    },
  };
  const library = vi.fn().mockResolvedValue([]);
  vi.stubGlobal('__html__', '');
  vi.stubGlobal('figma', {
    root,
    currentPage,
    ui,
    showUI: vi.fn(),
    clientStorage: { setAsync: vi.fn().mockResolvedValue(undefined) },
    variables: {
      getLocalVariableCollectionsAsync: () => Promise.resolve([]),
      getLocalVariablesAsync: () => Promise.resolve([]),
      getVariableByIdAsync: () => Promise.resolve(null),
      getVariableCollectionByIdAsync: () => Promise.resolve(null),
      ...variables,
    },
    teamLibrary: { getAvailableLibraryVariableCollectionsAsync: library },
  });
  await import('../../src/main/index');
  return {
    messages,
    root,
    library,
    currentPage,
    send: (message: UiMessage): void => ui.onmessage(message),
    finished: async () => {
      await vi.waitFor(() =>
        expect(messages.some((m) => m.type === 'main/scan-finished')).toBe(true),
      );
      const message = messages.find((m) => m.type === 'main/scan-finished');
      if (!message) throw new Error('Нет отчёта');
      return message.report;
    },
  };
}
