import { describe, expect, it } from 'vitest';
import { pruneCss, pruneHtml } from '../../scripts/prune-css-vars.mjs';

describe('чистка CSS-переменных в сборке', () => {
  it('убирает переменную без ссылок и оставляет используемую', () => {
    expect(pruneCss(':root{--a:red;--b:blue}.x{color:var(--a)}')).toBe(
      ':root{--a:red}.x{color:var(--a)}',
    );
  });

  it('идёт по цепочке: примитив жив, пока на него ссылается живой токен', () => {
    const css = ':root{--p1:#000;--p2:#fff;--t:var(--p1);--dead:var(--p2)}.x{color:var(--t)}';
    expect(pruneCss(css)).toBe(':root{--p1:#000;--t:var(--p1)}.x{color:var(--t)}');
  });

  it('не режет значение со скобками, запятыми и кавычками', () => {
    const css = ':root{--f:"A;B",var(--g, 1px);--g:2px;--x:1}.x{font-family:var(--f)}';
    expect(pruneCss(css)).toBe(':root{--f:"A;B",var(--g, 1px);--g:2px}.x{font-family:var(--f)}');
  });

  it('учитывает ссылки из JS и имена, собранные в коде на лету', () => {
    const html =
      '<style>:root{--js:1;--size-16:16px;--gone:0}</style><script>a="var(--js)"</script>';
    expect(pruneHtml(html)).toBe(
      '<style>:root{--js:1;--size-16:16px}</style><script>a="var(--js)"</script>',
    );
  });

  it('убирает правило, от которого ничего не осталось', () => {
    expect(pruneCss('[data-theme=dark]{--z:1}.x{color:red}')).toBe('.x{color:red}');
  });
});
