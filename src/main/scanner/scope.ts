import type { ScanTarget } from './traversal';

/** Идентичность замера не зависит от названия страницы или порядка выделения. */
export function scanIdentity(target: ScanTarget): { key: string; label: string } {
  switch (target.kind) {
    case 'file':
      return { key: 'file', label: 'весь файл' };
    case 'page':
      return { key: `page:${target.page.id}`, label: `страница «${target.page.name}»` };
    case 'selection':
      return {
        key: `selection:${target.page.id}:${JSON.stringify([...new Set(target.nodes.map((node) => node.id))].sort())}`,
        label: `выделение на странице «${target.page.name}»`,
      };
  }
}
