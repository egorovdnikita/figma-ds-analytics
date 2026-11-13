import { describe, expect, it } from 'vitest';
import { oppositeTheme, parseTheme, resolveTheme } from '../../src/shared/theme';

describe('тема панели', () => {
  it('сохранённая тема читается, мусор — «не выбрано»', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme(undefined)).toBeNull();
    expect(parseTheme('auto')).toBeNull();
    expect(parseTheme(1)).toBeNull();
  });

  it('выбор пользователя важнее темы Figma', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });

  it('пока ничего не выбрано, панель следует за Figma', () => {
    expect(resolveTheme(null, 'dark')).toBe('dark');
    expect(resolveTheme(null, 'light')).toBe('light');
  });

  it('переключатель меняет тему на противоположную', () => {
    expect(oppositeTheme('light')).toBe('dark');
    expect(oppositeTheme('dark')).toBe('light');
  });
});
