/**
 * Иконки плагина — единственный список.
 *
 * Иконки приходят из дизайн-системы Box UI (набор Solar), но не целиком:
 * один стиль весит 640 KB, а бюджет всего UI-бандла — 500 KB. Скрипт
 * `npm run sync:box-ui` читает эти списки и вырезает из Box UI геометрию
 * ровно этих иконок. Новая иконка = строка здесь + пересинхронизация.
 *
 * Стиль по умолчанию — `bold`. Стрелки и поиск — `linear`: залитая
 * стрелка или лупа читается как кнопка-пятно, а не как направление.
 */
export const BOLD_ICONS = [
  'copy',
  'close-circle',
  'danger-triangle',
  'check-circle',
  'info-circle',
  'widget',
  'palette',
  'graph-up',
  'library',
  'map-point',
  'lightbulb',
  'stop-circle',
  'play',
  'link-broken',
  'clipboard',
  'sun',
  'moon',
] as const;

export const LINEAR_ICONS = [
  'magnifer',
  'alt-arrow-right',
  'refresh',
  'arrow-right-up',
  'arrow-right-down',
] as const;

export const ICON_NAMES = [...BOLD_ICONS, ...LINEAR_ICONS] as const;

export type IconName = (typeof ICON_NAMES)[number];
