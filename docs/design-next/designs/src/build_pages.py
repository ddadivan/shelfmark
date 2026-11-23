import json
B = '/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad'
tok = json.load(open(f'{B}/ds/project/tokens.json'))
def colors(t): return ';'.join(f"--{c['name']}:{c['value'][t]}" for c in tok['color']['tokens'])
def shadows(t): return ';'.join(f"--{s['name']}:{s['value'][t]}" for s in tok['shadow']['tokens'])
other = []
for fam in ['spacing', 'radius', 'size', 'duration', 'breakpoint']: other += [f"--{x['name']}:{x['value']}" for x in tok[fam]['tokens']]
other += [f"--font-{k}:{v}" for k, v in tok['type']['families'].items()]
TOK = (f":root{{{colors('light')};{shadows('light')};{';'.join(other)}}}\n@media (prefers-color-scheme: dark){{:root:not([data-theme=\"light\"]){{{colors('dark')};{shadows('dark')};color-scheme:dark}}}}\n:root[data-theme=\"dark\"]{{{colors('dark')};{shadows('dark')};color-scheme:dark}}\n")
BUNDLE = open(f'{B}/ds/project/components/bundle.css').read()
SC = json.load(open(f'{B}/dsgen/scenes.json'))
exec(open(f'{B}/dsgen/gen.py').read().split('# ---------- icons as inline helpers ----------')[1].split('def ic(')[0])
I.update({'up': '<path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>',
 'left': '<path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>',
 'right': '<path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>',
 'chev': '<path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>',
 'hash': '<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>',
 'pin': '<path d="M9 4h6l-1 6 4 4H6l4-4zM12 14v7" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>',
 'edit': '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>',
 'share': '<path d="M12 3v12M7 8l5-5 5 5M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>',
 'restore': '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>',
 'merge': '<path d="M6 4v6a6 6 0 0 0 6 6h6M14 12l4 4-4 4M6 20v-4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>',
 'rule': '<path d="M4 6h10M4 12h7M4 18h10M17 9l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>',
 'palette': '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="8" cy="10" r="1.5" fill="currentColor"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="16" cy="10" r="1.5" fill="currentColor"/>',
 'google': '<path d="M21 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7.1z" fill="#4285F4"/><path d="M12 21.5c2.6 0 4.7-.9 6.3-2.3l-3.1-2.4c-.9.6-2 .9-3.2.9-2.5 0-4.6-1.7-5.3-3.9H3.5v2.5A9.5 9.5 0 0 0 12 21.5z" fill="#34A853"/><path d="M6.7 13.8a5.7 5.7 0 0 1 0-3.6V7.7H3.5a9.5 9.5 0 0 0 0 8.6z" fill="#FBBC05"/><path d="M12 6.3c1.4 0 2.6.5 3.6 1.4l2.7-2.7A9.5 9.5 0 0 0 3.5 7.7l3.2 2.5C7.4 8 9.5 6.3 12 6.3z" fill="#EA4335"/>',
 'github': '<path d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.7c-2.7.6-3.2-1.3-3.2-1.3-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.1-.2-4.4-1.1-4.4-4.7 0-1 .4-1.9 1-2.6-.1-.2-.4-1.2.1-2.5 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.3.2 2.3.1 2.5.6.7 1 1.6 1 2.6 0 3.7-2.3 4.5-4.4 4.7.3.3.6.9.6 1.8v2.7c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5z" fill="currentColor"/>',
})
def ic(n, s=16, cls=''): return f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" aria-hidden="true"{" class=%s" % chr(34)+cls+chr(34) if cls else ""}>{I[n]}</svg>'
def tile(c, s=14): return f'<span class="sm-tile" style="background:var(--folder-{c}-bg);color:var(--folder-{c})">{ic("folder", s)}</span>'
def fav(l): return f'<span class="sm-fav">{l}</span>'
ART = {
 'video': '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="180" fill="#1f2433"/><circle cx="230" cy="64" r="52" fill="#3d4f8f"/><path d="M0 132 80 96l70 28 80-40 90 34v62H0z" fill="rgba(0,0,0,.28)"/></svg>',
 'shirt': '<svg viewBox="0 0 200 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="250" fill="#ece7de"/><path d="M62 50 88 38l12 14 12-14 26 12 34 46-17 16-14-12v130H59V100l-14 12-17-16z" fill="#6d5b46"/></svg>',
 'bowl': '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="200" fill="#2e2620"/><circle cx="100" cy="104" r="78" fill="#1d1814"/><circle cx="100" cy="104" r="62" fill="#e9d3a8"/><path d="M58 96q20-14 40 0t40 0M56 112q22-14 44 0t44 0" fill="none" stroke="#f1d99a" stroke-width="5" stroke-linecap="round"/></svg>',
 'pancakes': '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="200" fill="#efe4d2"/><circle cx="100" cy="106" r="80" fill="#fbf7ef"/><circle cx="110" cy="94" r="44" fill="#ecc27c"/></svg>',
 'jacket': '<svg viewBox="0 0 200 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="250" fill="#e8ebee"/><path d="M60 48 84 36q16 10 32 0l24 12 32 50-18 14-12-10v128H58V102l-12 10-18-14z" fill="#2f4c6b"/></svg>',
 'type': '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="180" fill="#f1ede2"/><rect x="20" y="110" width="200" height="16" rx="4" fill="#1d1d1f"/><rect x="20" y="134" width="140" height="16" rx="4" fill="#1d1d1f"/></svg>',
 'dark': '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="180" fill="#121214"/><rect x="20" y="110" width="200" height="16" rx="4" fill="#f4f4f6"/></svg>',
}
PAGES = [('index.html', 'Library and Link page'), ('save-revisit.html', 'Save and Revisit'), ('search.html', 'Search and Ask'), ('organise.html', 'Organise'), ('settings.html', 'Settings'), ('public.html', 'Sign-in and public pages'), ('extension.html', 'Browser extension'), ('select-move.html', 'Select, move, side by side'), ('data.html', 'Import, export, sharing'), ('first-run.html', 'First run, help, landing')]

SHELL_CSS = r'''
[hidden]{display:none!important}*{box-sizing:border-box}body{margin:0}
.app{display:flex;min-height:100vh;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:16px;gap:24px}
.side{flex:none;width:var(--sidebar);position:sticky;top:16px;align-self:flex-start;height:calc(100vh - 32px);display:flex;flex-direction:column;gap:2px;padding:16px 8px;border-radius:var(--radius-lg);overflow:auto}
.side .sm-nav{width:100%}.side .sm-sec{width:auto;margin-top:12px}
.logo{display:flex;align-items:center;gap:8px;height:40px;padding:0 8px;margin-bottom:8px;font:600 1.13rem/1.25 var(--font-sans)}
.main{flex:1;min-width:0;display:flex;flex-direction:column;padding-bottom:48px}
.top{display:flex;align-items:center;gap:12px;height:40px;position:relative}
.top .sm-search{flex:1 1 auto;max-width:560px;min-width:0}
.right{margin-left:auto;display:flex;gap:8px;align-items:center}
.avatar{width:40px;height:40px;border:0;border-radius:var(--radius-full);background:var(--surface-hover);font:600 .875rem/1 var(--font-sans);color:var(--text)}
h1{margin:32px 0 0;font:600 1.6rem/1.2 var(--font-sans);text-wrap:balance}
.lead{margin:4px 0 0;color:var(--text-muted);font-size:.875rem;max-width:68ch}
.sec-t{margin:0 0 8px;font:600 1.13rem/1.25 var(--font-sans)}
.stack{display:flex;flex-direction:column;gap:24px;margin-top:24px;max-width:880px}
.row2{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start;margin-top:24px}
.lbl-s{font:500 .75rem/1.4 var(--font-sans);color:var(--text-muted)}
.rrow{display:flex;align-items:center;gap:12px;padding:8px 12px 8px 16px;min-height:48px}
.rrow .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.rrow .tt{font:600 1rem/1.5 var(--font-sans);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rrow .acts{display:flex;gap:4px;flex:none}
.sm-thumb svg{width:100%;height:100%;display:block}
mark{background:var(--accent-bg);color:var(--accent-text);border-radius:2px;padding:0 1px}
.state{display:none}.state.on{display:block}
.proto{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:110;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:4px 4px 4px 12px;border-radius:var(--radius-md);font-size:.75rem;color:var(--text-muted);max-width:calc(100vw - 32px)}
.proto select{height:28px;max-width:200px;border:1px solid var(--line-strong);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:.75rem;padding:0 8px}
.tabbar-wrap{display:none}
@media (max-width:63.99em){.side{width:var(--rail);align-items:center}.side .lbl,.side .n,.side .dot,.side .sm-sec,.side .tree{display:none}.side .sm-nav{width:48px;height:48px;justify-content:center;padding:0}.logo span{display:none}}
@media (max-width:39.99em){.top{display:none}.side{display:none}.app{padding-bottom:calc(104px + env(safe-area-inset-bottom,0px))}.top .add-btn,.top .avatar,.sm-kbd{display:none}
 .tabbar-wrap{display:block;position:fixed;left:max(16px,env(safe-area-inset-left,0px));right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:30}.tabbar-wrap .sm-tabbar{width:100%}
 .proto{bottom:auto;top:calc(8px + env(safe-area-inset-top,0px))}
 body{padding-top:96px}.sapp,body:has(.tabbar-wrap) main{padding-bottom:calc(104px + env(safe-area-inset-bottom,0px))}}
'''
def sidebar(cur=''):
    def nav(key, icon, label, extra=''):
        cur_attr = ' aria-current="page"' if key == cur else ''
        return f'<button class="sm-nav" type="button"{cur_attr} title="{label}">{ic(icon, 20)}<span class="lbl">{label}</span>{extra}</button>'
    return (f'<nav class="side sm-l1" aria-label="Library"><div class="logo"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="4" fill="var(--accent)"/><path d="M14 4h5v8l-2.5-2-2.5 2z" fill="var(--brand-notch)"/></svg><span>Shelfmark</span></div>'
        + nav('all', 'bookmark', 'All links', '<span class="n">58</span>') + nav('unsorted', 'inbox', 'Unsorted', '<span class="n">17</span>') + nav('fav', 'star', 'Favorites', '<span class="n">6</span>') + nav('revisit', 'revisit', 'Revisit', '<span class="dot">3</span>')
        + '<div class="sm-sec">Folders</div><div class="tree">'
        + ''.join(f'<button class="sm-nav sm-nav--plain" type="button"{" aria-current=%spage%s" % (chr(34), chr(34)) if cur == n.lower() else ""}>{tile(c)}<span class="lbl">{n}</span><span class="n">{k}</span></button>' for n, c, k in [('Clothes', 'rose', 7), ('Recipes', 'amber', 7), ('Work', 'ocean', 7), ('Design', 'plum', 5)])
        + f'</div><div class="sm-sec">Tags</div><div class="tree">' + ''.join(f'<button class="sm-nav sm-nav--plain" type="button">{ic("hash", 20)}<span class="lbl">{t}</span><span class="n">{k}</span></button>' for t, k in [('angular', 12), ('reading', 8), ('clothes', 7)])
        + f'</div><div style="margin-top:auto;padding-top:8px;border-top:1px solid var(--line)">{nav("trash", "trash", "Trash")}</div></nav>')
TOP = (f'<header class="top"><label class="sm-input sm-search sm-l1">{ic("search")}<input placeholder="Search or ask your shelf" aria-label="Search or ask your shelf"><span class="sm-kbd">Ctrl K</span></label>'
       f'<div class="right"><button class="sm-btn sm-btn--primary add-btn" type="button">{ic("plus")}Add link</button><button class="avatar" type="button" aria-label="Account">DU</button></div></header>')
TABBAR = f'<div class="tabbar-wrap"><nav class="sm-tabbar sm-l2" aria-label="Main"><button class="sm-tab" type="button">{ic("bookmark",20)}Library</button><button class="sm-tab" type="button">{ic("revisit",20)}Revisit</button><button class="sm-fab" type="button" aria-label="Add link">{ic("plus",24)}</button><button class="sm-tab" type="button">{ic("search",20)}Search</button><button class="sm-tab" type="button">{ic("user",20)}You</button></nav></div>'

def page(fname, title, css, states, shell='app', cur=''):
    opts = ''.join(f'<option value="{k}">{lab}</option>' for k, lab, _ in states)
    nav = ''.join(f'<option value="{f}"{" selected" if f == fname else ""}>{t}</option>' for f, t in PAGES)
    body = ''.join(f'<div class="state" data-state="{k}">{html}</div>' for k, _, html in states)
    if shell == 'app': content = f'<div class="app">{sidebar(cur)}<main class="main">{TOP}{body}</main></div>{TABBAR}'
    else: content = body
    js = '''<script>(function(){const sel=document.getElementById('st'),pg=document.getElementById('pg'),th=document.getElementById('th');
function show(k){document.querySelectorAll('.state').forEach(s=>s.classList.toggle('on',s.dataset.state===k));try{sessionStorage.setItem('st-'+location.pathname,k)}catch(e){}}
let k0=sel.value;try{const v=sessionStorage.getItem('st-'+location.pathname);if(v&&sel.querySelector('option[value="'+v+'"]'))k0=v}catch(e){}sel.value=k0;show(k0);
sel.addEventListener('change',()=>show(sel.value));pg.addEventListener('change',()=>{location.href=pg.value==='index.html'?'./':pg.value});
th.addEventListener('change',()=>{if(th.value==='system')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',th.value)});
document.querySelectorAll('[data-replay]').forEach(b=>b.addEventListener('click',()=>{const h=b.closest('.state');h.querySelectorAll('svg.sm-scene').forEach(s=>{const c=s.outerHTML;s.outerHTML=c})}));
document.addEventListener('click',e=>{const a=e.target.closest('a[href="#"]');if(a)e.preventDefault()});})();</script>'''
    html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Shelfmark {title}</title><meta name="claude:viewport-fit-sides" content="cover">
<style>{BUNDLE}
{TOK}
{SHELL_CSS}
{css}</style></head><body>
{content}
<div class="proto sm-l2" role="group" aria-label="Prototype"><span>Prototype</span>
<select id="pg" aria-label="Design group">{nav}</select>
<select id="st" aria-label="Screen">{opts}</select>
<select id="th" aria-label="Theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
{js}
</body></html>
'''
    open(f'{B}/design/{fname}', 'w').write(html)
    print('wrote', fname, len(html))
