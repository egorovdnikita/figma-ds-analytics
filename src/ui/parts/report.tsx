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
  const coverage =
    instances === 0 ? 0 : Math.min(100, Math.max(0, (adoption.fromLibrary / instances) * 100));

  return (
    <div className="summary-screen flex flex-col gap-2">
      {report.cancelled && (
        <div
          role="status"
          className="rounded-md bg-status-soft px-4 py-3 text-body-m text-status-ink"
          {...statusAttrs('warning')}
        >
          <p className="font-medium">Неполный отчёт</p>
          <p className="mt-1">Проверка остановлена. Показатели относятся к просмотренным слоям.</p>
        </div>
      )}
      <section className="coverage-hero text-center">
        <div
          className="coverage-gauge relative mx-auto mt-3 w-[240px]"
          role="meter"
          aria-label="Доля копий из библиотеки"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(coverage)}
        >
          <svg viewBox="0 0 240 132" className="block w-full" aria-hidden="true">
            <defs>
              <linearGradient id="coverage-arc" x1="0" y1="1" x2="1" y2="0">
                <stop stopColor="var(--accent-fill-solid)" />
                <stop offset="100%" stopColor="var(--detail-violet)" />
              </linearGradient>
            </defs>
            <path
              d="M16 116 A104 104 0 0 1 224 116"
              fill="none"
              stroke="var(--panel-card-fill)"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {coverage > 0 && (
              <path
                className="coverage-arc"
                d="M16 116 A104 104 0 0 1 224 116"
                fill="none"
                stroke="url(#coverage-arc)"
                strokeWidth="16"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray={`${coverage} 100`}
              />
            )}
          </svg>
          <p className="absolute inset-x-0 bottom-1 summary-value font-semibold tracking-tight tabular-nums">
            {pct(adoption.fromLibrary, instances)}
          </p>
        </div>
        <p className="mt-2 text-body-m text-ink">
          {adoption.fromLibrary.toLocaleString('ru')} из {instances.toLocaleString('ru')} копий
        </p>
        <p className="mt-1 text-body-m text-ink-soft">{state.text}</p>
      </section>

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
                  value={item.value.match(/^[\d\s\u00a0\u202f]+/)?.[0].trim() ?? item.value}
                  hint={`${/[^\d\s\u00a0\u202f]/.test(item.value) ? `${item.value}. ` : ''}${item.hint}`}
                  {...(onClick === undefined ? {} : { onClick })}
                />
              );
            })}
          </Card>
        </Section>
      )}

      <Section title="показатели">
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
      </Section>

      <TrendCard adoption={adoption} trend={trend} />

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

      <div className="mt-5">
        <CopyButton text={toMarkdown(report, new Date())} label="Скопировать отчёт" wide />
      </div>
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
        <Card plain className="list-surface py-4">
          <p className="text-body-l font-medium">Первый замер сохранён</p>
          <p className="mt-1 text-body-m text-ink-soft">
            Сравнение появится после следующей проверки.
          </p>
        </Card>
      </Section>
    );
  }

  const series = trend.points.map((point) =>
    point.instances === 0 ? 0 : (point.fromLibrary / point.instances) * 100,
  );

  const first = trend.points[0];
  const last = trend.points[trend.points.length - 1];

  return (
    <Section title="тренд">
      <Card plain className="trend-panel list-surface">
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-body-m text-ink-soft">К прошлому замеру</p>
          <Delta points={delta} since={shortDate(trend.previous.at)} />
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-body-l font-medium tabular-nums">
            {Math.round(series[0] ?? 0)}% → {Math.round(series[series.length - 1] ?? 0)}%
          </span>
          <span className="text-caption-l text-ink-soft">За период</span>
        </div>
        <svg
          className="my-3 block w-full overflow-visible"
          viewBox="0 0 400 112"
          role="img"
          aria-label={`Покрытие компонентами из библиотеки: ${series.map((v) => `${Math.round(v)}%`).join(', ')}`}
        >
          {series.map((value, i) => {
            const step = 400 / Math.max(series.length, 1);
            const width = Math.min(36, step * 0.6);
            const x = step * (i + 0.5);
            const height = Math.max(1, value * 0.84);
            return (
              <g key={trend.points[i]?.at ?? i}>
                <rect
                  x={x - width / 2}
                  y={98 - height}
                  width={width}
                  height={height}
                  style={{ rx: 'var(--rounding-4)' }}
                  fill={
                    i === series.length - 1 ? 'var(--accent-fill-solid)' : 'var(--accent-fill-soft)'
                  }
                />
                {series.length <= 10 && (
                  <text
                    x={x}
                    y={90 - height}
                    textAnchor="middle"
                    fill="var(--surface-base-content-muted)"
                    className="text-caption-l"
                  >
                    {Math.round(value)}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="flex justify-between text-caption-l text-ink-soft">
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
    const needle = query.trim().toLowerCase();
    for (const master of adoption.masters) {
      if (needle && !master.name.toLowerCase().includes(needle)) continue;
      counts.all += 1;
      counts[master.origin] += 1;
    }
    return counts;
  }, [adoption.masters, query]);

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

        {query.trim() !== '' && (
          <p className="text-caption-l text-ink-soft" role="status">
            Найдено: {visible.length}
          </p>
        )}
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
          <div className="mb-4">
            <OriginPill origin={selected.origin} />
          </div>
          <Facts
            items={[
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
                ? 'Копии связаны с библиотечным компонентом.'
                : selected.origin === 'local'
                  ? 'Компонент собран прямо в этом файле, а не взят из библиотеки.'
                  : 'Источник недоступен: библиотека отключена от файла либо компонент удалён.'}
            </Note>
          </div>

          <h4 className="mb-2 mt-4 text-body-m font-medium">
            где посмотреть{' '}
            {selected.instances > selected.places.length && (
              <span className="text-ink-soft">
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
          <p className="mb-4 text-body-m text-ink-soft">
            {selected.collectionName || 'Без коллекции'}
          </p>
          <Facts
            items={[
              { label: 'слоёв', value: selected.nodes.toLocaleString('ru') },
              {
                label: plural(selected.pages, 'страница', 'страницы', 'страниц'),
                value: selected.pages,
              },
            ]}
          />
          <div className="mt-3">
            <Note>Перед изменением токена проверьте места использования.</Note>
          </div>

          <h4 className="mb-2 mt-4 text-body-m font-medium">
            где посмотреть{' '}
            {selected.nodes > selected.places.length && (
              <span className="text-ink-soft">
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
              leading={<TintIcon name="folder" tint="pink" />}
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
                  <span className="text-ink-soft">
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
    <span className="inline-flex items-center gap-1.5 text-ink-soft">
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
      <span className="inline-flex items-center gap-1.5 text-ink-soft">
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
  return <span className="text-ink-soft">библиотека отключена</span>;
}

function OriginPill({ origin }: { origin: MasterUsage['origin'] }): JSX.Element {
  if (origin === 'library') return <Pill tone="accent">из библиотеки</Pill>;
  if (origin === 'local') return <Pill tone="warn">свой</Pill>;
  return <Pill>библиотека отключена</Pill>;
}
