<style>
/* Motion: the effects from the shipped app (docs/design/components/Motion), in the new look. Only transform, opacity, filter. */
.btn,.sm-btn,.ib,.sm-ib,.chip,.sm-chip,.tab,.sm-tab,.fab,.sm-fab{transition:transform 120ms cubic-bezier(.34,1.56,.64,1),background-color 120ms,color 120ms,border-color 120ms}
.btn:active,.sm-btn:active,.ib:active,.sm-ib:active,.chip:active,.sm-chip:active,.tab:active,.sm-tab:active,.fab:active,.sm-fab:active{transform:scale(.97);transition-duration:80ms}
/* Check a checkbox: fill first, then the tick draws itself */
.sm-check{transition:background-color 120ms,border-color 120ms}
.sm-check[aria-checked="true"] svg path{stroke-dasharray:24;animation:mo-tick 200ms ease-out 120ms both}
@keyframes mo-tick{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
/* Menus, popovers: fade + scale from the trigger */
#pop:not([hidden]),.mo-in{animation:mo-pop 200ms cubic-bezier(.2,.8,.2,1) both;transform-origin:top right}
@keyframes mo-pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
#pop.sheet:not([hidden]){animation:mo-sheet 320ms cubic-bezier(.32,.72,0,1) both}
@keyframes mo-sheet{from{transform:translateY(100%)}to{transform:none}}
/* Toast: slides up 12px and fades */
.toast:not([hidden]),.dtoast,.sm-toast.mo-toast{animation:mo-toast 320ms cubic-bezier(.2,.8,.2,1) both}
@keyframes mo-toast{from{opacity:0;translate:0 12px}to{opacity:1;translate:0 0}}
/* Favorite: star pops */
[data-fav][aria-pressed="true"] svg{animation:mo-star 200ms cubic-bezier(.34,1.56,.64,1)}
@keyframes mo-star{50%{transform:scale(1.25)}}
/* Marked while open */
.btn[aria-expanded="true"],.ib[aria-expanded="true"],.act[aria-expanded="true"],.sm-btn[aria-expanded="true"],.sm-ib[aria-expanded="true"],.avatar[aria-expanded="true"]{background:var(--accent-bg)!important;color:var(--accent-text,var(--text,var(--fg)))!important}
/* Segmented control: one thumb slides */
.mo-seg{position:relative;isolation:isolate}
.mo-seg>.mo-thumb{position:absolute;z-index:-1;top:0;left:0;border-radius:var(--r-sm,var(--radius-sm,8px));background:var(--l1,var(--surface));box-shadow:0 0 0 1px var(--line),var(--sh1,var(--shadow-l1));transition:transform 200ms cubic-bezier(.4,0,.2,1),width 200ms cubic-bezier(.4,0,.2,1)}
.mo-seg>button[aria-checked="true"]{background:transparent!important;box-shadow:none!important}
/* Fluid hover: one highlight glides between rows */
.mo-fluid{position:relative;isolation:isolate}
.mo-fluid>.mo-hl{position:absolute;z-index:-1;left:0;right:0;top:0;border-radius:var(--r-sm,var(--radius-sm,8px));background:var(--hover,var(--surface-hover));opacity:0;pointer-events:none;transition:transform 200ms cubic-bezier(.2,.8,.2,1),height 200ms cubic-bezier(.2,.8,.2,1),opacity 120ms}
.mo-fluid.mo-hovering>.mo-hl{opacity:1}
@media (hover:hover) and (pointer:fine){.mo-fluid .mi:hover,.mo-fluid .sm-mi:hover,.mo-fluid .nav:hover:not([aria-current]),.mo-fluid .sm-nav:hover:not([aria-current]){background:transparent!important}}
/* Icon swap: old icon blurs out, new one blurs in */
.mo-swap{animation:mo-swap 200ms ease-out}
@keyframes mo-swap{from{opacity:0;transform:scale(.5);filter:blur(4px)}to{opacity:1;transform:none;filter:none}}
/* Number change: changed digits slide */
.mo-num{display:inline-flex;overflow:hidden;font-variant-numeric:tabular-nums}
.mo-num span{display:inline-block}
.mo-up{animation:mo-up 200ms ease-out}.mo-down{animation:mo-down 200ms ease-out}
@keyframes mo-up{from{transform:translateY(.5em);opacity:0}to{transform:none;opacity:1}}
@keyframes mo-down{from{transform:translateY(-.5em);opacity:0}to{transform:none;opacity:1}}
/* Two-line rise for empty states */
.empty h2,.t-clear b,.sm-empty b,.qp-empty b{animation:mo-rise 200ms ease-out both}
.empty>p,.t-clear span,.sm-empty p,.qp-empty p{animation:mo-rise 200ms ease-out 60ms both}
@keyframes mo-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
/* Delete: card fades and collapses */
.mo-gone{animation:mo-gone 200ms ease-in forwards}
@keyframes mo-gone{to{opacity:0;transform:scale(.92)}}
/* Clear search: words dissolve */
.mo-dissolve{position:absolute;pointer-events:none;white-space:pre;display:flex}
.mo-dissolve span{display:inline-block;animation:mo-word 200ms ease-out forwards}
@keyframes mo-word{to{opacity:0;filter:blur(6px);transform:translateY(-8px)}}
/* Badge pop-in */
.dot,.badge{animation:mo-badge 200ms cubic-bezier(.34,1.56,.64,1) both}
@keyframes mo-badge{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:1ms!important;animation-delay:0ms!important;transition-duration:1ms!important}}
</style>
<script>(function(){
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Segmented thumb, survives re-renders by remembering the last position per control */
const last=new Map();
function segKey(g){return g.id||g.getAttribute('aria-label')||''}
function initSeg(g){if(g.__mo)return;g.__mo=1;g.classList.add('mo-seg');const t=document.createElement('span');t.className='mo-thumb';t.setAttribute('aria-hidden','true');g.prepend(t);
  const place=(anim)=>{const b=g.querySelector('button[aria-checked="true"]');if(!b){t.style.opacity=0;return}t.style.opacity=1;const x=b.offsetLeft,y=b.offsetTop;
    if(!anim)t.style.transition='none';t.style.height=b.offsetHeight+'px';t.style.width=b.offsetWidth+'px';t.style.transform=`translate(${x}px,${y}px)`;if(!anim){void t.offsetWidth;t.style.transition=''}last.set(segKey(g),{x,y,w:b.offsetWidth})};
  const prev=last.get(segKey(g));
  if(prev&&!RM){t.style.transition='none';t.style.width=prev.w+'px';t.style.transform=`translate(${prev.x}px,${prev.y}px)`;const b=g.querySelector('button[aria-checked="true"]');if(b)t.style.height=b.offsetHeight+'px';void t.offsetWidth;t.style.transition='';requestAnimationFrame(()=>place(true))}else place(false);
  new MutationObserver(()=>place(!RM)).observe(g,{attributes:true,subtree:true,attributeFilter:['aria-checked']});
  g.addEventListener('click',e=>{const b=e.target.closest('button[role="radio"]');if(!b||b.closest('.mo-seg')!==g)return;if(!g.closest('[data-rs]')&&!b.dataset.view&&!b.dataset.rs&&!b.dataset.k&&!b.dataset.br){g.querySelectorAll('button[role="radio"]').forEach(x=>x.setAttribute('aria-checked',x===b))}});}
/* Fluid hover */
function initFluid(c,rowSel){if(c.__mf)return;c.__mf=1;c.classList.add('mo-fluid');const h=document.createElement('span');h.className='mo-hl';h.setAttribute('aria-hidden','true');c.prepend(h);let cur=null;
  c.addEventListener('mousemove',e=>{const r=e.target.closest(rowSel);if(!r||!c.contains(r)||r.getAttribute('aria-current'))return;if(r===cur)return;cur=r;const cr=c.getBoundingClientRect(),rr=r.getBoundingClientRect();
    const first=!c.classList.contains('mo-hovering');if(first)h.style.transition='opacity 120ms';h.style.height=rr.height+'px';h.style.left=(rr.left-cr.left)+'px';h.style.right=(cr.right-rr.right)+'px';h.style.transform=`translateY(${rr.top-cr.top+c.scrollTop}px)`;c.classList.add('mo-hovering');if(first){void h.offsetWidth;h.style.transition=''}});
  c.addEventListener('mouseleave',()=>{c.classList.remove('mo-hovering');cur=null});}
function scan(){if(!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  document.querySelectorAll('.seg,.sm-seg').forEach(initSeg);
  document.querySelectorAll('#pop,.sm-menu').forEach(m=>initFluid(m,'.mi,.sm-mi'));
  document.querySelectorAll('.side .tree,.side #folders .sec-in,.hist').forEach(m=>initFluid(m,'.nav,.sm-nav,.h'));}
/* Segments also on touch (no hover needed) */
function scanSeg(){document.querySelectorAll('.seg,.sm-seg').forEach(initSeg)}
const mo=new MutationObserver(()=>{scanSeg();scan()});
function boot(){scanSeg();scan();mo.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
/* Icon swap on copy */
const CHECK='<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="mo-swap"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
document.addEventListener('click',e=>{const b=e.target.closest('[data-copy],.mo-copy');if(!b||b.__busy)return;const svg=b.querySelector('svg');if(!svg)return;b.__busy=1;const old=svg.outerHTML;svg.outerHTML=CHECK;
  setTimeout(()=>{const s2=b.querySelector('svg');if(s2){s2.outerHTML=old;const n=b.querySelector('svg');if(n)n.classList.add('mo-swap')}b.__busy=0},1500)},true);
/* Number change helper, used by drop on a folder */
window.__moNumber=function(el,to){if(!el)return;const from=el.textContent.trim();to=String(to);if(from===to)return;const up=+to>+from;
  el.innerHTML='<span class="mo-num">'+to.split('').map((d,i)=>{const changed=d!==from[from.length-to.length+i];return `<span class="${changed&&!RM?(up?'mo-up':'mo-down'):''}">${d}</span>`}).join('')+'</span>'};
/* Clear search: dissolve the old words */
document.addEventListener('click',e=>{const b=e.target.closest('#fs-clear,[data-clear]');if(!b||RM)return;const field=b.closest('label,.fs-field,.sm-input');const inp=field&&field.querySelector('input');if(!inp||!inp.value)return;
  const r=inp.getBoundingClientRect(),cs=getComputedStyle(inp);const d=document.createElement('div');d.className='mo-dissolve';d.style.cssText=`left:${r.left+parseFloat(cs.paddingLeft)}px;top:${r.top}px;height:${r.height}px;align-items:center;font:${cs.font};color:${cs.color};position:fixed;z-index:999`;
  const words=inp.value.split(/(\s+)/).slice(0,16);let k=0;words.forEach(w=>{const s=document.createElement('span');s.textContent=w;if(w.trim()){s.style.animationDelay=Math.min(k*60,120)+'ms';k++}d.appendChild(s)});document.body.appendChild(d);setTimeout(()=>d.remove(),400)},true);
})();</script>
