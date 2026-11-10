/**
 * Вымышленный отчёт для промо-ролика.
 *
 * Форма совпадает с `ScanReport` из `src/shared/adoption.ts`: UI получает его
 * тем же сообщением `main/scan-finished`, что и от настоящей песочницы.
 * Названия файла, страниц, компонентов и токенов выдуманы.
 */

export const FILE_NAME = 'Магазин цветов — макеты';

export const PAGES = [
  'Обложка',
  'Каталог',
  'Карточка товара',
  'Корзина',
  'Оформление заказа',
  'Профиль',
];

/** Итог прогресса: сколько слоёв посетил обход по каждой странице. */
export const PAGE_NODES = [1_240, 9_860, 7_430, 5_120, 6_980, 4_610];

let id = 0;
function places(names, count) {
  return Array.from({ length: Math.min(count, 5) }, (_, i) => {
    id += 1;
    return {
      nodeId: `1:${id}`,
      pageId: `0:${(i % PAGES.length) + 1}`,
      name: names[i % names.length],
    };
  });
}

function master(name, origin, instances, layerNames) {
  return { key: `k-${name}`, name, origin, instances, places: places(layerNames, instances) };
}

const masters = [
  master('Button / Primary', 'library', 642, [
    'Купить',
    'Оформить',
    'В корзину',
    'Продолжить',
    'Оплатить',
  ]),
  master('Product card', 'library', 418, ['Пионы', 'Розы', 'Тюльпаны', 'Эвкалипт', 'Ромашки']),
  master('Input / Text', 'library', 356, ['Имя', 'Телефон', 'Адрес', 'Комментарий', 'Промокод']),
  master('Icon / 24', 'library', 341, ['heart', 'cart', 'search', 'close', 'user']),
  master('Banner / Sale', 'local', 236, [
    'Скидка 20%',
    'Весна',
    'Букет недели',
    'Скидка 20%',
    'Акция',
  ]),
  master('Tag', 'library', 228, ['Новинка', 'Хит', 'Сезон', 'Новинка', 'Хит']),
  master('Header / Main', 'library', 184, ['Header', 'Header', 'Header', 'Header', 'Header']),
  master('Card / Promo copy', 'local', 162, ['Promo', 'Promo 2', 'Promo', 'Promo 3', 'Promo']),
  master('Checkbox', 'library', 158, ['Согласие', 'Открытка', 'Упаковка', 'Согласие', 'Подписка']),
  master('Rating stars', 'unknown', 146, ['Rating', 'Rating', 'Rating', 'Rating', 'Rating']),
  master('Badge', 'library', 132, ['Badge', 'Badge', 'Badge', 'Badge', 'Badge']),
  master('Tab bar old', 'local', 118, ['Tabs', 'Tabs', 'Tabs', 'Tabs', 'Tabs']),
  master('Avatar', 'library', 96, ['Avatar', 'Avatar', 'Avatar', 'Avatar', 'Avatar']),
  master('Price', 'unknown', 88, ['Цена', 'Цена', 'Цена', 'Цена', 'Цена']),
  master('Stepper', 'library', 74, [
    'Количество',
    'Количество',
    'Количество',
    'Количество',
    'Количество',
  ]),
  master('Footer', 'library', 64, ['Footer', 'Footer', 'Footer', 'Footer', 'Footer']),
  master('Toast', 'local', 52, ['Добавлено', 'Удалено', 'Добавлено', 'Ошибка', 'Добавлено']),
  master('Divider', 'unknown', 46, ['Line', 'Line', 'Line', 'Line', 'Line']),
  master('Radio', 'library', 42, ['Курьер', 'Самовывоз', 'Картой', 'Наличными', 'Курьер']),
  master('Switch', 'library', 36, ['Switch', 'Switch', 'Switch', 'Switch', 'Switch']),
  master('Date picker', 'local', 22, ['Дата', 'Дата', 'Дата', 'Дата', 'Дата']),
];

const sum = (origin) =>
  masters.filter((m) => m.origin === origin).reduce((a, m) => a + m.instances, 0);
const fromLibrary = sum('library');
const local = sum('local');
const unknown = sum('unknown');
const instances = fromLibrary + local + unknown;

function variable(name, collectionName, nodes, pages, layerNames) {
  id += 1;
  return {
    id: `VariableID:${id}`,
    name,
    collectionName,
    nodes,
    pages,
    places: places(layerNames, nodes),
  };
}

const topVariables = [
  variable('color/text/primary', 'Semantic', 3_412, 6, [
    'Заголовок',
    'Цена',
    'Пионы',
    'Имя',
    'Итого',
  ]),
  variable('color/surface/card', 'Semantic', 2_186, 6, ['Card', 'Card', 'Modal', 'Card', 'Sheet']),
  variable('color/text/secondary', 'Semantic', 1_974, 6, [
    'Описание',
    'Подпись',
    'Дата',
    'Состав',
    'Описание',
  ]),
  variable('color/accent/default', 'Semantic', 1_208, 5, [
    'Купить',
    'Оформить',
    'Ссылка',
    'Купить',
    'Tab',
  ]),
  variable('color/border/subtle', 'Semantic', 846, 6, [
    'Divider',
    'Input',
    'Card',
    'Divider',
    'Input',
  ]),
  variable('promo/pink', 'Локальные цвета', 612, 3, [
    'Скидка 20%',
    'Весна',
    'Акция',
    'Скидка 20%',
    'Весна',
  ]),
  variable('gray/500', 'Primitives', 488, 4, [
    'Иконка',
    'Подпись',
    'Иконка',
    'Placeholder',
    'Иконка',
  ]),
  variable('color/status/error', 'Semantic', 214, 3, [
    'Ошибка',
    'Ошибка',
    'Обязательно',
    'Ошибка',
    'Ошибка',
  ]),
];

const collections = [
  { name: 'Semantic', source: 'Основная библиотека', variables: 184, isLocal: false },
  { name: 'Primitives', source: 'Основная библиотека', variables: 142, isLocal: false },
  { name: 'Иконки', source: 'Библиотека иконок', variables: 36, isLocal: false },
  { name: 'Локальные цвета', source: 'Локальная', variables: 27, isLocal: true },
  { name: 'Старая палитра', source: 'Библиотека не подключена', variables: 12, isLocal: false },
];

const nodesOnLibraryVariable = 9_420;
const nodesOnLocalVariable = 1_870;
const nodesWithoutVariable = 2_310;

function snapshot(at, libShare, onShare) {
  const fills = nodesOnLibraryVariable + nodesOnLocalVariable + nodesWithoutVariable;
  return {
    v: 1,
    at,
    scope: 'весь файл',
    nodes: 35_240,
    instances,
    fromLibrary: Math.round(instances * libShare),
    local: Math.round(instances * (1 - libShare) * 0.65),
    unknown: Math.round(instances * (1 - libShare) * 0.35),
    fills,
    onTokens: Math.round(fills * onShare),
    masters: masters.length,
  };
}

const today = snapshot('2026-11-10T10:00:00.000Z', fromLibrary / instances, 0.83);
const points = [
  snapshot('2026-10-06T10:00:00.000Z', 0.62, 0.71),
  snapshot('2026-10-13T10:00:00.000Z', 0.64, 0.74),
  snapshot('2026-10-20T10:00:00.000Z', 0.69, 0.77),
  snapshot('2026-10-27T10:00:00.000Z', 0.7, 0.79),
  snapshot('2026-11-03T10:00:00.000Z', 0.73, 0.81),
  today,
];

export const REPORT = {
  fileName: FILE_NAME,
  scope: 'весь файл',
  nodesVisited: PAGE_NODES.reduce((a, b) => a + b, 0),
  cancelled: false,
  adoption: {
    librarySourcesAvailable: true,
    instancesCounted: instances,
    mastersTotal: masters.length,
    fromLibrary,
    local,
    unknown,
    masters,
    libraries: [
      { libraryName: 'Основная библиотека', collections: 2, variables: 326 },
      { libraryName: 'Библиотека иконок', collections: 1, variables: 36 },
    ],
    collections,
    nodesOnLibraryVariable,
    nodesOnLocalVariable,
    nodesWithoutVariable,
    topVariables,
  },
  trend: { points, previous: points[points.length - 2] },
};
