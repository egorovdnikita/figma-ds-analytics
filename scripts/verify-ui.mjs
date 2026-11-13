/* global document, getComputedStyle */
/** Регрессии UI на вымышленном preview.html. Принимает Playwright Page; без новых зависимостей UI. */
import assert from 'node:assert/strict';

export async function verifyUI(page, baseURL = 'http://127.0.0.1:4173') {
  const open = async (screen) => {
    await page.goto(`${baseURL}/preview.html?screen=${screen}&check=${Date.now()}`);
    await page.waitForFunction(() =>
      [...document.querySelectorAll('iframe')].every(
        (f) => f.contentDocument?.querySelector('#root')?.children.length,
      ),
    );
    return page.frames().filter((f) => f.parentFrame());
  };
  const checks = [];
  let frames = await open('components');
  for (const frame of frames) {
    const source = frame.locator('main li button').first();
    await source.click();
    const dialog = frame.getByRole('dialog');
    await dialog.waitFor();
    assert(
      await dialog.evaluate((e) => e.contains(document.activeElement)),
      'Фокус должен войти в модалку',
    );
    await page.keyboard.press('Shift+Tab');
    assert(
      await dialog.evaluate((e) => e.contains(document.activeElement)),
      'Shift+Tab не должен покидать модалку',
    );
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('Tab');
      assert(
        await dialog.evaluate((e) => e.contains(document.activeElement)),
        'Tab не должен попадать в фоновый список',
      );
    }
    assert(
      await frame.locator('nav').evaluate((e) => e.closest('[inert]') !== null),
      'Фоновая навигация должна быть inert',
    );
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert(
      await source.evaluate((e) => e === document.activeElement),
      'Фокус должен вернуться на исходную строку',
    );
    assert.equal(
      await frame.locator('[inert]').count(),
      0,
      'После закрытия фон должен разблокироваться',
    );
    await frame.getByPlaceholder('Найти компонент').fill('несуществующий-компонент');
    assert.equal((await frame.getByRole('status').innerText()).trim(), 'Найдено: 0');
    checks.push('Фокус модалки, возврат и поиск');
  }
  frames = await open('start');
  for (const frame of frames) {
    const radio = frame.getByRole('radio', { name: 'Страница', exact: true });
    await radio.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(
      await frame
        .getByRole('radio', { name: 'Весь файл', exact: true })
        .getAttribute('aria-checked'),
      'true',
    );
    await page.keyboard.press('Home');
    assert.equal(
      await frame
        .getByRole('radio', { name: 'Выделение', exact: true })
        .getAttribute('aria-checked'),
      'true',
    );
    assert.equal(await frame.locator('[role=radio][tabindex="0"]').count(), 1);
    assert(await frame.locator('.start-content').evaluate((e) => e.scrollHeight <= e.clientHeight));
    checks.push('Клавиатура выбора охвата и старт без скролла');
  }
  frames = await open('summary');
  for (const frame of frames) {
    const gauge = frame.getByRole('meter');
    await gauge.waitFor();
    assert.equal(await gauge.getAttribute('aria-valuenow'), '76');
    assert.equal(await gauge.locator('p').evaluate((e) => getComputedStyle(e).fontSize), '80px');
    const chart = frame.locator('.trend-panel svg[role=img]');
    assert.equal(await chart.locator('rect').count(), 6);
    assert.equal(await chart.locator('polyline').count(), 0);
    const gap = await chart.evaluate((e) => {
      const bar = e.querySelector('rect');
      return 104 - (Number(bar.getAttribute('y')) + Number(bar.getAttribute('height')));
    });
    assert.equal(gap, 6);
    assert.equal(await chart.locator('path').count(), 0, 'Под столбиками нет линии');
    checks.push('Полукруг, крупный процент и столбики без линии');
  }
  return { passed: checks.length, checks };
}
