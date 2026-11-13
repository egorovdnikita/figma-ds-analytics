/**
 * Тема панели: светлая или тёмная.
 *
 * По умолчанию панель следует за темой Figma. Выбор пользователя важнее:
 * он хранится в clientStorage — настройка личная, в файл команды не попадает.
 */
export type Theme = 'light' | 'dark';

/** Сохранённое значение из clientStorage: мусор и старые форматы — «не выбрано». */
export function parseTheme(stored: unknown): Theme | null {
  return stored === 'light' || stored === 'dark' ? stored : null;
}

/** Итоговая тема: выбор пользователя, иначе тема Figma. */
export function resolveTheme(chosen: Theme | null, figma: Theme): Theme {
  return chosen ?? figma;
}

export function oppositeTheme(theme: Theme): Theme {
  return theme === 'light' ? 'dark' : 'light';
}
