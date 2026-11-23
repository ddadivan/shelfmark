const {chromium,devices}=require('playwright');const fs=require('fs');
const spec=JSON.parse(fs.readFileSync('overview/spec.json'));
const HIDE='body{padding-top:0!important}.proto,.vbar,.why,#deskbtn,[data-replay],[data-replay-drift]{display:none!important}';
async function setState(p,f,s){
  if(f==='home-variants'){await p.click('#vs [data-k='+s+']');return}
  if(f==='library'){if(s==='display'){await p.selectOption('#screen','library');await p.waitForTimeout(150);await p.click('[data-pop=display]');return}await p.selectOption('#screen',s);return}
  if(f==='save-revisit'){await p.selectOption('#screen',s);return}
  await p.selectOption('#st',s);
}
(async()=>{const b=await chromium.launch();const out=[];
async function run(ctxOpts,list,suffix,theme){const c=await b.newContext(ctxOpts);const p=await c.newPage();
 for(const [g,f,s,cap] of list){await p.goto('file://'+process.cwd()+'/design/'+(f==='library'&&suffix==='-phone'?'library_vp':f)+'.html');await p.evaluate(()=>{try{localStorage.clear();sessionStorage.clear()}catch(e){}});await p.reload();
  if(theme)await p.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);
  await setState(p,f,s);await p.addStyleTag({content:HIDE});await p.waitForTimeout(f==='public'&&s==='signin'?1800:350);
  const name=`${g}-${f}-${s}${suffix}`;await p.screenshot({path:`overview/raw/${name}.png`,fullPage:!(suffix==='-phone'||s==='display')});out.push([g,name,cap]);}
 await c.close()}
await run({viewport:{width:1280,height:860},deviceScaleFactor:1},spec,'',null);
const dark=[['dark','home-variants','b','Today in the dark theme.'],['dark','library','library','Library, dark.'],['dark','library','reader','Reader, dark.'],['dark','ask','conv','Ask, dark.'],['dark','settings','appearance','Settings, dark.']];
await run({viewport:{width:1280,height:860},deviceScaleFactor:1},dark,'-dark','dark');
const phone=[['phone','home-variants','b','Today on a phone.'],['phone','library','library','Library on a phone, tab bar at the bottom.'],['phone','save-revisit','s-ready','Add link on a phone.'],['phone','save-revisit','revisit','Revisit on a phone.'],['phone','settings','you','Settings on a phone.'],['phone','ask','phone','Ask on a phone.'],['phone','select-move','phone','Library tab and selection on a phone.']];
await run({...devices['iPhone 13'],deviceScaleFactor:2},phone,'-phone',null);
fs.writeFileSync('overview/out.json',JSON.stringify(out));console.log(out.length);await b.close()})();
