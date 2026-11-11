# Промо-ролик для README

Запись настоящего интерфейса плагина: собранный `dist/index.html` открывается в Chromium (Playwright) размером окна плагина 480 × 640, тема — тёмная, как у Figma с `themeColors`. Песочницу Figma заменяет сценарий `capture.mjs`: он отвечает интерфейсу теми же сообщениями `main/*` из `src/shared/messages.ts`. Отчёт вымышленный — `demo-data.mjs`; реальных файлов, людей и клиентов нет.

Результат — `docs/assets/figma-ds-analytics-demo.webp`: 1600 × 900, 30 кадров/с, ≈25 с, WebP без потерь, бесшовная петля. Стиль как у Agent Pulse: фон GitHub Dark `#0d1117`, обводка `#3d444d`, скругление 20 pt, курсора нет — клики показаны кольцами в измеренных центрах настоящих кнопок, камера плавная.

Сценарий: охват «весь файл» → проверка с прогрессом по страницам → сводка (вердикт, тренд, «С чего начать») → пункт «Компоненты мимо библиотеки» → карточка компонента и переход к слою → токены и impact «сколько слоёв сломается» → сводка → стартовый экран.

## Как воспроизвести

Окружения ставятся вне репозитория.

```sh
npm run build

# Playwright и браузер — во временной папке
mkdir -p /tmp/ds-promo-env && (cd /tmp/ds-promo-env && npm init -y && npm i playwright@1.57.0 && npx playwright install chromium-headless-shell)

# Pillow и ffmpeg для монтажа
python3 -m venv /tmp/ds-promo-py && /tmp/ds-promo-py/bin/pip install pillow imageio-ffmpeg

# Кадры панели и таймлайн
PLAYWRIGHT_PATH=/tmp/ds-promo-env/package.json node scripts/promo/capture.mjs /tmp/ds-promo-out

# Монтаж и WebP
/tmp/ds-promo-py/bin/python scripts/promo/compose.py /tmp/ds-promo-out docs/assets/figma-ds-analytics-demo.webp
```

`--keys-only` у `compose.py` рисует только контрольные PNG (шаг `--step`, по умолчанию 0,5 с, плюс моменты кликов) в `ПАПКА/keys/` без кодирования — для быстрой проверки глазами. `--quality` — усилие сжатия WebP без потерь (по умолчанию 92; с потерями на тёмных карточках появлялись блоки). После монтажа `ПАПКА/verification.json` сообщает число кадров, длительность, размер и совпадение первого и последнего кадра.

Кадры снимаются по виртуальной сетке 60 кадров/с (монтаж берёт каждый второй, `--fps 60` — все), анимации интерфейса выключены через `prefers-reduced-motion`, поэтому скорость машины на результат не влияет.
