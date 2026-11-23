import re
import json
B = '/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad'
tok = json.load(open(f'{B}/ds4/project/tokens.json'))
def colors(t): return ';'.join(f"--{c['name']}:{c['value'][t]}" for c in tok['color']['tokens'])
def shadows(t): return ';'.join(f"--{s['name']}:{s['value'][t]}" for s in tok['shadow']['tokens'])
other = []
for fam in ['spacing', 'radius', 'size', 'duration', 'breakpoint']: other += [f"--{x['name']}:{x['value']}" for x in tok[fam]['tokens']]
other += [f"--font-{k}:{v}" for k, v in tok['type']['families'].items()]
TOK = (f":root{{{colors('light')};{shadows('light')};{';'.join(other)}}}\n@media (prefers-color-scheme: dark){{:root:not([data-theme=\"light\"]){{{colors('dark')};{shadows('dark')};color-scheme:dark}}}}\n:root[data-theme=\"dark\"]{{{colors('dark')};{shadows('dark')};color-scheme:dark}}\n")
BUNDLE = open(f'{B}/ds4/project/components/bundle.css').read()
SC = json.load(open(f'{B}/dsgen4/scenes_v3.json'))
exec(open(f'{B}/dsgen4/gen.py').read().split('# ---------- icons as inline helpers ----------')[1].split('def ic(')[0])
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

# v4: real previews from the reference, served as files next to the pages
_img = lambda f, fit='cover', pos='center': f'<img src="img/{f}" alt="" style="display:block;width:100%;height:100%;object-fit:{fit};object-position:{pos};background:var(--surface-hover)">'
ART.update({'bowl': _img('tree-runners.webp', 'contain'), 'pancakes': _img('nihilism.webp'), 'nn': _img('neural-network.webp'), 'ms': _img('microservices.webp'), 'video': _img('angular100.webp'), 'shirt': _img('crater-shirt.webp', 'contain'), 'jacket': _img('ojai-jacket.webp', 'contain'), 'dark': _img('typescript100.webp')})
PAGES = [('index.html', 'Library and Link page'), ('save-revisit.html', 'Save and Revisit'), ('search.html', 'Search'), ('organise.html', 'Organise'), ('settings.html', 'Settings'), ('public.html', 'Sign-in and public pages'), ('extension.html', 'Browser extension'), ('select-move.html', 'Select, move, side by side'), ('data.html', 'Import, export, sharing'), ('first-run.html', 'First run, help, landing'), ('ask.html', 'Ask your shelf'), ('notify.html', 'Reminders and notifications'), ('views.html', 'Views, dates, shortcuts'), ('system.html', 'System states'), ('tools.html', 'Assistant, clean-up, help')]

SHELL_CSS = r'''
[hidden]{display:none!important}*{box-sizing:border-box}body{margin:0}
.app{display:flex;min-height:100vh;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:16px;gap:24px}
.side{flex:none;width:var(--sidebar);position:sticky;top:16px;align-self:flex-start;height:calc(100vh - 32px);display:flex;flex-direction:column;gap:2px;padding:16px 8px;border-radius:var(--radius-lg);overflow:auto}
.side .sm-nav{width:100%}.side .sm-sec{width:auto;margin-top:12px}
.logo{display:flex;align-items:center;gap:8px;height:40px;padding:0 8px;margin-bottom:8px;font:600 1.125rem/1.25 var(--font-sans)}
.main{flex:1;min-width:0;display:flex;flex-direction:column;padding-bottom:48px}
.top{display:flex;align-items:center;gap:12px;height:40px;position:relative}
.top .sm-search{flex:1 1 auto;max-width:560px;min-width:0}
.right{margin-left:auto;display:flex;gap:8px;align-items:center}
.avatar{width:40px;height:40px;border:0;border-radius:var(--radius-full);background:var(--surface-hover);font:600 .875rem/1 var(--font-sans);color:var(--text)}
h1{margin:32px 0 0;font:600 2rem/1.2 var(--font-sans);text-wrap:balance}
.lead{margin:4px 0 0;color:var(--text-muted);font-size:.875rem;max-width:68ch}
.sec-t{margin:0 0 8px;font:600 1.125rem/1.25 var(--font-sans)}
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
@media (max-width:63.99em){.side{width:var(--rail);align-items:center}.side .lbl,.side .n,.side .dot,.side .sm-sec,.side .tree,.side .grp+.grp{display:none}.side .sm-nav{width:48px;height:48px;justify-content:center;padding:0}.logo span{display:none}}
@media (max-width:39.99em){.top{display:none}.side{display:none}.app{padding-bottom:calc(104px + env(safe-area-inset-bottom,0px))}.top .add-btn,.top .avatar,.sm-kbd{display:none}
 .tabbar-wrap{display:block;position:fixed;left:max(16px,env(safe-area-inset-left,0px));right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:30}.tabbar-wrap .sm-tabbar{width:100%}
 .proto{bottom:auto;top:calc(8px + env(safe-area-inset-top,0px))}
 body{padding-top:96px}.sapp,body:has(.tabbar-wrap) main{padding-bottom:calc(104px + env(safe-area-inset-bottom,0px))}}
/* ===== v4 shell (Shelf) ===== */
body{background:var(--canvas);color:var(--text);font-family:var(--font-sans)}
.app{padding:0;gap:0}
.side{background:var(--sidebar)!important;box-shadow:none!important;width:240px;padding:16px 12px;top:0;height:100vh;border-radius:0;border-right:1px solid var(--sep);gap:24px}
.side>*{flex-shrink:0}
.brandrow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-right:4px}
.logo{display:flex;align-items:center;gap:8px;height:32px;padding:0 8px;margin:0;font:600 1rem/1.5rem var(--font-sans)}
.brandrow .avatar{width:32px;height:32px;font-size:.75rem;font-weight:500;background:var(--surface-pressed)}
.sbtop{display:flex;flex-direction:column;gap:12px;padding:0 4px;margin-top:-12px}
.sbtop .sm-btn{width:100%;height:40px;justify-content:center;padding:0 16px;gap:8px}
.side .grp{display:flex;flex-direction:column;gap:2px}
.side .grp+.grp{border-top:1px solid var(--sep);padding-top:16px}
.side .sm-sec{margin-top:0;padding-left:4px}
.side .sm-nav{width:100%}
.side .side-foot{margin-top:auto;display:flex;flex-direction:column;gap:2px}
.intro{position:relative;display:flex;flex-direction:column;gap:4px;margin-bottom:8px;padding:12px 36px 12px 12px;border-radius:12px;background:var(--surface-hover);font-size:.875rem;line-height:1.375rem}
.intro a{font-weight:500;color:var(--text);text-decoration:none}.intro .t{display:inline-flex;gap:6px;align-items:center;font-size:.75rem;color:var(--text-muted)}
.intro .x{position:absolute;top:8px;right:8px;width:28px;height:28px}
.main{margin:0;padding:16px 32px 48px;border-radius:0;background:var(--canvas);min-height:100vh}
.top{display:grid;grid-template-columns:minmax(0,640px) 1fr auto;align-items:center;gap:8px;height:auto}
.top .sm-search{grid-column:1;max-width:none;min-width:0}
.top .sm-search input{font-size:1rem}
.ask-top{grid-column:3;position:relative;overflow:hidden;isolation:isolate;height:40px;background:var(--surface-hover);color:var(--text)}
.ask-top svg{color:var(--text)}
.ask-top::before{content:"";position:absolute;inset:-60%;z-index:-1;background:conic-gradient(from 0deg,var(--wave-1),var(--wave-2),var(--wave-3),var(--wave-4),var(--wave-1),var(--wave-2),var(--wave-3),var(--wave-4),var(--wave-1));filter:blur(28px);opacity:0;transition:opacity 600ms cubic-bezier(.2,.7,.2,1);animation:sm-wave 9s linear infinite;animation-play-state:paused}
.ask-top:hover{background:var(--surface-hover);color:#0E0E10}.ask-top:hover svg{color:#0E0E10}
.ask-top:hover::before,.ask-top:focus-visible::before{opacity:.6;animation-play-state:running}
@keyframes sm-wave{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.ask-top::before{animation:none}}
h1{margin:32px 0 0;font:600 1.5rem/1.875rem var(--font-sans);letter-spacing:-.01em}
.sapp{padding:0!important;gap:0!important}
.snav{background:var(--sidebar)!important;box-shadow:none!important;width:240px!important;padding:16px 12px!important;top:0!important;border-radius:0!important;height:100vh!important;border-right:1px solid var(--sep)}
.smain{margin:0!important;padding:16px 32px 56px!important;border-radius:0;background:var(--canvas);max-width:none!important;min-height:100vh}
.smain>*{max-width:840px;margin-left:auto;margin-right:auto}
@media (max-width:63.99em){.side,.snav{display:none!important}.main,.smain{padding:16px 24px 112px!important}.top{display:grid!important;height:auto!important;grid-template-columns:minmax(0,1fr) auto}.ask-top{display:none}.top-av{display:grid!important}.top .sm-kbd{display:none}
 body{padding-top:0!important}.app{padding-bottom:0!important}
 .tabbar-wrap{display:block!important;position:fixed;left:max(8px,env(safe-area-inset-left,0px));right:max(8px,env(safe-area-inset-right,0px));bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:30}
 .tabbar-wrap .sm-tabbar{width:100%;height:64px;justify-content:space-around;border-radius:12px;background:var(--surface);box-shadow:0 4px 24px rgba(0,0,0,.10)}
 .tabbar-wrap .sm-tab{width:64px;height:48px;border-radius:8px;font-weight:400}.tabbar-wrap .sm-tab[aria-current="page"]{background:var(--surface-pressed);font-weight:500}
 .tabbar-wrap .sm-fab{width:48px;height:48px;border-radius:12px}
 .proto{bottom:calc(84px + env(safe-area-inset-bottom,0px))!important;top:auto!important}
 .lcmas{columns:3 160px!important}.lcgrid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
@media (max-width:39.99em){.main,.smain{padding:16px 16px 104px!important}.lcmas{columns:2!important;column-gap:12px!important}.lcmas .lc{margin-bottom:12px}.lcgrid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}}
@media (max-width:39.99em){.main,.smain{padding:16px 16px 104px!important;min-height:100vh}.top .sm-search{height:44px}}

'''
SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/></svg>'
DOWN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>'
DOTS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>'
CLOCK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
LOGO4 = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4" fill="currentColor"/><path d="M14 4v7l2.5-1.8L19 11V4z" fill="var(--sidebar)"/></svg>'
# v4: the home page's link card, from the same 14 links (v4links.json)
V4 = json.load(open(f'{B}/dsgen4/v4links.json'))
FAVC = {'youtube.com': ('#FF0033', '#fff'), 'github.com': ('#1F2328', '#fff'), 'allbirds.com': ('#212A2F', '#fff'), 'taylorstitch.com': ('#8A5A2B', '#fff')}
STAR = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>'
PLAY = '<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>'
FIC = lambda c: f'<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" style="color:var(--folder-{c})"><path fill="currentColor" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
def lcard(i, grid=False, sel=None, mark=None, note=True, tags=True):
    l = V4[i - 1]; f = FAVC.get(l['domain'], ('var(--surface-pressed)', 'var(--text)'))
    t = l['title']
    if mark:
        for w in mark: t = re.sub('(' + re.escape(w) + ')', r'<mark>\1</mark>', t, flags=re.I)
    fit = 'contain' if l['kind'] == 'shop' else 'cover'; pos = 'left center' if l['kind'] == 'repo' else 'center'
    ratio = '4 / 3' if grid else l['ratio']
    chk = '' if sel is None else f'<span class="sm-check lc-sel" role="checkbox" aria-checked="{str(sel).lower()}" aria-label="Select {l["title"]}">{ic("check", 14) if sel else ""}</span>'
    play = f'<span class="gl play">{PLAY}</span>' if l['kind'] == 'video' and sel is None else ''
    return (f'<article class="sm-lcard lc" aria-selected="{str(bool(sel)).lower()}"><span class="tile" style="aspect-ratio:{ratio}"><img src="{l["img"]}" alt="" loading="lazy" style="display:block;width:100%;height:100%;object-fit:{fit};object-position:{pos}">{play}{chk}<span class="gl star{" on" if l.get("fav") else ""}">{STAR}</span></span>'
            f'<span class="bd"><span class="mt"><span class="f">{FIC(l["c"])}{l["folder"]}</span><span class="d">{l["date"]}</span></span><span class="tt">{t}</span><span class="src"><i style="background:{f[0]};color:{f[1]}">{l["domain"][0].upper()}</i>{l["sub"]}</span>'
            + (f'<span class="tg">{"".join("<span>#" + x + "</span>" for x in l["tags"][:3])}</span>' if tags and l['tags'] else '')
            + (f'<span class="sm-note">{ic("edit", 12)} {l["note"]}</span>' if note and l.get('note') else '') + '</span></article>')
LC_CSS = r'''
.lc{width:auto}.sm-lcard .src,.sm-lcard .mt,.sm-lcard .tg{border:0;padding:0;background:none;border-radius:0;box-shadow:none}.lc .tile img{transition:transform 900ms cubic-bezier(.2,.7,.2,1)}.lc:hover .tile img{transform:scale(1.035)}
.lc .lc-sel{position:absolute;top:10px;left:10px;width:22px;height:22px;border-radius:6px;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--control)}
.lc .lc-sel[aria-checked="true"]{background:var(--accent);color:var(--on-accent);box-shadow:none}
.lc[aria-selected="true"]{background:var(--pick)}
.lc .sm-note{align-items:center}.lc .sm-note svg{flex:none}
.lcgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:22px;margin-top:24px;align-items:start}
.lcmas{columns:auto 220px;column-gap:22px;margin-top:24px}.lcmas .lc{break-inside:avoid;margin-bottom:22px}
'''
SHELL_CSS = SHELL_CSS + LC_CSS

def sidebar(cur=''):
    def nav(key, icon, label, extra='', raw=None):
        cur_attr = ' aria-current="page"' if key == cur else ''
        return f'<button class="sm-nav" type="button"{cur_attr} title="{label}">{raw or ic(icon, 16)}<span class="lbl">{label}</span>{extra}</button>'
    def sec(label, add=''):
        plus = f'<button class="sm-ib" type="button" aria-label="{add}" title="{add}">{ic("plus", 14)}</button>' if add else ''
        return f'<div class="sm-sec"><button class="sm-sec-t" type="button" aria-expanded="true">{label}{ic("chev", 14)}</button>{plus}</div>'
    fold = lambda n, c, k: f'<button class="sm-nav sm-nav--plain" type="button"{" aria-current=%spage%s" % (chr(34), chr(34)) if cur == n.lower() else ""}><span class="sm-ficon" style="color:var(--folder-{c})">{ic("folder", 16)}</span><span class="lbl">{n}</span><span class="n">{k}</span></button>'
    return (f'<nav class="side" aria-label="Library"><div class="brandrow"><div class="logo">{LOGO4}<span>Shelfmark</span></div><button class="avatar" type="button" aria-label="Account">DU</button></div>'
        + f'<div class="sbtop"><button class="sm-btn sm-btn--primary add-btn" type="button">{ic("plus")}<span>Add link</span></button></div>'
        + '<div class="grp">' + nav('all', 'bookmark', 'All links', '<span class="n">17</span>') + nav('unsorted', 'inbox', 'Unsorted', '<span class="n">3</span>') + nav('fav', 'star', 'Favorites', '<span class="n">3</span>') + nav('revisit', 'revisit', 'Today', '<span class="dot">3</span>') + nav('recent', '', 'Recently opened', raw=CLOCK) + '</div>'
        + '<div class="grp">' + sec('Pinned') + '<div class="tree">' + fold('Angular', 'clay', 2) + '</div></div>' + '<div class="grp">' + sec('Folders', 'New folder') + '<div class="tree">' + ''.join(fold(n, c, k) for n, c, k in [('Angular', 'clay', 2), ('Tools', 'ocean', 4), ('Learning', 'sage', 6), ('Shopping', 'rose', 4), ('Watch later', 'plum', 1)]) + '</div></div>'
        + '<div class="grp">' + sec('Tags', 'New tag') + '<div class="tree">' + ''.join(f'<button class="sm-nav sm-nav--plain" type="button">{ic("hash", 16)}<span class="lbl">{t}</span><span class="n">{k}</span></button>' for t, k in [('video', 6), ('design', 2), ('shoes', 2)]) + '</div></div>'
        + f'<div class="side-foot"><aside class="intro"><a href="#">New here? See how it works</a><span class="t">{ic("play", 12)}3 minutes</span><button class="sm-ib x" type="button" aria-label="Hide">{ic("x", 14)}</button></aside>'
        + nav('theme', '', 'Theme', raw=SUN) + nav('ext', '', 'Get the extension', raw=DOWN) + nav('help', '', 'Data and help', raw=DOTS) + nav('trash', 'trash', 'Trash') + '</div></nav>')
TOP = (f'<header class="top"><div class="sm-input sm-search" role="search">{ic("search")}<input placeholder="Search links, folders and tags" aria-label="Search links, folders and tags"><span class="sm-kbd">Ctrl K</span></div>'
       f'<a class="sm-btn ask-top" href="ask.html" title="Ask your shelf (Ctrl J)">{ic("spark")}<span>Ask</span></a><button class="avatar top-av" type="button" aria-label="Account and settings" style="display:none;place-items:center;width:40px;height:40px;font-size:.75rem;font-weight:500;background:var(--surface-pressed)">DU</button></header>')
TABBAR = f'<div class="tabbar-wrap"><nav class="sm-tabbar sm-l2" aria-label="Main"><button class="sm-tab" type="button">{ic("revisit",20)}Today</button><button class="sm-tab" type="button">{ic("bookmark",20)}Library</button><button class="sm-fab" type="button" aria-label="Add link">{ic("plus",24)}</button><button class="sm-tab" type="button">{ic("search",20)}Search</button><a class="sm-tab" href="ask.html" style="text-decoration:none">{ic("spark",20).replace("aria-hidden", "style=%scolor:var(--ai)%s aria-hidden" % (chr(34), chr(34)))}Ask</a></nav></div>'

SEARCH_JS = '''<script>(function(){const i=document.querySelector('.top .sm-search input');if(!i)return;
const go=v=>{location.href='./?q='+encodeURIComponent(v)};
i.addEventListener('input',()=>{if(i.value.trim())go(i.value)});i.addEventListener('keydown',e=>{if(e.key==='Enter')go(i.value)});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();i.focus();i.select()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='j'){e.preventDefault();location.href='ask.html'}});})();</script>'''


LC_ORDER = [1, 4, 5, 2, 9, 3, 6, 8, 7, 10, 11, 12, 13, 14]
def v4cards(html, order=None):
    """Swap the old generic cards (sm-card) for the home page's card, in turn through the real links."""
    seq = list(order or LC_ORDER); k = [0]
    def rep(m):
        whole = m.group(0)
        if 'data-pv' in whole or 'pvcard' in whole or 'flt' in html[max(0, m.start() - 40):m.start()]: return whole
        i = seq[k[0] % len(seq)]; k[0] += 1
        sel = None
        ms = re.search(r'aria-selected="(true|false)"', m.group(1))
        if ms: sel = ms.group(1) == 'true'
        return lcard(i, sel=sel)
    return re.sub(r'<article class="sm-card sm-l1([^>]*)>.*?</article>', rep, html, flags=re.S)

def page(fname, title, css, states, shell='app', cur=''):
    opts = ''.join(f'<option value="{k}">{lab}</option>' for k, lab, _ in states)
    nav = ''.join(f'<option value="{f}"{" selected" if f == fname else ""}>{t}</option>' for f, t in PAGES)
    body = ''.join(f'<div class="state" data-state="{k}">{v4cards(html, globals().get("PAGE_ORDER"))}</div>' for k, _, html in states)
    if shell == 'app': content = f'<div class="app">{sidebar(cur)}<main class="main">{TOP}{body}</main></div>{TABBAR}'
    else: content = body
    js = '''<script>(function(){const sel=document.getElementById('st'),pg=document.getElementById('pg'),th=document.getElementById('th');
function show(k){document.querySelectorAll('.state').forEach(s=>s.classList.toggle('on',s.dataset.state===k));const st=document.querySelector('.state.on'),qi=document.querySelector('.top .sm-search input');if(qi&&st){const d=st.querySelector('[data-q]');qi.value=d?d.dataset.q:''}try{sessionStorage.setItem('st-'+location.pathname,k)}catch(e){}}
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
<div class="proto sm-l2" role="group" aria-label="Prototype" data-desk-host><span>Prototype</span>
<select id="pg" aria-label="Design group">{nav}</select>
<select id="st" aria-label="Screen">{opts}</select>
<select id="th" aria-label="Theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
{js}
{open('/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/dsgen4/desk.js').read()}
{open('/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/dsgen4/motion.js').read()}
'''+SEARCH_JS+'''</body></html>
'''
    open(f'{B}/design4/{fname}', 'w').write(html)
    print('wrote', fname, len(html))
