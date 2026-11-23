<style>
.dragsrc{opacity:.35;transition:opacity 120ms}
.dprev{position:fixed;left:0;top:0;z-index:200;pointer-events:none;transform-origin:0 0;will-change:transform}
.dprev .wob{transform-origin:12% 8%;will-change:transform}
.dprev .deck{position:relative;width:220px}
.dprev .deck .sm-card{width:220px;box-shadow:var(--shadow-l3);border-color:var(--line-strong)}
.dprev .deck .under{position:absolute;inset:0;border-radius:var(--radius-md);background:var(--surface);border:1px solid var(--line-strong);box-shadow:var(--shadow-l2)}
.dprev .deck .under.u1{transform:rotate(4deg) translate(6px,4px)}
.dprev .deck .under.u2{transform:rotate(-3deg) translate(-4px,6px)}
.dprev .badge{position:absolute;top:-10px;right:-10px;min-width:28px;height:28px;padding:0 8px;border-radius:999px;background:var(--accent);color:var(--on-accent);font:600 .875rem/28px var(--font-sans);text-align:center;box-shadow:var(--shadow-l2)}
.droptarget{background:var(--accent-bg)!important;color:var(--accent-text)!important;box-shadow:inset 0 0 0 1px var(--line-strong)}
@keyframes rowbump{0%{transform:scale(1)}50%{transform:scale(1.06)}100%{transform:scale(1)}}
.bump{animation:rowbump 200ms cubic-bezier(.34,1.56,.64,1)}
.dtoast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:210}
[draggable-card]{cursor:grab;-webkit-user-select:none;user-select:none}
html.is-dragging,html.is-dragging *{-webkit-user-select:none!important;user-select:none!important;cursor:grabbing!important}
</style>
<script>(function(){
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
let drag=null;
function targets(){return [...document.querySelectorAll('[data-drop]')].filter(e=>e.offsetParent)}
function start(card,ev){
  const host=card.closest('.state')||document;
  const sel=[...host.querySelectorAll('[draggable-card][aria-selected="true"]')];
  const group=card.getAttribute('aria-selected')==='true'&&sel.length>1?sel:[card];
  const r=card.getBoundingClientRect();
  const p=document.createElement('div');p.className='dprev';
  const clone=card.cloneNode(true);clone.removeAttribute('draggable-card');clone.querySelectorAll('.sb,.selbox').forEach(x=>x.remove());clone.style.width='220px';clone.style.boxShadow='';
  p.innerHTML='<div class="wob"><div class="deck">'+(group.length>1?'<div class="under u2"></div><div class="under u1"></div>':'')+'</div></div>';
  p.querySelector('.deck').appendChild(clone);
  if(group.length>1){const b=document.createElement('span');b.className='badge';b.textContent=group.length;p.querySelector('.deck').appendChild(b)}
  document.body.appendChild(p);document.documentElement.classList.add('is-dragging');window.getSelection()?.removeAllRanges();
  group.forEach(c=>c.classList.add('dragsrc'));
  drag={p,wob:p.querySelector('.wob'),group,origin:r,x:ev.clientX,y:ev.clientY,lx:ev.clientX,lt:performance.now(),vx:0,vy:0,th:0,om:0,sq:0,over:null,raf:0,last:performance.now()};
  place();if(!RM)drag.raf=requestAnimationFrame(tick);
}
function place(){const d=drag;d.p.style.transform=`translate(${d.x+14}px,${d.y+14}px) scale(.65)`;}
function tick(t){const d=drag;if(!d)return;const dt=Math.min(.032,(t-d.last)/1000);d.last=t;
  d.vx*=Math.pow(.0015,dt);d.vy*=Math.pow(.0015,dt);
  const target=Math.max(-10,Math.min(10,d.vx*6));
  const a=-220*(d.th-target)-18*d.om;d.om+=a*dt;d.th+=d.om*dt;
  const sq=Math.min(.04,Math.abs(d.vy)*.02);
  d.wob.style.transform=`rotate(${-4+d.th}deg) scale(${1+sq*.5},${1-sq})`;
  d.raf=requestAnimationFrame(tick)}
function move(ev){const d=drag;if(!d)return;const t=performance.now(),dt=Math.max(1,t-d.lt);
  const vx=(ev.clientX-d.x)/dt,vy=(ev.clientY-d.y)/dt;d.vx=d.vx*.7+vx*.3;d.vy=d.vy*.7+vy*.3;d.lt=t;
  d.x=ev.clientX;d.y=ev.clientY;place();
  if(RM)d.wob.style.transform='rotate(-4deg)';
  const el=document.elementFromPoint(ev.clientX,ev.clientY);const tg=el&&el.closest('[data-drop]');
  if(tg!==d.over){if(d.over)d.over.classList.remove('droptarget');d.over=tg;if(tg)tg.classList.add('droptarget')}}
function end(){const d=drag;if(!d)return;drag=null;cancelAnimationFrame(d.raf);
  const tg=d.over;if(tg)tg.classList.remove('droptarget');
  const finish=()=>{d.p.remove();document.documentElement.classList.remove('is-dragging');d.group.forEach(c=>c.classList.remove('dragsrc'))};
  if(tg){const r=tg.getBoundingClientRect();
    if(RM){finish();}else{d.p.style.transition='transform 320ms ease-in-out, opacity 320ms ease-in-out';d.p.style.transform=`translate(${r.left+r.width/2-22}px,${r.top+r.height/2-14}px) scale(.2)`;d.p.style.opacity='0';setTimeout(finish,330);}
    setTimeout(()=>{tg.classList.remove('bump');void tg.offsetWidth;tg.classList.add('bump')},RM?0:320);
    const name=(tg.dataset.drop||tg.textContent).trim();
    const n=d.group.length;const t=document.createElement('div');t.className='sm-toast sm-l2 dtoast';t.setAttribute('role','status');
    t.innerHTML='<span>'+(n>1?'Moved '+n+' links to ':'Moved to ')+name+'</span><button class="sm-btn sm-btn--sm" type="button">Undo</button>';
    document.body.appendChild(t);setTimeout(()=>t.remove(),3200);
  }else{
    if(RM){finish();return}
    d.wob.style.transition='transform 320ms cubic-bezier(.34,1.56,.64,1)';d.wob.style.transform='none';
    d.p.style.transition='transform 320ms cubic-bezier(.34,1.56,.64,1)';d.p.style.transform=`translate(${d.origin.left}px,${d.origin.top}px) scale(${d.origin.width/220})`;setTimeout(finish,330);
  }}
let pending=null;
document.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;const c=ev.target.closest('[draggable-card]');if(!c||ev.target.closest('.sb,.selbox,button:not(.open)'))return;pending={c,x:ev.clientX,y:ev.clientY,ev};ev.preventDefault()});
document.addEventListener('pointermove',ev=>{if(pending&&!drag&&Math.hypot(ev.clientX-pending.x,ev.clientY-pending.y)>6){start(pending.c,pending.ev);pending=null}if(drag){ev.preventDefault();move(ev)}},{passive:false});
document.addEventListener('pointerup',()=>{pending=null;end()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){if(drag.over)drag.over.classList.remove('droptarget');drag.over=null;end()}});
document.addEventListener('click',e=>{const sb=e.target.closest('.sb .sm-check,.selbox .sm-check');if(!sb)return;const card=sb.closest('[draggable-card]');const on=card.getAttribute('aria-selected')!=='true';card.setAttribute('aria-selected',on);sb.setAttribute('aria-checked',on);sb.innerHTML=on?'<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>':'';const host=card.closest('.state');const n=host.querySelectorAll('[draggable-card][aria-selected="true"]').length;const c=host.querySelector('.cnt');if(c)c.textContent=n+' selected'});
document.querySelectorAll('.side .sm-nav--plain').forEach(b=>{const l=b.querySelector('.lbl');if(l)b.setAttribute('data-drop',l.textContent)});
})();</script>
