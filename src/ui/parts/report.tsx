/**
 * Экраны отчёта. Три уровня: сводка → таблицы → карточка по клику.
 * Тексты бытовые: «токен», «копия», «библиотека», без терминов из кода.
 */
import { useMemo, useState } from 'react';
import {
  DISCONNECTED_LIBRARY,
  type Adoption,
  type CollectionUsage,
  type MasterUsage,
  type ScanReport,
  type VariableUsage,
} from '../../shared/adoption';
import { buildAdvice, verdict } from '../../shared/advice';
import { toMarkdown } from '../../shared/export';
import { plural, withCount } from '../../shared/plural';
import { deltaPoints, shortDate, type Trend } from '../../shared/snapshot';
import {
  AdviceRow,
  Aside,
  Button,
  Card,
  Chip,
  CopyButton,
  Delta,
  Empty,
  Facts,
  ListRow,
  Modal,
  Note,
  pct,
  Pill,
  Places,
  SearchInput,
  Section,
  StackedBar,
  statusAttrs,
  TintIcon,
} from './primitives';

/* ---------- 1. Сводка ---------- */

export type MasterFilter = 'all' | 'library' | 'local' | 'unknown';

export function SummaryScreen({
  report,
  onGoTo,
}: {
  report: ScanReport;
  onGoTo: (tab: 'Компоненты' | 'Токены', filter?: MasterFilter) => void;
}): JSX.Element {
  const adoption = report.adoption;
  const trend = report.trend;
  const instances = adoption.instancesCounted;
  const tokenNodes =
    adoption.nodesOnLibraryVariable + adoption.nodesOnLocalVariable + adoption.nodesWithoutVariable;
  const onTokens = adoption.nodesOnLibraryVariable + adoption.nodesOnLocalVariable;

  const state = verdict(adoption);
  const advice = buildAdvice(adoption);
  const delta = trendDelta(adoption, trend);

  return (
    <div className="summary-screen flex flex-col gap-2">
      {/* Одна крупная цифра с бейджем изменения, как баланс в Phantom, и
          вывод фразой под ней, как в Lifesum: цифра без вывода заставляет
          гадать, хорошо это или плохо. */}
      <section className="relative pb-4 pt-1">
        <div className="absolute right-0 top-1">
          <TintIcon name="graph-up" tint="green" />
        </div>
        <p className="pr-12 text-body-l text-ink-soft">компоненты из библиотеки</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="summary-value font-semibold tabular-nums">
            {pct(adoption.fromLibrary, instances)}
          </span>
          {delta !== null && trend.previous !== null && (
            <Delta points={delta} since={shortDate(trend.previous.at)} />
          )}
        </div>
        <p className="mt-2 flex items-center gap-2 text-body-l text-ink-soft">
          <span
            data-tint={state.tone === 'good' ? 'green' : 'orange'}
            className="tint-dot h-1.5 w-1.5 shrink-0 rounded-pill"
            aria-hidden
          />
          {state.text}
        </p>
      </section>

      <ul className="list-surface">
        <ListRow
          leading={<TintIcon name="palette" tint="blue" />}
          title="Слои на токенах"
          value={pct(onTokens, tokenNodes)}
          onClick={() => onGoTo('Токены')}
        />
        <ListRow
          leading={<TintIcon name="widget" tint="violet" />}
          title="Компоненты"
          value={adoption.mastersTotal.toLocaleString('ru')}
          onClick={() => onGoTo('Компоненты')}
        />
        <ListRow
          leading={<TintIcon name="copy" tint="orange" />}
          title="Копии"
          value={instances.toLocaleString('ru')}
          onClick={() => onGoTo('Компоненты')}
        />
        <ListRow
          leading={<TintIcon name="folder" tint="pink" />}
          title="Коллекции токенов"
          value={adoption.collections.length.toLocaleString('ru')}
          onClick={() => onGoTo('Токены')}
        />
      </ul>

      {advice.length > 0 && (
        <Section title="с чего начать">
          <Card plain className="list-surface">
            {advice.map((item) => {
              // Через локальную константу: внутри замыкания TypeScript не
              // удерживает сужение по `item.target.kind`.
              const target = item.target;
              const onClick =
                target.kind === 'components'
                  ? () => onGoTo('Компоненты', target.filter)
                  : target.kind === 'tokens'
                    ? () => onGoTo('Токены')
                    : undefined;

              return (
                <AdviceRow
                  key={item.id}
                  title={item.title}
                  value={item.value}
                  hint={item.hint}
                  {...(onClick === undefined ? {} : { onClick })}
                />
              );
            })}
          </Card>
        </Section>
      )}

      <TrendCard adoption={adoption} trend={trend} />

      <Section title="откуда компоненты" onOpen={() => onGoTo('Компоненты')}>
        <Card plain>
          <StackedBar
            segments={[
              {
                label: 'Из библиотеки',
                value: adoption.fromLibrary,
                className: 'bg-[var(--detail-violet)]',
                onClick: () => onGoTo('Компоненты', 'library'),
              },
              {
                label: 'Свои в этом файле',
                value: adoption.local,
                className: 'bg-status',
                status: 'warning',
                onClick: () => onGoTo('Компоненты', 'local'),
              },
              {
                label: 'Библиотека отключена',
                value: adoption.unknown,
                className: 'bg-ink-faint',
                onClick: () => onGoTo('Компоненты', 'unknown'),
              },
            ]}
          />
          {adoption.unknown > 0 && (
            <div className="mt-3">
              <Note>
                «Библиотека отключена» — копии, чей источник файлу больше не доступен. Это и есть
                зависимость от чужой системы.
              </Note>
            </div>
          )}
        </Card>
      </Section>

      <Section title="откуда токены" onOpen={() => onGoTo('Токены')}>
        <Card plain>
          <StackedBar
            segments={[
              {
                label: 'Из библиотеки',
                value: adoption.nodesOnLibraryVariable,
                className: 'bg-[var(--detail-blue)]',
              },
              {
                label: 'Свои',
                value: adoption.nodesOnLocalVariable,
                className: 'bg-status',
                status: 'warning',
              },
              {
                label: 'Без токена',
                value: adoption.nodesWithoutVariable,
                className: 'bg-ink-faint',
              },
            ]}
          />
        </Card>
      </Section>

      {adoption.librarySourcesAvailable && adoption.libraries.length > 0 && (
        <Section title="библиотеки">
          <Card plain>
            <ul className="list-surface">
              {adoption.libraries.map((library) => (
                <ListRow
                  key={library.libraryName}
                  leading={<TintIcon name="folder" tint="green" />}
                  title={library.libraryName}
                  value={library.variables.toLocaleString('ru')}
                  valueHint={plural(library.variables, 'токен', 'токена', 'токенов')}
                />
              ))}
            </ul>
          </Card>
        </Section>
      )}

      {!adoption.librarySourcesAvailable && (
        <Section title="библиотеки">
          <Card>
            <Note>Не удалось прочитать — это не значит, что библиотек нет.</Note>
          </Card>
        </Section>
      )}

      <Section title="забрать с собой">
        <Card>
          <Note>
            Отчёт в Markdown: вердикт, главные цифры, приоритеты и история. Вставляется в документ
            или сообщение как есть.
          </Note>
          <div className="mt-3">
            <CopyButton text={toMarkdown(report, new Date())} label="Скопировать отчёт" wide />
          </div>
        </Card>
      </Section>
    </div>
  );
}

/**
 * Тренд по охвату.
 *
 * Паспорт: «разовый скан — инструмент, тренд — продукт». Одна точка ещё
 * не тренд, и притворяться, что она о чём-то говорит, не надо — карточка
 * тогда честно объясняет, что сравнивать не с чем.
 */
function trendDelta(adoption: Adoption, trend: Trend): number | null {
  return deltaPoints(
    { part: adoption.fromLibrary, total: adoption.instancesCounted },
    trend.previous === null
      ? null
      : { part: trend.previous.fromLibrary, total: trend.previous.instances },
  );
}

function TrendCard({ adoption, trend }: { adoption: Adoption; trend: Trend }): JSX.Element {
  const delta = trendDelta(adoption, trend);

  if (trend.previous === null || delta === null) {
    return (
      <Section title="тренд">
        <Card>
          <Note>
            Это первый замер по этому охвату. Прогоните ещё раз через несколько дней — появится
            сравнение.
          </Note>
        </Card>
      </Section>
    );
  }

  const series = trend.points.map((point) =>
    point.instances === 0 ? 0 : (point.fromLibrary / point.instances) * 100,
  );

  const low = Math.max(0, Math.floor(Math.min(...series) / 10) * 10 - 5);
  const high = Math.min(100, Math.ceil(Math.max(...series) / 10) * 10 + 5);
  const points = series
    .map(
      (value, i) =>
        `${8 + (i / Math.max(series.length - 1, 1)) * 384},${88 - ((value - low) / Math.max(high - low, 1)) * 72}`,
    )
    .join(' ');
  const first = trend.points[0];
  const last = trend.points[trend.points.length - 1];

  return (
    <Section title="тренд">
      <Card plain className="trend-panel list-surface">
        <div className="flex items-start justify-between gap-3 pt-3">
          <div>
            <p className="text-body-l text-ink-soft">Компоненты из библиотеки</p>
            <p className="mt-2 text-h2 font-semibold tracking-tight tabular-nums">
              {pct(adoption.fromLibrary, adoption.instancesCounted)}
            </p>
          </div>
          <TintIcon name="graph-up" tint="violet" />
        </div>
        <div className="mt-2">
          <Delta points={delta} since={shortDate(trend.previous.at)} />
        </div>
        <svg
          className="my-3 block w-full overflow-visible"
          viewBox="0 0 400 104"
          role="img"
          aria-label={`Покрытие компонентами из библиотеки: ${series.map((v) => `${Math.round(v)}%`).join(', ')}`}
        >
          <defs>
            <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--detail-violet)" stopOpacity=".16" />
              <stop offset="100%" stopColor="var(--detail-violet)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M8 96H392" stroke="var(--surface-base-border-subtle)" fill="none" />
          <polygon points={`8,96 ${points} 392,96`} fill="url(#trend-area)" />
          <polyline
            points={points}
            stroke="var(--detail-violet)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {series.map((value, i) => (
            <circle
              key={i}
              cx={8 + (i / Math.max(series.length - 1, 1)) * 384}
              cy={88 - ((value - low) / Math.max(high - low, 1)) * 72}
              r={i === series.length - 1 ? 4 : 2}
              fill="var(--detail-violet)"
            />
          ))}
        </svg>
        <div className="flex justify-between text-caption-l text-ink-faint">
          <span>{first ? shortDate(first.at) : ''}</span>
          <span>{last ? shortDate(last.at) : ''}</span>
        </div>
        <p className="mt-4 pb-2 text-caption-l text-ink-soft">
          {withCount(trend.points.length, 'замер', 'замера', 'замеров')} · один снимок в день
        </p>
      </Card>
    </Section>
  );
}

/* ---------- 2. Компоненты ---------- */

const MASTER_FILTERS: readonly { value: MasterFilter; label: string }[] = [
  { value: 'all', label: 'все' },
  { value: 'library', label: 'из библиотеки' },
  { value: 'local', label: 'свои' },
  { value: 'unknown', label: 'без связи' },
];

const PAGE_SIZE = 25;

export function ComponentsScreen({
  adoption,
  initialFilter,
  onReveal,
}: {
  adoption: Adoption;
  initialFilter: MasterFilter;
  onReveal: (nodeId: string, pageId: string) => void;
}): JSX.Element {
  const [selected, setSelected] = useState<MasterUsage | null>(null);
  const [filter, setFilter] = useState<MasterFilter>(initialFilter);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return adoption.masters.filter(
      (master) =>
        (filter === 'all' || master.origin === filter) &&
        (needle === '' || master.name.toLowerCase().includes(needle)),
    );
  }, [adoption.masters, filter, query]);

  const countByOrigin = useMemo(() => {
    const counts: Record<MasterFilter, number> = { all: 0, library: 0, local: 0, unknown: 0 };
    for (const master of adoption.masters) {
      counts.all += 1;
      counts[master.origin] += 1;
    }
    return counts;
  }, [adoption.masters]);

  if (adoption.masters.length === 0) {
    return <Empty title="Копий компонентов нет" hint="В этом охвате не нашлось ни одной." />;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <SearchInput
          placeholder="Найти компонент"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setLimit(PAGE_SIZE);
          }}
        />
        {/* Ряд чипсов на полотне, как категории у HireHi; счётчик — сколько
            компонентов попадёт в список, до клика. */}
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {MASTER_FILTERS.map((option) => (
            <Chip
              key={option.value}
              active={filter === option.value}
              count={countByOrigin[option.value]}
              onClick={() => {
                setFilter(option.value);
                setLimit(PAGE_SIZE);
              }}
            >
              {option.label}
            </Chip>
          ))}
        </div>

        {visible.length === 0 ? (
          <Empty title="Ничего не нашлось" hint="Попробуйте другое название или снимите фильтр." />
        ) : (
          <Card plain>
            <ul className="list-surface">
              {visible.slice(0, limit).map((master) => (
                <ListRow
                  key={master.key}
                  onClick={() => setSelected(master)}
                  leading={<TintIcon name="widget" tint="violet" />}
                  title={master.name}
                  subtitle={<OriginText origin={master.origin} />}
                  value={master.instances.toLocaleString('ru')}
                  valueHint={pct(master.instances, adoption.instancesCounted)}
                />
              ))}
            </ul>

            {visible.length > limit && (
              <div className="mt-3 flex justify-center">
                <Button variant="quiet" onClick={() => setLimit(limit + PAGE_SIZE * 2)}>
                  Показать ещё · осталось {(visible.length - limit).toLocaleString('ru')}
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {selected !== null && (
        <Modal title={selected.name} caption="Компонент" onClose={() => setSelected(null)}>
          <Facts
            items={[
              { label: 'источник', value: <OriginPill origin={selected.origin} /> },
              { label: 'копий', value: selected.instances.toLocaleString('ru') },
              {
                label: 'доля всех копий',
                value: pct(selected.instances, adoption.instancesCounted),
              },
            ]}
          />
          <div className="mt-3">
            <Note>
              {selected.origin === 'library'
                ? 'Компонент берётся из подключённой библиотеки — так и должно быть.'
                : selected.origin === 'local'
                  ? 'Компонент собран прямо в этом файле, а не взят из библиотеки.'
                  : 'Источник недоступен: библиотека отключена от файла либо компонент удалён.'}
            </Note>
          </div>

          {/* Раздел отделён линией во всю ширину, как «описание» у HireHi. */}
          <div className="mt-5 border-t-2 border-dotted border-line-subtle" />
          <h4 className="mb-1 mt-3 text-caption-l text-ink-soft">
            где посмотреть{' '}
            {selected.instances > selected.places.length && (
              <span className="text-ink-faint">
                · {selected.places.length} из {selected.instances.toLocaleString('ru')}
              </span>
            )}
          </h4>
          <Places places={selected.places} onReveal={onReveal} />
        </Modal>
      )}
    </>
  );
}

/* ---------- 3. Токены ---------- */

type TokenView = 'collections' | 'variables';

const TOKEN_VIEWS: readonly { value: TokenView; label: string }[] = [
  { value: 'collections', label: 'коллекции' },
  { value: 'variables', label: 'токены' },
];

export function TokensScreen({
  adoption,
  onReveal,
}: {
  adoption: Adoption;
  onReveal: (nodeId: string, pageId: string) => void;
}): JSX.Element {
  const [view, setView] = useState<TokenView>('collections');
  const [selected, setSelected] = useState<VariableUsage | null>(null);

  if (adoption.collections.length === 0 && adoption.topVariables.length === 0) {
    return <Empty title="Токенов нет" hint="В файле не нашлось ни одной переменной." />;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {TOKEN_VIEWS.map((option) => (
            <Chip
              key={option.value}
              active={view === option.value}
              onClick={() => setView(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>

        {view === 'collections' ? (
          <CollectionsTable adoption={adoption} />
        ) : (
          <VariablesTable adoption={adoption} onSelect={setSelected} />
        )}
      </div>

      {selected !== null && (
        <Modal title={selected.name} caption="Токен" onClose={() => setSelected(null)}>
          <Facts
            items={[
              { label: 'коллекция', value: selected.collectionName || '—' },
              { label: 'слоёв', value: selected.nodes.toLocaleString('ru') },
              {
                label: plural(selected.pages, 'страница', 'страницы', 'страниц'),
                value: selected.pages,
              },
            ]}
          />
          <div className="mt-3">
            <Note>
              Столько мест сломается, если токен удалить или переименовать. Это и есть ответ на
              вопрос «можно ли его трогать».
            </Note>
          </div>

          {/* Раздел отделён линией во всю ширину, как «описание» у HireHi. */}
          <div className="mt-5 border-t-2 border-dotted border-line-subtle" />
          <h4 className="mb-1 mt-3 text-caption-l text-ink-soft">
            где посмотреть{' '}
            {selected.nodes > selected.places.length && (
              <span className="text-ink-faint">
                · {selected.places.length} из {selected.nodes.toLocaleString('ru')}
              </span>
            )}
          </h4>
          <Places places={selected.places} onReveal={onReveal} />
        </Modal>
      )}
    </>
  );
}

function CollectionsTable({ adoption }: { adoption: Adoption }): JSX.Element {
  if (adoption.collections.length === 0) {
    return <Empty title="Коллекций нет" />;
  }

  return (
    <>
      <Card plain>
        <ul className="list-surface">
          {adoption.collections.map((collection) => (
            <ListRow
              key={`${collection.name}-${collection.source}`}
              leading={<TintIcon name="palette" tint="pink" />}
              title={collection.name}
              subtitle={<SourceText collection={collection} />}
              value={collection.variables.toLocaleString('ru')}
              valueHint={plural(collection.variables, 'токен', 'токена', 'токенов')}
            />
          ))}
        </ul>
      </Card>
      <Aside>
        «Библиотека не подключена» значит, что токен используется, а его источник файлу недоступен.
      </Aside>
    </>
  );
}

/**
 * Токены по востребованности — основа impact analysis.
 *
 * Паспорт: «что сломается, если удалить этот токен» — до рефакторинга,
 * а не после. Число мест и есть цена вопроса.
 */
function VariablesTable({
  adoption,
  onSelect,
}: {
  adoption: Adoption;
  onSelect: (usage: VariableUsage) => void;
}): JSX.Element {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === '') return adoption.topVariables;
    return adoption.topVariables.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.collectionName.toLowerCase().includes(needle),
    );
  }, [adoption.topVariables, query]);

  if (adoption.topVariables.length === 0) {
    return <Empty title="Привязок к токенам нет" hint="В этом охвате ничего не привязано." />;
  }

  return (
    <>
      <SearchInput placeholder="Найти токен" value={query} onChange={setQuery} />

      {visible.length === 0 ? (
        <Empty title="Ничего не нашлось" hint="Попробуйте другое название." />
      ) : (
        <Card plain>
          <ul className="list-surface">
            {visible.map((item) => (
              <ListRow
                key={item.id}
                onClick={() => onSelect(item)}
                leading={<TokenMark />}
                title={item.name}
                subtitle={
                  <span className="text-ink-faint">
                    {item.collectionName || '—'} · {item.pages}{' '}
                    {plural(item.pages, 'страница', 'страницы', 'страниц')}
                  </span>
                }
                value={item.nodes.toLocaleString('ru')}
                valueHint={plural(item.nodes, 'слой', 'слоя', 'слоёв')}
              />
            ))}
          </ul>
        </Card>
      )}

      <Aside>
        Число слоёв — цена изменения: столько мест сломается, если токен удалить или переименовать.
      </Aside>
    </>
  );
}

/* ---------- мелочи ---------- */

/** Цветной знак токена без подложки. */
function TokenMark(): JSX.Element {
  return <TintIcon name="palette" tint="blue" />;
}

/** Источник коллекции: отключённая библиотека — предупреждение, а не норма. */
function SourceText({ collection }: { collection: CollectionUsage }): JSX.Element {
  if (collection.source === DISCONNECTED_LIBRARY) {
    return (
      <span className="text-status-ink" {...statusAttrs('warning')}>
        {collection.source}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-faint">
      {!collection.isLocal && (
        <span data-tint="green" className="tint-dot h-1 w-1 shrink-0 rounded-pill" aria-hidden />
      )}
      {collection.source}
    </span>
  );
}

function OriginText({ origin }: { origin: MasterUsage['origin'] }): JSX.Element {
  if (origin === 'library')
    return (
      <span className="inline-flex items-center gap-1.5 text-ink-faint">
        <span data-tint="green" className="tint-dot h-1 w-1 shrink-0 rounded-pill" aria-hidden />
        из библиотеки
      </span>
    );
  if (origin === 'local') {
    return (
      <span className="text-status-ink" {...statusAttrs('warning')}>
        свой, мимо библиотеки
      </span>
    );
  }
  return <span className="text-ink-faint">библиотека отключена</span>;
}

function OriginPill({ origin }: { origin: MasterUsage['origin'] }): JSX.Element {
  if (origin === 'library') return <Pill tone="accent">из библиотеки</Pill>;
  if (origin === 'local') return <Pill tone="warn">свой</Pill>;
  return <Pill>библиотека отключена</Pill>;
}
