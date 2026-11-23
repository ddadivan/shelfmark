<style>#deskbtn{height:28px;padding:0 10px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface,#fff);color:var(--text,#171717);font:500 .75rem/1 system-ui,sans-serif;white-space:nowrap}
#deskwrap{position:fixed;inset:0;z-index:1000;background:#e5e5e2;overflow:auto;-webkit-overflow-scrolling:touch}
#deskwrap iframe{border:0;display:block;transform-origin:0 0;background:#fff}
#deskclose{position:fixed;top:8px;right:8px;z-index:1001;height:36px;padding:0 14px;border:0;border-radius:8px;background:#171717;color:#fff;font:500 .875rem/1 system-ui,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.2)}
html.in-desk #deskbtn{display:none}</style>
<script>(function(){
const W=1280,inDesk=new URLSearchParams(location.search).has('desk');
if(inDesk){document.documentElement.classList.add('in-desk');return}
function open(){const s=innerWidth/W;const w=document.createElement('div');w.id='deskwrap';
 const f=document.createElement('iframe');const u=new URL(location.href);u.searchParams.set('desk','1');f.src=u.toString();f.title='Desktop view';
 const h=Math.round(innerHeight/s);f.style.width=W+'px';f.style.height=h+'px';f.style.transform='scale('+s+')';
 const box=document.createElement('div');box.style.width=(W*s)+'px';box.style.height=(h*s)+'px';box.style.overflow='hidden';box.appendChild(f);w.appendChild(box);
 const c=document.createElement('button');c.id='deskclose';c.type='button';c.textContent='Back to phone view';c.onclick=()=>{w.remove();c.remove();document.body.style.overflow=''};
 document.body.appendChild(w);document.body.appendChild(c);document.body.style.overflow='hidden';c.focus()}
function add(){const host=document.querySelector('[data-desk-host]');if(!host)return;const b=document.createElement('button');b.id='deskbtn';b.type='button';b.textContent='Desktop view';b.title='See the 1280px desktop layout scaled to this screen';b.onclick=open;host.appendChild(b);
 const mq=matchMedia('(max-width:63.99em)');const upd=()=>{b.hidden=!mq.matches};upd();mq.addEventListener('change',upd)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();</script>
