import { writeFileSync } from 'node:fs';
import { REPORT } from './promo/demo-data.mjs';
const page = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>Дизайн-система — предпросмотр</title>
<style>body{margin:0;background:#e8e8ea;color:#171717;font:14px system-ui;padding:24px}header{max-width:992px;margin:0 auto 24px;display:flex;align-items:center;gap:16px}h1{font-size:16px;margin:0}select{padding:8px 12px;border-radius:8px;border:1px solid #ccc;background:white}small{margin-left:auto;color:#666}.panels{display:flex;gap:32px;justify-content:center}iframe{border:0;border-radius:24px;width:480px;height:640px;display:block;box-shadow:0 12px 40px #0001}h2{font-size:12px;font-weight:500;margin:0 0 12px;color:#555}</style>
<header><h1>Дизайн-система</h1><select aria-label="Экран"><option value="start">Старт</option><option value="summary">Сводка</option><option value="components">Компоненты</option><option value="collections">Коллекции</option><option value="tokens">Токены</option><option value="component-detail">Детали компонента</option><option value="token-detail">Детали токена</option><option value="progress">Проверка</option><option value="empty">Пустой результат</option><option value="error">Ошибка</option></select><small>Предпросмотр · вымышленные данные</small></header>
<div class="panels"><section><h2>Светлая тема</h2><iframe title="Светлая тема" data-theme="light" src="/index.html?v=${Date.now()}"></iframe></section><section><h2>Тёмная тема</h2><iframe title="Тёмная тема" data-theme="dark" src="/index.html?v=${Date.now()}"></iframe></section></div>
<script>
const REPORT=${JSON.stringify(REPORT)};
const screen=new URL(location.href).searchParams.get('screen') || 'start';
const select=document.querySelector('select');select.value=screen;select.onchange=()=>location.search='?screen='+select.value;
async function waitFor(w,fn){for(let i=0;i<120;i++){if(fn())return;await new Promise(r=>w.requestAnimationFrame(r));}}
function send(w,m){w.postMessage({pluginMessage:m},'*')}
async function report(w){
 const r=structuredClone(REPORT);
 if(screen==='empty'){r.adoption.masters=[];r.adoption.mastersTotal=0;r.adoption.instancesCounted=0;r.adoption.fromLibrary=0;r.adoption.local=0;r.adoption.unknown=0;}
 send(w,{type:'main/scan-finished',report:r});
 await waitFor(w,()=>w.document.querySelector('nav'));
 if(['components','component-detail','empty'].includes(screen))w.document.querySelectorAll('nav button')[1].click();
 if(['collections','tokens','token-detail'].includes(screen))w.document.querySelectorAll('nav button')[2].click();
 if(['tokens','token-detail'].includes(screen)){
  await waitFor(w,()=>[...w.document.querySelectorAll('main button')].some(b=>b.textContent==='токены'));
  [...w.document.querySelectorAll('main button')].find(b=>b.textContent==='токены').click();
 }
 if(['component-detail','token-detail'].includes(screen)){
  await waitFor(w,()=>w.document.querySelector('main li button'));
  w.document.querySelector('main li button').click();
 }
}
window.addEventListener('message',e=>{
 const f=[...document.querySelectorAll('iframe')].find(f=>f.contentWindow===e.source);if(!f)return;
 const m=e.data?.pluginMessage;if(!m)return;const w=f.contentWindow;
 if(m.type==='ui/ready'){
  send(w,{type:'main/booted',fileName:REPORT.fileName,lastScope:'page',theme:f.dataset.theme});
  if(screen==='progress'){
   waitFor(w,()=>[...w.document.querySelectorAll('button')].some(b=>b.textContent.includes('Проверить'))).then(()=>[...w.document.querySelectorAll('button')].find(b=>b.textContent.includes('Проверить')).click());
  } else if(screen==='error'){send(w,{type:'main/error',message:'Не удалось прочитать страницу. Попробуйте ещё раз.'});}
  else if(screen!=='start')void report(w);
 }
 if(m.type==='ui/scan-requested'){
  send(w,{type:'main/scan-progress',nodesVisited:14820,pagesDone:2,pagesTotal:6,currentPageName:'Карточка товара'});
  if(screen!=='progress')setTimeout(()=>report(w),700);
 }
 if(m.type==='ui/scan-cancelled')void report(w);
});
</script></html>`;
writeFileSync(new URL('../dist/preview.html', import.meta.url), page);
