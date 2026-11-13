/**
 * UI плагина. Здесь нет `figma.*` — только сообщения через shared/messages.
 *
 * Стартовый экран центрирован вокруг одного действия. Дальше — сводка,
 * из неё переходы в таблицы, из таблиц — карточки с переходом к слою.
 */
import { useEffect, useState } from 'react';
import type { ScanReport } from '../shared/adoption';
import type { MainMessage, UiMessage } from '../shared/messages';
import { oppositeTheme, type Theme } from '../shared/theme';
import type { ScanScope } from '../shared/types';
import type { IconName } from './icons';
import { Button, Progress, statusAttrs, ThemeButton, type Tint } from './parts/primitives';
import { Icon } from './parts/icon';
import { ComponentsScreen, SummaryScreen, TokensScreen, type MasterFilter } from './parts/report';
import { chooseTheme, currentTheme } from './theme';
import { Mascot } from './parts/mascot';

function send(message: UiMessage): void {
  parent.postMessage({ pluginMessage: message }, '*');
}

const TABS = ['Сводка', 'Компоненты', 'Токены'] as const;
type Tab = (typeof TABS)[number];

const SCOPES: readonly {
  value: ScanScope;
  label: string;
  hint: string;
  icon: IconName;
  tint: Tint;
}[] = [
  {
    value: 'selection',
    label: 'Выделение',
    hint: 'Только выделенные слои',
    icon: 'cursor-square',
    tint: 'violet',
  },
  {
    value: 'page',
    label: 'Страница',
    hint: 'Текущая страница целиком',
    icon: 'document',
    tint: 'blue',
  },
  {
    value: 'file',
    label: 'Весь файл',
    hint: 'Все страницы по очереди — дольше',
    icon: 'folder',
    tint: 'orange',
  },
];

interface Progressing {
  nodes: number;
  pagesDone: number;
  pagesTotal: number;
  page: string;
}

export function App(): JSX.Element {
  const [fileName, setFileName] = useState<string | null>(null);
  const [scope, setScope] = useState<ScanScope>('page');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progressing | null>(null);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [tab, setTab] = useState<Tab>('Сводка');
  const [componentFilter, setComponentFilter] = useState<MasterFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    function onMessage(event: MessageEvent<{ pluginMessage?: MainMessage }>): void {
      const message = event.data.pluginMessage;
      if (message === undefined) return;

      switch (message.type) {
        case 'main/booted':
          setFileName(message.fileName);
          if (message.lastScope !== null) setScope(message.lastScope);
          if (message.theme !== null) chooseTheme(document.documentElement, message.theme);
          return;
        case 'main/scan-progress':
          setProgress({
            nodes: message.nodesVisited,
            pagesDone: message.pagesDone,
            pagesTotal: message.pagesTotal,
            page: message.currentPageName,
          });
          return;
        case 'main/scan-finished':
          setRunning(false);
          setProgress(null);
          setTab('Сводка');
          setReport(message.report);
          return;
        case 'main/error':
          setRunning(false);
          setProgress(null);
          setError(message.message);
          return;
      }
    }
    window.addEventListener('message', onMessage);
    send({ type: 'ui/ready' });
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const reveal = (nodeId: string, pageId: string): void => {
    send({ type: 'ui/reveal', nodeId, pageId });
  };

  const toggleTheme = (): void => {
    const next = oppositeTheme(currentTheme(document.documentElement));
    chooseTheme(document.documentElement, next);
    send({ type: 'ui/theme-chosen', theme: next });
  };

  const start = (): void => {
    setError(null);
    setReport(null);
    setProgress(null);
    setRunning(true);
    send({ type: 'ui/scan-requested', scope });
  };

  if (report === null) {
    return (
      <Start
        fileName={fileName}
        scope={scope}
        setScope={setScope}
        running={running}
        progress={progress}
        error={error}
        onStart={start}
        onCancel={() => send({ type: 'ui/scan-cancelled' })}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="relative flex h-screen flex-col bg-panel text-ink">
      <header className="shrink-0 border-b border-line-subtle px-6 pb-4 pt-5">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1
              className="line-clamp-2 text-h5 font-semibold tracking-tight"
              title={report.fileName}
            >
              {report.fileName}
            </h1>
            <p className="mt-2 truncate text-caption-l text-ink-soft">
              {report.scope.charAt(0).toUpperCase() + report.scope.slice(1)} ·{' '}
              {report.nodesVisited.toLocaleString('ru')} слоёв
              {report.cancelled ? ' · остановлено' : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              title="Повторить проверку"
              aria-label="Повторить проверку"
              className="flex h-10 w-10 items-center justify-center rounded-sm bg-panel-card text-ink-soft hover:bg-hover hover:text-ink"
              onClick={() => {
                setReport(null);
                setProgress(null);
                setError(null);
              }}
            >
              <Icon name="refresh" />
            </button>
            <ThemeButton theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
        <nav aria-label="Разделы отчёта" className="mt-4 flex rounded-md bg-panel-card p-1">
          {TABS.map((name) => (
            <button
              key={name}
              aria-pressed={tab === name}
              className={`flex h-10 min-w-0 flex-1 items-center justify-center rounded-sm px-3 text-body-m transition-colors ${tab === name ? 'segment-selected font-medium' : 'text-ink-soft hover:bg-hover'}`}
              onClick={() => {
                if (name === 'Компоненты') setComponentFilter('all');
                setTab(name);
              }}
            >
              {name}
            </button>
          ))}
        </nav>
      </header>

      <main className="panel-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="scroll-content pb-5 pt-4">
          <Content
            tab={tab}
            report={report}
            componentFilter={componentFilter}
            onGoTo={(next, filter) => {
              if (filter !== undefined) setComponentFilter(filter);
              setTab(next);
            }}
            onReveal={reveal}
          />
        </div>
      </main>
    </div>
  );
}

/** Стартовый экран: одно действие по центру, всё остальное — второстепенно. */
function Start({
  fileName,
  scope,
  setScope,
  running,
  progress,
  error,
  onStart,
  onCancel,
  theme,
  onToggleTheme,
}: {
  fileName: string | null;
  scope: ScanScope;
  setScope: (scope: ScanScope) => void;
  running: boolean;
  progress: Progressing | null;
  error: string | null;
  onStart: () => void;
  onCancel: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}): JSX.Element {
  return (
    <div
      className="start-screen relative flex h-screen flex-col overflow-hidden bg-panel text-ink"
      data-compact={running || error !== null}
    >
      <header className="flex shrink-0 items-center gap-2 px-6 pt-4">
        <span data-tint="violet" className="tint-ink">
          <Icon name="widget" />
        </span>
        <p className="min-w-0 flex-1 truncate text-caption-l text-ink-soft">
          {fileName ?? 'Дизайн-система'}
        </p>
        <ThemeButton theme={theme} onToggle={onToggleTheme} />
      </header>

      <div className="start-content min-h-0 flex-1 px-6">
        <div className="start-hero flex shrink-0 flex-col items-center text-center">
          <Mascot />
          <h1 className="start-title text-balance font-semibold tracking-tight">
            {running ? (
              scope === 'file' || (progress?.pagesTotal ?? 0) > 1 ? (
                'Проверяем файл'
              ) : scope === 'selection' ? (
                'Проверяем выделение'
              ) : (
                'Проверяем страницу'
              )
            ) : error !== null ? (
              'Проверка не завершена'
            ) : (
              <>
                Как файл живёт
                <br />
                на дизайн-системе
              </>
            )}
          </h1>
          <p
            className={`${running || error !== null ? 'hidden' : ''} start-description mt-3 max-w-[360px] text-body-l leading-relaxed text-ink-soft`}
          >
            Компоненты из библиотеки, локальные копии и покрытие токенами — в одном отчёте.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Что проверить"
          className={`${running ? 'hidden' : 'grid'} start-scopes mt-6 shrink-0 grid-cols-3 gap-2`}
        >
          {SCOPES.map((item) => (
            <button
              key={item.value}
              role="radio"
              aria-checked={scope === item.value}
              tabIndex={scope === item.value ? 0 : -1}
              onKeyDown={(event) => {
                const index = SCOPES.findIndex((s) => s.value === item.value);
                let next: number;
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
                  next = (index + 1) % SCOPES.length;
                else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
                  next = (index + SCOPES.length - 1) % SCOPES.length;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = SCOPES.length - 1;
                else return;
                event.preventDefault();
                const option = SCOPES[next];
                if (option) {
                  setScope(option.value);
                  const radios =
                    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                      '[role="radio"]',
                    );
                  radios?.item(next).focus();
                }
              }}
              title={item.hint}
              disabled={running}
              onClick={() => setScope(item.value)}
              className={`scope-choice flex h-32 flex-col overflow-hidden rounded-lg border-2 text-body-m transition-colors ${scope === item.value ? 'border-accent bg-accent text-accent-on' : 'border-transparent bg-panel-card text-ink hover:border-line'} disabled:opacity-50`}
            >
              <span
                aria-hidden="true"
                className={`scope-preview scope-preview-${item.value} flex min-h-0 flex-1 items-center justify-center rounded-md bg-surface`}
              >
                <span className="scope-preview-layout">
                  <span className="scope-preview-row">
                    <span data-tint={item.tint} className="tint-dot scope-preview-mark" />
                    <span className="scope-preview-line" />
                  </span>
                  <span className="scope-preview-row text-ink-soft">
                    <span className="scope-preview-mark scope-preview-mark-muted" />
                    <span className="scope-preview-line" />
                  </span>
                </span>
              </span>
              <span className="flex h-8 shrink-0 items-center justify-center">{item.label}</span>
            </button>
          ))}
        </div>
        <p className={`${running ? 'hidden' : ''} mt-3 text-center text-caption-l text-ink-soft`}>
          {SCOPES.find((item) => item.value === scope)?.hint}
        </p>
        {running && progress !== null && (
          <div className="mt-6">
            <Progress
              done={progress.pagesTotal > 1 ? progress.pagesDone : progress.nodes}
              total={progress.pagesTotal > 1 ? progress.pagesTotal : Math.max(progress.nodes, 1)}
              headline={`${progress.nodes.toLocaleString('ru')} слоёв`}
              {...(progress.pagesTotal > 1
                ? {
                    caption: `${progress.page} · страница ${progress.pagesDone + 1} из ${progress.pagesTotal}`,
                  }
                : {})}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 px-6 pb-5 pt-4">
        {error !== null && (
          <p
            role="alert"
            className="mb-3 rounded-md bg-status-soft px-4 py-3 text-body-m leading-snug text-status-ink"
            {...statusAttrs('negative')}
          >
            {error}
          </p>
        )}
        {running ? (
          <Button variant="quiet" size="lg" onClick={onCancel} icon="stop-circle" wide>
            Остановить
          </Button>
        ) : (
          <Button size="lg" onClick={onStart} icon="play" wide>
            {error !== null ? 'Повторить проверку' : 'Проверить'}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Текущая тема панели. Меняется и от кнопки, и от самой Figma, поэтому
 * источник правды — атрибут `data-theme` на корне, а не состояние React.
 */
function useTheme(): Theme {
  const root = document.documentElement;
  const [theme, setTheme] = useState<Theme>(() => currentTheme(root));
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(currentTheme(root)));
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      observer.disconnect();
    };
  }, [root]);
  return theme;
}

function Content({
  tab,
  report,
  componentFilter,
  onGoTo,
  onReveal,
}: {
  tab: Tab;
  report: ScanReport;
  componentFilter: MasterFilter;
  onGoTo: (tab: Tab, filter?: MasterFilter) => void;
  onReveal: (nodeId: string, pageId: string) => void;
}): JSX.Element {
  switch (tab) {
    case 'Сводка':
      return <SummaryScreen report={report} onGoTo={onGoTo} />;
    case 'Компоненты':
      return (
        // key сбрасывает состояние экрана при смене фильтра снаружи —
        // иначе переход «из сводки в отфильтрованный список» ничего не менял.
        <ComponentsScreen
          key={componentFilter}
          adoption={report.adoption}
          initialFilter={componentFilter}
          onReveal={onReveal}
        />
      );
    case 'Токены':
      return <TokensScreen adoption={report.adoption} onReveal={onReveal} />;
  }
}
