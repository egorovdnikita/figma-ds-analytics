/**
 * Типизированная шина сообщений main <-> ui.
 * Строковые литералы в вызовах запрещены — только эти типы.
 */
import type { VariableUsage, ScanReport } from './adoption';
import type { Theme } from './theme';
import type { ScanScope } from './types';

/** ui -> main */
export type UiMessage =
  | { readonly type: 'ui/ready' }
  | { readonly type: 'ui/scan-requested'; readonly scope: ScanScope }
  | { readonly type: 'ui/scan-cancelled' }
  | {
      readonly type: 'ui/tokens-search';
      readonly requestId: number;
      readonly query: string;
      readonly offset: number;
    }
  /** Тема, выбранная вручную, — запомнить для следующих запусков. */
  | { readonly type: 'ui/theme-chosen'; readonly theme: Theme }
  | { readonly type: 'ui/reveal'; readonly nodeId: string; readonly pageId: string };

/** main -> ui */
export type MainMessage =
  | {
      readonly type: 'main/booted';
      readonly fileName: string;
      /** Охват прошлого запуска — чтобы не выбирать его каждый раз заново. */
      readonly lastScope: ScanScope | null;
      /** Тема, выбранная вручную; `null` — следовать за Figma. */
      readonly theme: Theme | null;
    }
  | {
      readonly type: 'main/scan-progress';
      readonly nodesVisited: number;
      readonly pagesDone: number;
      readonly pagesTotal: number;
      readonly currentPageName: string;
      readonly detail?: string;
    }
  | {
      readonly type: 'main/tokens-found';
      readonly requestId: number;
      readonly query: string;
      readonly offset: number;
      readonly total: number;
      readonly items: readonly VariableUsage[];
    }
  | { readonly type: 'main/scan-finished'; readonly report: ScanReport }
  | { readonly type: 'main/error'; readonly message: string };
