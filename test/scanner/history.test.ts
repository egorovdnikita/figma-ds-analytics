import { afterEach, expect, it, vi } from 'vitest';
import { setupScan } from '../helpers/scan';

afterEach(() => vi.unstubAllGlobals());

it('ошибка записи не выдаётся за сохранённый замер', async () => {
  const h = await setupScan([]);
  h.root.setPluginData.mockImplementation(() => {
    throw new Error('storage unavailable');
  });
  h.send({ type: 'ui/scan-requested', scope: 'page' });
  const report = await h.finished();
  expect(report.cancelled).toBe(false);
  expect(report.trend).toEqual({ saved: false, points: [], previous: null });
});

it('успешная запись включает снимок нужной страницы', async () => {
  const h = await setupScan([]);
  h.send({ type: 'ui/scan-requested', scope: 'page' });
  const report = await h.finished();
  expect(report.trend.saved).toBe(true);
  expect(report.trend.points[0]?.target).toBe(`page:${h.currentPage.id}`);
  expect(report.scope).toContain(h.currentPage.name);
});
