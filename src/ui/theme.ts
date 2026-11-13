/**
 * Моды Box UI для панели плагина.
 *
 * Box UI переключается атрибутами `data-*`, а тема зависит ещё и от того,
 * светлая или тёмная сейчас Figma. С `themeColors: true` Figma вешает на
 * <html> класс `figma-dark` и меняет его на лету — тема плагина следует за ним.
 *
 * Все атрибуты ставятся на один элемент: в Box UI переменная разрешается
 * там, где объявлена, и мода, выставленная ниже по дереву, до уже
 * разрешённых токенов не дотянется (см. README Box UI).
 */
import { resolveTheme, type Theme } from '../shared/theme';

const FIXED_MODES = {
  'data-accent': 'deep',
  // Скругления крупные, как у веба HireHi: карточка 24, поле 16, чипс 12.
  'data-radius': 'medium',
  'data-font': 'inter',
  // Панель плагина — всегда десктоп: ширина iframe 480px не телефон, и
  // мобильная плотность только съела бы место.
  'data-device': 'desktop',
  'data-status': 'positive',
  'data-appearance': 'solid',
  'data-state': 'default',
  'data-icon-style': 'bold',
} as const;

export function figmaTheme(root: HTMLElement): Theme {
  return root.classList.contains('figma-dark') ? 'dark' : 'light';
}

/** Тема, выбранная вручную; `null` — следовать за Figma. */
let chosen: Theme | null = null;

export function currentTheme(root: HTMLElement): Theme {
  return resolveTheme(chosen, figmaTheme(root));
}

/** Выбор пользователя перекрывает тему Figma до конца сессии. */
export function chooseTheme(root: HTMLElement, theme: Theme | null): void {
  chosen = theme;
  root.setAttribute('data-theme', currentTheme(root));
}

export function applyModes(root: HTMLElement): () => void {
  for (const [name, value] of Object.entries(FIXED_MODES)) root.setAttribute(name, value);

  const sync = (): void => {
    root.setAttribute('data-theme', currentTheme(root));
  };
  sync();

  const observer = new MutationObserver(sync);
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  return () => {
    observer.disconnect();
  };
}
