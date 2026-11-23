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
@keyframes mo-pop{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}
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
:where(.mo-fluid){position:relative}.mo-fluid{isolation:isolate}
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

/* View Transitions: view switch morph, link page, theme */
::view-transition-group(*){animation-duration:320ms;animation-timing-function:cubic-bezier(.4,0,.2,1)}
::view-transition-old(root),::view-transition-new(root){animation-duration:200ms}
/* Ripple */
.mo-rip-host{position:relative;overflow:hidden}
.mo-rip{position:absolute;border-radius:50%;background:currentColor;opacity:.08;transform:scale(0);pointer-events:none;animation:mo-rip 450ms cubic-bezier(.2,.8,.2,1) forwards}
.mo-rip.out{animation:mo-rip 450ms cubic-bezier(.2,.8,.2,1) forwards,mo-rip-out 350ms ease-out forwards}
.sm-btn--primary .mo-rip,.btn.primary .mo-rip,.sm-fab .mo-rip,.fab .mo-rip{opacity:.2}
@keyframes mo-rip{to{transform:scale(1)}}
@keyframes mo-rip-out{to{opacity:0}}
/* Tooltip with travel */
.mo-tip{position:fixed;z-index:400;pointer-events:none;padding:4px 8px;border-radius:6px;background:var(--text,var(--fg));color:var(--surface,var(--l1));font:500 .75rem/1.4 var(--font-sans,system-ui);white-space:nowrap;opacity:0;transform:translateY(2px);transition:opacity 120ms,transform 120ms,left 200ms cubic-bezier(.2,.8,.2,1),top 200ms cubic-bezier(.2,.8,.2,1)}
.mo-tip.on{opacity:1;transform:none}
.mo-tip kbd{margin-left:6px;opacity:.7;font:inherit}
/* Error shake */
.mo-shake,.state.on [role="alert"],.sm-input--error{animation:mo-shake 320ms ease-out}
@keyframes mo-shake{20%{transform:translateX(-6px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
/* Landed: a saved link drops into the feed */
.mo-landed{animation:mo-land 320ms cubic-bezier(.34,1.56,.64,1) both;position:relative}
.mo-landed::after{content:"";position:absolute;inset:-2px;border-radius:inherit;box-shadow:0 0 0 2px var(--accent);animation:mo-ring 1.8s ease-out forwards;pointer-events:none}
@keyframes mo-land{from{opacity:0;transform:translateY(-16px) scale(.94)}to{opacity:1;transform:none}}
@keyframes mo-ring{0%{opacity:1}100%{opacity:0}}
/* Accept an AI suggestion */
.mo-accept{animation:mo-accept 200ms cubic-bezier(.34,1.56,.64,1)}
@keyframes mo-accept{50%{transform:scale(1.06)}}
/* Feed stagger (scope change only) */
.mo-stagger>*{animation:mo-fadeup 200ms ease-out both;animation-delay:calc(min(var(--i,0),6) * 30ms)}
@keyframes mo-fadeup{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
/* Panel auto-height */
.mo-auto{transition:height 200ms cubic-bezier(.4,0,.2,1);overflow:hidden}
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

/* View transition helper */
window.__moVT=function(fn){if(RM||!document.startViewTransition){fn();return}document.startViewTransition(fn)};
/* Theme switch cross-fade */
document.addEventListener('change',e=>{const t=e.target;if(t.id!=='th'||RM||!document.startViewTransition)return;e.stopImmediatePropagation();const v=t.value;document.startViewTransition(()=>{if(v==='system')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',v)})},true);
/* Ripple */
const RSEL='.btn,.sm-btn,.ib,.sm-ib,.mi,.sm-mi,.chip,.sm-chip,.tab,.sm-tab,.fab,.sm-fab,.sm-nav,.nav';
document.addEventListener('pointerdown',e=>{if(RM||e.button!==0)return;const h=e.target.closest(RSEL);if(!h||h.closest('.card,.sm-card,[draggable-card]')||h.disabled)return;const r=h.getBoundingClientRect();const d=Math.hypot(Math.max(e.clientX-r.left,r.right-e.clientX),Math.max(e.clientY-r.top,r.bottom-e.clientY))*2;
  if(getComputedStyle(h).position==='static')h.style.position='relative';h.classList.add('mo-rip-host');const s=document.createElement('span');s.className='mo-rip';s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;h.appendChild(s);
  const end=()=>{s.classList.add('out');setTimeout(()=>s.remove(),400);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end)};window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end)},true);
/* Tooltips with travel: icon-only buttons (aria-label or title, no visible text) */
const tip=document.createElement('div');tip.className='mo-tip';tip.setAttribute('role','tooltip');let tipT=null,tipGroupUntil=0,tipFor=null;
function tipText(el){const t=el.getAttribute('data-tip')||el.getAttribute('title')||el.getAttribute('aria-label');if(el.getAttribute('title')){el.setAttribute('data-tip',el.getAttribute('title'));el.removeAttribute('title')}return t}
function showTip(el){const t=tipText(el);if(!t)return;if(!tip.isConnected)document.body.appendChild(tip);tip.textContent=t;const r=el.getBoundingClientRect();const w=tip.offsetWidth;let x=r.left+r.width/2-w/2;x=Math.max(8,Math.min(innerWidth-w-8,x));let y=r.bottom+8;if(y+30>innerHeight)y=r.top-34;
  if(!tip.classList.contains('on'))tip.style.transition='opacity 120ms,transform 120ms';tip.style.left=x+'px';tip.style.top=y+'px';void tip.offsetWidth;tip.style.transition='';tip.classList.add('on');tipFor=el}
function iconOnly(el){return el.matches('.ib,.sm-ib,.act,[data-tip]')||(el.matches('button')&&!el.textContent.trim()&&(el.getAttribute('aria-label')||el.getAttribute('title')))}
document.addEventListener('mouseover',e=>{if(!matchMedia('(hover:hover)').matches)return;const el=e.target.closest('button,a');if(!el||!iconOnly(el)||el===tipFor)return;clearTimeout(tipT);
  if(Date.now()<tipGroupUntil||tip.classList.contains('on'))showTip(el);else tipT=setTimeout(()=>showTip(el),400)});
document.addEventListener('mouseout',e=>{const el=e.target.closest('button,a');if(!el||el!==tipFor&&!tipT)return;if(e.relatedTarget&&el.contains(e.relatedTarget))return;clearTimeout(tipT);tipT=null;
  setTimeout(()=>{if(tipFor===el){tip.classList.remove('on');tipFor=null;tipGroupUntil=Date.now()+300}},60)});
document.addEventListener('pointerdown',()=>{clearTimeout(tipT);tip.classList.remove('on');tipFor=null},true);
/* Accept an AI suggestion chip: becomes a tag and pulses */
document.addEventListener('click',e=>{const c=e.target.closest('.sm-chip--ai');if(!c||!c.closest('#save,.popup,[data-accept-host],.tidy-row'))return;e.preventDefault();const tg=document.createElement('span');tg.className='sm-tag mo-accept';tg.textContent=c.textContent.trim();c.replaceWith(tg)},true);
/* Landed + FLIP helper: call before and after a render */
window.__moFlip=function(container,doRender,newSel){if(RM){doRender();return}const items=[...container.querySelectorAll('[data-id]')];const first=new Map(items.map(i=>[i.dataset.id,i.getBoundingClientRect()]));doRender();
  const now=[...document.querySelectorAll('[data-id]')];now.forEach(el=>{const f=first.get(el.dataset.id);if(!f){return}const l=el.getBoundingClientRect();const dx=f.left-l.left,dy=f.top-l.top;if(!dx&&!dy)return;el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:320,easing:'cubic-bezier(.4,0,.2,1)'})});
  if(newSel){const n=document.querySelector(newSel);if(n)n.classList.add('mo-landed')}};
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
