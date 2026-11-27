/**
 * Тема плагина — дизайн-система Box UI.
 *
 * Здесь нет ни одного литерального цвета, радиуса или кегля: каждый ключ —
 * ссылка на CSS-переменную Box UI (src/ui/vendor/box-ui). Значения и моды
 * (светлая/тёмная тема, акцент, плотность скруглений) живут в токенах, а не
 * в коде плагина, — так же, как в компонентах самой Box UI.
 *
 * Модификаторы прозрачности Tailwind (`bg-accent/25`) с var() не работают:
 * полупрозрачные ступени берутся готовыми из токенов (`accent-soft`, `hover`).
 *
 * @type {import('tailwindcss').Config}
 */
// Числовые имена Tailwind сохраняются; значения разрешаются через Box UI.
const scale = [
  2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80,
  84, 88, 92, 96,
];
const spacing = Object.fromEntries(scale.map((px) => [px / 4, `var(--spacing-${px})`]));
const sizes = {
  ...Object.fromEntries(scale.map((px) => [px / 4, `var(--size-${px})`])),
  32: 'var(--audit-scope-height)',
  sparkline: 'var(--audit-sparkline-width)',
  'narrow-content': 'var(--audit-narrow-content-width)',
  description: 'var(--audit-description-width)',
};

export default {
  content: ['./src/ui/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      spacing,
      lineHeight: {
        relaxed: 'var(--audit-leading-relaxed)',
        snug: 'var(--audit-leading-snug)',
        none: 'var(--audit-leading-none)',
      },
      letterSpacing: { tight: 'var(--audit-tracking-tight)' },
      opacity: { 50: 'var(--audit-disabled-opacity)' },
      borderWidth: { DEFAULT: 'var(--audit-border-width)', 2: 'var(--audit-outline-width)' },
      ringWidth: { 2: 'var(--audit-outline-width)' },
      ringOffsetWidth: { 1: 'var(--audit-focus-offset)' },
      width: sizes,
      height: sizes,
      minWidth: sizes,
      minHeight: sizes,
      maxWidth: sizes,
      maxHeight: sizes,
      colors: {
        panel: 'var(--panel-fill)',
        'panel-card': 'var(--panel-card-fill)',
        canvas: 'var(--surface-base-fill-page)',
        surface: 'var(--surface-base-fill-raised)',
        overlay: 'var(--surface-base-fill-overlay)',
        hover: 'var(--interaction-ghost-fill-hover)',
        ink: {
          DEFAULT: 'var(--surface-base-content-strong)',
          soft: 'var(--surface-base-content-muted)',
          faint: 'var(--surface-base-content-subtle)',
        },
        line: {
          DEFAULT: 'var(--surface-base-border-default)',
          subtle: 'var(--surface-base-border-subtle)',
          strong: 'var(--surface-base-border-strong)',
        },
        accent: {
          DEFAULT: 'var(--accent-fill-solid)',
          soft: 'var(--accent-fill-soft)',
          ink: 'var(--accent-content-on-soft-default)',
          on: 'var(--accent-content-on-solid-default)',
          'on-muted': 'var(--accent-content-on-solid-muted)',
          hover: 'var(--interaction-accent-solid-fill-hover)',
        },
        // Статус работает только на элементе с [data-box-control][data-status]:
        // так Box UI переобъявляет статусные токены локально (controls.css).
        status: {
          DEFAULT: 'var(--status-fill-solid)',
          soft: 'var(--status-fill-soft)',
          ink: 'var(--status-content-on-surface-default)',
        },
      },
      borderRadius: {
        xs: 'var(--rounding-xs)',
        sm: 'var(--rounding-s)',
        md: 'var(--rounding-m)',
        lg: 'var(--rounding-l)',
        card: 'var(--rounding-xl)',
        pill: 'var(--rounding-full)',
      },
      fontFamily: {
        sans: ['var(--font-family-body)'],
      },
      fontSize: {
        'caption-m': ['var(--type-caption-m-font-size)', 'var(--type-caption-m-line-height)'],
        'caption-l': ['var(--type-caption-l-font-size)', 'var(--type-caption-l-line-height)'],
        'body-m': ['var(--type-body-m-font-size)', 'var(--type-body-m-line-height)'],
        'body-l': ['var(--type-body-l-font-size)', 'var(--type-body-l-line-height)'],
        h5: ['var(--type-h5-font-size)', 'var(--type-h5-line-height)'],
        h4: ['var(--type-h4-font-size)', 'var(--type-h4-line-height)'],
        h2: ['var(--type-h2-font-size)', 'var(--type-h2-line-height)'],
      },
      fontWeight: {
        normal: 'var(--font-weight-regular)',
        medium: 'var(--type-font-weight-medium)',
        semibold: 'var(--type-font-weight-semibold)',
      },
    },
  },
  plugins: [],
};
