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
import { Icon } from './icon';
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
  Kpi,
  ListRow,
  Modal,
  Note,
  pct,
  Pill,
  Places,
  SearchInput,
  Section,
  Sparkline,
  StackedBar,
  statusAttrs,
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
    <div className="flex flex-col gap-1">
      {/* Одна крупная цифра с бейджем изменения, как баланс в Phantom, и
          вывод фразой под ней, как в Lifesum: цифра без вывода заставляет
          гадать, хорошо это или плохо. */}
      <section className="px-1 pb-4 pt-2">
        <p className="text-body-m text-ink-soft">компоненты из библиотеки</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-h2 font-semibold tabular-nums">
            {pct(adoption.fromLibrary, instances)}
          </span>
          {delta !== null && trend.previous !== null && (
            <Delta points={delta} since={shortDate(trend.previous.at)} />
          )}
        </div>
        <p
          className={`mt-2 text-body-m font-medium ${
            state.tone === 'good' ? 'text-accent-ink' : 'text-ink'
          }`}
        >
          {state.text}
        </p>
      </section>

      {/* Ключевые цифры плитками два в ряд, как в Google Health. */}
      <div className="grid grid-cols-2 gap-1">
        <Kpi
          label="слои на токенах"
          value={pct(onTokens, tokenNodes)}
          hint={`${onTokens.toLocaleString('ru')} из ${tokenNodes.toLocaleString('ru')}`}
        />
        <Kpi
          label="компонентов"
          value={adoption.mastersTotal.toLocaleString('ru')}
          hint={`${adoption.local.toLocaleString('ru')} копий мимо библиотеки`}
        />
        <Kpi
          label="копий"
          value={instances.toLocaleString('ru')}
          hint={`${adoption.fromLibrary.toLocaleString('ru')} из библиотеки`}
        />
        <Kpi
          label="коллекций токенов"
          value={adoption.collections.length.toLocaleString('ru')}
          hint={`${onTokens.toLocaleString('ru')} привязок`}
        />
      </div>

      {advice.length > 0 && (
        <Section title="с чего начать">
          <Card>
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
        <Card>
          <StackedBar
            segments={[
              {
                label: 'Из библиотеки',
                value: adoption.fromLibrary,
                className: 'bg-accent',
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
        <Card>
          <StackedBar
            segments={[
              {
                label: 'Из библиотеки',
                value: adoption.nodesOnLibraryVariable,
                className: 'bg-accent',
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
          <Card className="py-1">
            <ul>
              {adoption.libraries.map((library) => (
                <ListRow
                  key={library.libraryName}
                  leading={<Monogram name={library.libraryName} />}
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

  return (
    <Section title="тренд">
      <Card>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-body-m">Компоненты из библиотеки</p>
            <p className="mt-1">
              <Delta points={delta} since={shortDate(trend.previous.at)} />
            </p>
          </div>
          <Sparkline values={series} />
        </div>
        <div className="mt-3">
          <Note>
            {withCount(trend.points.length, 'замер', 'замера', 'замеров')} по охвату «
            {trend.points[0]?.scope ?? ''}». Один снимок в день: повторный прогон заменяет
            сегодняшний.
          </Note>
        </div>
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
      <div className="flex flex-col gap-1">
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
          <Card className="py-1">
            <ul>
              {visible.slice(0, limit).map((master) => (
                <ListRow
                  key={master.key}
                  onClick={() => setSelected(master)}
                  leading={<Monogram name={master.name} />}
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
        <Modal title={selected.name} onClose={() => setSelected(null)}>
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
          <div className="-mx-4 mt-4 border-t border-line-subtle" />
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
      <div className="flex flex-col gap-1">
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
        <Modal title={selected.name} onClose={() => setSelected(null)}>
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
          <div className="-mx-4 mt-4 border-t border-line-subtle" />
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
      <Card className="py-1">
        <ul>
          {adoption.collections.map((collection) => (
            <ListRow
              key={`${collection.name}-${collection.source}`}
              leading={<Monogram name={collection.name} />}
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
        <Card className="py-1">
          <ul>
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

/**
 * Знак компонента — круг 24 с первой буквой, как логотип компании в
 * карточке вакансии HireHi. Глазу проще держать строку длинного списка.
 */
function Monogram({ name }: { name: string }): JSX.Element {
  const letter = /[\p{L}\p{N}]/u.exec(name)?.[0]?.toUpperCase() ?? '·';
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-canvas text-body-l font-semibold text-ink-soft"
    >
      {letter}
    </span>
  );
}

/** Источник подписью под именем: цвет говорит раньше слов. */
/** Знак токена: палитра в подложке того же размера, что знак компонента. */
function TokenMark(): JSX.Element {
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-canvas text-ink-soft"
    >
      <Icon name="palette" size="2xs" />
    </span>
  );
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
    <span className={collection.isLocal ? 'text-ink-faint' : 'text-accent-ink'}>
      {collection.source}
    </span>
  );
}

function OriginText({ origin }: { origin: MasterUsage['origin'] }): JSX.Element {
  if (origin === 'library') return <span className="text-accent-ink">из библиотеки</span>;
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
