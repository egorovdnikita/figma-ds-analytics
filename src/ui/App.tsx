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
import {
  Button,
  Chip,
  Pill,
  Progress,
  Segmented,
  statusAttrs,
  ThemeButton,
  type Tint,
} from './parts/primitives';
import { Icon } from './parts/icon';
import { ComponentsScreen, SummaryScreen, TokensScreen, type MasterFilter } from './parts/report';
import { chooseTheme, currentTheme } from './theme';
import { Mascot } from './parts/mascot';

function send(message: UiMessage): void {
  parent.postMessage({ pluginMessage: message }, '*');
}

const TABS = ['Сводка', 'Компоненты', 'Токены'] as const;
type Tab = (typeof TABS)[number];

const TAB_ICONS: Readonly<Record<Tab, IconName>> = {
  Сводка: 'graph-up',
  Компоненты: 'widget',
  Токены: 'palette',
};

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
      <header className="shrink-0 border-b border-line-subtle px-6 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 text-caption-l text-ink-soft">
            <span data-tint="violet" className="tint-ink">
              <Icon name="widget" />
            </span>
            <span>{report.scope}</span>
            <span aria-hidden>/</span>
            <span className="tabular-nums">{report.nodesVisited.toLocaleString('ru')} слоёв</span>
            {report.cancelled && <Pill tone="warn">остановлено</Pill>}
          </p>
          {/* Отрицательный отступ: кнопка 32 не раздвигает строку крошек. */}
          <div className="-my-2 -mr-2">
            <ThemeButton theme={theme} onToggle={toggleTheme} />
          </div>
        </div>

        {/* Имя файла — отдельной строкой во всю ширину: рядом с кнопкой на
            480px оно схлопывалось в «Дизайн…». */}
        <h1 className="mt-2 truncate text-h4 font-semibold tracking-tight">{report.fileName}</h1>

        <nav aria-label="Разделы отчёта" className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1">
          {TABS.map((name) => {
            const count = countFor(name, report);
            return (
              <Chip
                key={name}
                active={tab === name}
                icon={TAB_ICONS[name]}
                {...(count === null ? {} : { count })}
                onClick={() => {
                  if (name === 'Компоненты') setComponentFilter('all');
                  setTab(name);
                }}
              >
                {name}
              </Chip>
            );
          })}
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
      <footer className="flex shrink-0 items-center gap-3 border-t border-line-subtle px-6 py-3">
        <div className="min-w-0 flex-1">
          <Segmented options={SCOPES} value={scope} onChange={setScope} />
        </div>
        <Button size="sm" onClick={start} icon="refresh">
          Ещё раз
        </Button>
      </footer>
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
            Как файл живёт
            <br />
            на дизайн-системе
          </h1>
          <p className="start-description mt-3 max-w-[360px] text-body-l leading-relaxed text-ink-soft">
            Компоненты из библиотеки, локальные копии и покрытие токенами — в одном отчёте.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Что проверить"
          className="start-scopes mt-6 grid shrink-0 grid-cols-3 gap-2"
        >
          {SCOPES.map((item) => (
            <button
              key={item.value}
              role="radio"
              aria-checked={scope === item.value}
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
                  <span className="scope-preview-row text-ink-faint">
                    <span className="scope-preview-mark scope-preview-mark-muted" />
                    <span className="scope-preview-line" />
                  </span>
                </span>
              </span>
              <span className="flex h-8 shrink-0 items-center justify-center">{item.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-caption-l text-ink-faint">
          {SCOPES.find((item) => item.value === scope)?.hint}
        </p>
      </div>

      <div className="shrink-0 px-6 pb-5 pt-4">
        {running && progress !== null && (
          <div className="mb-4">
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
        {error !== null && (
          <p
            className="mb-3 text-center text-caption-l leading-snug text-status-ink"
            {...statusAttrs('negative')}
          >
            {error}
          </p>
        )}
        {running ? (
          <Button variant="raised" size="lg" onClick={onCancel} icon="stop-circle" wide>
            Остановить
          </Button>
        ) : (
          <Button size="lg" onClick={onStart} icon="play" wide>
            Проверить
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

/** Счётчик на вкладке: сразу видно, где есть что смотреть, до перехода. */
function countFor(tab: Tab, report: ScanReport): number | null {
  switch (tab) {
    case 'Компоненты':
      return report.adoption.masters.length;
    case 'Токены':
      return report.adoption.topVariables.length || report.adoption.collections.length;
    case 'Сводка':
      return null;
  }
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
