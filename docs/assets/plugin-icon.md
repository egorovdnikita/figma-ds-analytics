# Иконка плагина

Знак `chart-2`, Box UI / Solar, стиль **bold**. Белый знак на индиго
Box UI `indigo-500` (#6366f1). Источник: локальная Box UI, ревизия
`9cff5ed`. Геометрия исходной иконки не менялась. Solar © 480 Design,
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

- `plugin-icon.svg` — исходник 128 × 128.
- `plugin-icon.png` — 128 × 128 для загрузки при публикации в Figma.
- В `src/ui/index.html` SVG встроен data URL: отдельный ресурс не требуется.
- Браузерный предпросмотр берёт тот же SVG через `scripts/create-preview.mjs`.

Figma задаёт иконку в форме публикации, а не через manifest dev-плагина:
[инструкция Figma](https://help.figma.com/hc/en-us/articles/360042293394-Publish-classic-plugins-to-the-Figma-Community).
Изменение favicon не меняет системную иконку dev-плагина в списке Figma.
Публикация плагина в рамках этой правки не выполнялась.
