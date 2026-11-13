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
  ChoiceCard,
  Pill,
  Progress,
  Segmented,
  statusAttrs,
  ThemeButton,
} from './parts/primitives';
import { ComponentsScreen, SummaryScreen, TokensScreen, type MasterFilter } from './parts/report';
import { chooseTheme, currentTheme } from './theme';

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

const SCOPES: readonly { value: ScanScope; label: string; hint: string; icon: IconName }[] = [
  { value: 'selection', label: 'выделение', hint: 'Только выделенные слои', icon: 'cursor-square' },
  { value: 'page', label: 'страница', hint: 'Текущая страница целиком', icon: 'document' },
  { value: 'file', label: 'весь файл', hint: 'Все страницы по очереди — дольше', icon: 'folder' },
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
    <div className="relative flex h-screen flex-col bg-canvas">
      <header className="shrink-0 px-4 pt-4">
        {/* Крошки над заголовком, как у веба HireHi: что проверено и сколько. */}
        <div className="flex items-center gap-2">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 text-body-m text-ink-soft">
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
        <h1 className="mt-1 truncate text-h4 font-semibold">{report.fileName}</h1>

        {/* Тулбар — одна белая панель, как сортировка и вид у HireHi: охват
            слева, повторная проверка справа. */}
        <div className="mt-3 flex items-center gap-1 rounded-md bg-surface p-1">
          <div className="min-w-0 flex-1">
            <Segmented options={SCOPES} value={scope} onChange={setScope} />
          </div>
          <Button size="sm" onClick={start} icon="refresh">
            Ещё раз
          </Button>
        </div>

        <nav className="-mx-1 mt-1 flex gap-1 overflow-x-auto px-1 pb-1">
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

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
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
  // Устроен как шаг онбординга (Snapchat, Cal AI): вопрос слева сверху,
  // варианты карточками, главное действие прижато к низу во всю ширину.
  return (
    <div className="relative flex h-screen flex-col bg-canvas">
      <div className="absolute right-2 top-2">
        <ThemeButton theme={theme} onToggle={onToggleTheme} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-10">
        {fileName !== null && <p className="truncate pr-8 text-body-m text-ink-soft">{fileName}</p>}
        <h1 className="mt-1 text-balance text-h4 font-semibold">
          проверим, как файл живёт на дизайн-системе
        </h1>
        <p className="mt-2 text-body-m leading-relaxed text-ink-soft">
          Сколько компонентов берётся из библиотеки, сколько сделано мимо неё и на чём держатся
          цвета.
        </p>

        <div role="radiogroup" aria-label="Что проверить" className="mt-6 flex flex-col gap-1">
          {SCOPES.map((item) => (
            <ChoiceCard
              key={item.value}
              icon={item.icon}
              title={item.label}
              hint={item.hint}
              selected={scope === item.value}
              disabled={running}
              onSelect={() => setScope(item.value)}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4 pt-3">
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
