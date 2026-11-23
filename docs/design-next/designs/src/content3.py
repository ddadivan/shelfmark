exec(open('/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/dsgen/build_pages.py').read())

CSS = r'''
.vbar{position:sticky;top:0;z-index:60;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px max(16px,env(safe-area-inset-left,0px));background:var(--canvas);border-bottom:1px solid var(--line)}
.vbar b{font:600 .875rem/1.4 var(--font-sans)}
.vbar .sm-seg{flex:0 1 auto;min-width:0;max-width:100%;overflow-x:auto;scrollbar-width:none}.vbar .sm-seg button{flex:none}
@media (max-width:39.99em){.vbar b{display:none}.vbar select{margin-left:0}}
.vbar select{height:32px;border:1px solid var(--line-strong);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:.75rem;padding:0 8px;margin-left:auto}
.why{margin:16px max(16px,env(safe-area-inset-left,0px)) 0;padding:16px 20px;border-radius:var(--radius-md);display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;font-size:.875rem}
.why h2{margin:0 0 4px;font:600 1rem/1.4 var(--font-sans)}
.why p{margin:0;color:var(--text-muted);line-height:1.5}
.why ul{margin:0;padding-left:18px;color:var(--text-muted);line-height:1.5}
.v{display:none}.v.on{display:block}.why.v.on{display:grid}
.twocol .gem{grid-template-columns:1fr;gap:12px}.twocol .gem .sm-cover{aspect-ratio:16/7}
.app{min-height:auto}
.feed{columns:4 200px;column-gap:16px;margin-top:16px}.feed .sm-card{width:auto;margin-bottom:16px;break-inside:avoid}
.headrow{display:flex;align-items:baseline;gap:12px;margin-top:32px;flex-wrap:wrap}
.headrow h1{margin:0}
.headrow .tools{margin-left:auto;display:flex;gap:8px;align-items:center}
.sec{margin-top:32px}
.sech{display:flex;align-items:baseline;gap:8px;margin-bottom:12px}
.sech h2{margin:0;font:600 1.125rem/1.25 var(--font-sans)}
.sech .n{font-size:.75rem;color:var(--text-muted)}
.sech a{margin-left:auto;font-size:.875rem;color:var(--text-muted);text-decoration:none}
.back{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.bk{display:flex;gap:12px;padding:12px;border-radius:var(--radius-md);align-items:flex-start}
.bk .sm-thumb{width:72px;height:56px;flex:none}
.bk .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.bk b{font:600 1rem/1.35 var(--font-sans);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bk .why2{font-size:.75rem;color:var(--text-muted);display:flex;gap:6px;align-items:center}
.bk .why2.due{color:var(--warning)}
.prog{height:3px;border-radius:2px;background:var(--line);overflow:hidden;margin-top:4px}.prog i{display:block;height:100%;background:var(--accent)}
.saved{border-radius:var(--radius-md)}
.sv{display:flex;align-items:center;gap:12px;padding:8px 16px;min-height:52px}
.sv+.sv{border-top:1px solid var(--line)}
.sv .tx{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.875rem;font-weight:500}
.sv .to{display:flex;align-items:center;gap:6px;font-size:.75rem;color:var(--text-muted);white-space:nowrap}
.sv .to b{color:var(--text);font-weight:500}
.gem{display:grid;grid-template-columns:240px 1fr;gap:20px;padding:16px;border-radius:var(--radius-md);align-items:center}
.gem .sm-cover{margin:0;border-radius:var(--radius-sm);overflow:hidden;aspect-ratio:16/10}
.gem h3{margin:4px 0 6px;font:600 1.125rem/1.3 var(--font-sans)}
.gem p{margin:0;font-size:.875rem;color:var(--text-muted)}
.gem .acts{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.twocol{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:24px}.twocol>*{min-width:0}
@media (max-width:39.99em){.sv{flex-wrap:wrap;row-gap:2px}.sv .tx{flex:1 1 60%}.sv .to{flex:1 1 calc(100% - 120px);padding-left:60px}}
.askbar{display:flex;align-items:center;gap:12px;height:56px;padding:0 8px 0 16px;border-radius:var(--radius-md);font-size:1rem;color:var(--text-muted);margin-top:16px}
.askbar input{flex:1;border:0;outline:0;background:transparent;font:400 1rem/1.5 var(--font-sans);color:var(--text)}
.qs{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.qs .sm-chip{font-weight:400}
/* C: editorial */
.v-c h1,.v-c .sech h2,.v-c .gem h3{font-family:var(--font-serif);font-weight:600;letter-spacing:-.005em}
.v-c h1{font-size:2rem}
.v-c .sech h2{font-size:1.375rem}
.v-c .gem h3{font-size:1.375rem}
.v-c .datel{font-family:var(--font-serif);font-style:italic;color:var(--text-muted);font-size:1rem}
.notecard .sm-card-body{position:relative}
.label{display:flex;gap:8px;margin:8px 0 0;padding:8px 10px;border-radius:var(--radius-sm);font-size:.75rem;line-height:1.4;background:var(--lbg);color:var(--lfg)}
.label svg{flex:none;margin-top:2px}
.v-sage{--accent:#3B7443;--on-accent:#FFFFFF;--accent-bg:#E4EFE4;--accent-text:#2E5E35}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .v-sage{--accent:#86C08E;--on-accent:#0F1A10;--accent-bg:#1B2A1D;--accent-text:#A9CFA3}}
:root[data-theme="dark"] .v-sage{--accent:#86C08E;--on-accent:#0F1A10;--accent-bg:#1B2A1D;--accent-text:#A9CFA3}
/* D: ask first */
.askhome{max-width:720px;margin:72px auto 0;text-align:center}
.askhome h1{margin:0;font:600 2rem/1.15 var(--font-sans);letter-spacing:-.01em}
.askhome .askbar{height:64px;margin-top:24px;text-align:left}
.askhome .qs{justify-content:center}
.cont{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:48px;text-align:left}
@media (max-width:63.99em){.why.v.on{grid-template-columns:1fr}.back,.cont{grid-template-columns:1fr}.twocol{grid-template-columns:minmax(0,1fr)}.gem{grid-template-columns:1fr}}
@media (max-width:39.99em){.app{padding-bottom:calc(104px + env(safe-area-inset-bottom,0px))}.askhome{margin-top:24px}}
.top{display:flex}
@media (max-width:39.99em){.top{display:none}}
'''
CARDS = [('video', '16/9', 'Signal Forms in 20 minutes', 'youtube.com', '', ''), ('shirt', '4/5', 'Wool overshirt', 'uniqlo.com', 'Wait for the sale', 'rose'), ('bowl', '1/1', 'Rich tonkotsu ramen broth', 'seriouseats.com', 'Start on Friday evening', 'amber'), ('jacket', '4/5', 'Nano Puff jacket', 'patagonia.com', '', ''), ('pancakes', '1/1', 'Lemon ricotta pancakes', 'smittenkitchen.com', '', ''), ('dark', '16/9', 'Zoneless change detection', 'angular.dev', 'Read before migrating the dashboard', 'clay'), ('type', '16/9', 'Learn accessibility', 'web.dev', '', '')]
def card(a, r, t, d, note='', c='', label=False):
    nb = ''
    if note and label: nb = f'<p class="label" style="--lbg:var(--folder-{c}-bg);--lfg:var(--folder-{c})">{ic("edit", 12)}<span>{note}</span></p>'
    elif note: nb = f'<p class="sm-sum" style="margin:4px 0 0;font-size:.875rem;color:var(--text)">{note}</p>'
    return f'<article class="sm-card sm-l1{" notecard" if label else ""}"><div class="sm-cover" style="aspect-ratio:{r}">{ART[a]}</div><div class="sm-card-body"><h3 class="sm-card-title">{t}</h3>{nb}<div class="sm-meta">{fav(d[0].upper())}{d}</div></div></article>'
feed = lambda label=False, n=7: '<div class="feed">' + ''.join(card(*x, label=label) for x in CARDS[:n]) + '</div>'
tools = f'<div class="tools"><button class="sm-btn sm-btn--sm" type="button">{ic("filter")}Filter</button><div class="sm-seg" role="radiogroup" aria-label="View"><button role="radio" aria-checked="true" aria-label="Masonry">{ic("masonry")}</button><button role="radio" aria-checked="false" aria-label="Grid">{ic("grid")}</button><button role="radio" aria-checked="false" aria-label="List">{ic("list")}</button></div></div>'
chips = '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">' + ''.join(f'<button class="sm-chip" aria-pressed="{str(i == 0).lower()}" type="button">{t} <b style="font-weight:400;color:var(--text-muted)">{n}</b></button>' for i, (t, n) in enumerate([('All', 58), ('Videos', 8), ('Articles', 23), ('Clothes', 7), ('Recipes', 7)])) + '</div>'
APP = lambda body, cur='all': f'<div class="app">{sidebar(cur)}<main class="main">{TOP}{body}</main></div>'
SB_TODAY = lambda: sidebar('all').replace('<span class="lbl">All links</span>', '<span class="lbl">All links</span>').replace(f'title="All links">', 'title="All links">', 1)
def sidebar_today():
    s = sidebar('')
    item = f'<button class="sm-nav" type="button" aria-current="page" title="Today">{ic("revisit", 20)}<span class="lbl">Today</span><span class="dot">3</span></button>'
    s = s.replace('<button class="sm-nav" type="button" title="All links">', item + '<button class="sm-nav" type="button" title="All links">', 1)
    return s.replace(f'<button class="sm-nav" type="button" title="Revisit">{ic("revisit", 20)}<span class="lbl">Revisit</span><span class="dot">3</span></button>', '')
APPT = lambda body: f'<div class="app">{sidebar_today()}<main class="main">{TOP}{body}</main></div>'

BACK = [('shirt', 'Wool overshirt', 'You asked to check the sale', 'due', 'bell', None), ('dark', 'Zoneless change detection', '40% read · 4 min left', '', 'text', 40), ('video', 'Signal Forms in 20 minutes', 'Stopped at 12:40 of 19:42', '', 'play', 64)]
def back():
    return '<div class="back">' + ''.join(f'<article class="bk sm-l1"><span class="sm-thumb">{ART[a]}</span><span class="tx"><b>{t}</b><span class="why2 {k}">{ic(i, 12)}{w}</span>{f"<span class=prog><i style=width:{p}%></i></span>" if p else ""}</span></article>' for a, t, w, k, i, p in BACK) + '</div>'
SAVED = [('bowl', 'Rich tonkotsu ramen broth from scratch', 'Recipes', 'amber', 'rule'), ('jacket', 'Nano Puff jacket', 'Clothes', 'rose', 'AI'), ('type', 'Learn accessibility', 'Courses', 'sage', 'you'), ('video', 'Sourdough for beginners', 'Unsorted', 'graphite', '')]
def saved():
    return '<div class="saved sm-l1">' + ''.join(f'<div class="sv"><span class="sm-thumb" style="width:48px;height:36px">{ART[a]}</span><span class="tx">{t}</span><span class="to">→ {tile(c, 12)}<b>{f}</b>{(" · " + ("by rule" if by == "rule" else "by AI" if by == "AI" else "")) if by in ("rule", "AI") else ""}</span>{"<button class=%ssm-btn sm-btn--sm%s type=button>Undo</button>" % (chr(34), chr(34)) if by == "AI" else ""}</div>' for a, t, f, c, by in SAVED) + '</div>'
gem = f'''<div class="gem sm-l1"><div class="sm-cover">{ART['pancakes']}</div><div><span class="lbl-s">{ic("revisit", 12)} Saved 5 months ago · never opened</span><h3>Lemon ricotta pancakes</h3><p>You saved it with “for a lazy Sunday”. It’s Sunday in six days.</p><div class="acts"><button class="sm-btn sm-btn--primary sm-btn--sm" type="button">Open</button><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Remind me Sunday</button><button class="sm-btn sm-btn--sm" type="button">Not interested</button></div></div></div>'''

VA = APP(f'<div class="headrow"><h1>All links</h1><span class="lead" style="margin:0">58 links</span>{tools}</div>{chips}{feed()}')
VB = APPT(f'''<div class="headrow"><h1>Today</h1><span class="lead" style="margin:0">Monday, 23 November</span></div>
<section class="sec"><div class="sech"><h2>Back to these</h2><span class="n">3</span><a href="#">Revisit{ic("right", 14)}</a></div>{back()}</section>
<div class="twocol"><section class="sec"><div class="sech"><h2>Saved this week</h2><span class="n">12 · 9 filed for you</span><a href="#">All{ic("right", 14)}</a></div>{saved()}</section>
<section class="sec"><div class="sech"><h2>From your shelf</h2></div>{gem}</section></div>
<section class="sec"><div class="sech"><h2>All links</h2><span class="n">58</span><a href="#">Open library{ic("right", 14)}</a></div>{feed(n=4)}</section>''')
VC = f'<div class="v-sage v-c">' + APPT(f'''<div class="headrow"><h1>Today</h1><span class="datel">Monday, 23 November</span></div>
<section class="sec"><div class="sech"><h2>Back to these</h2><span class="n">3</span><a href="#">Revisit{ic("right", 14)}</a></div>{back()}</section>
<div class="twocol"><section class="sec"><div class="sech"><h2>Saved this week</h2><span class="n">12 · 9 filed for you</span><a href="#">All{ic("right", 14)}</a></div>{saved()}</section>
<section class="sec"><div class="sech"><h2>From your shelf</h2></div>{gem}</section></div>
<section class="sec"><div class="sech"><h2>Your shelf</h2><span class="n">58</span><a href="#">Open library{ic("right", 14)}</a></div>{feed(label=True)}</section>''') + '</div>'
VD = APPT(f'''<div class="askhome"><h1>What are you looking for?</h1><p class="lead" style="margin:8px auto 0">Search 58 links by words or meaning, or ask a question.</p>
<label class="askbar sm-l2">{ic("spark", 20).replace('aria-hidden="true"', 'aria-hidden="true" style="color:var(--ai)"')}<input placeholder="That ramen recipe with the soft egg…" aria-label="Search or ask your shelf"><span class="sm-kbd">Ctrl K</span></label>
<div class="qs">{''.join(f'<button class="sm-chip" type="button">{q}</button>' for q in ['Which Signal Forms video first?', 'Coats I saved in autumn', 'Recipes for this weekend', '#reading I never opened'])}</div>
<div class="cont">{''.join(f'<article class="bk sm-l1"><span class="sm-thumb">{ART[a]}</span><span class="tx"><b>{t}</b><span class="why2 {k}">{ic(i, 12)}{w}</span>{f"<span class=prog><i style=width:{p}%></i></span>" if p else ""}</span></article>' for a, t, w, k, i, p in BACK)}</div>
<p class="lbl-s" style="margin-top:12px">Pick up where you left off · <a href="#" style="color:inherit">Revisit</a></p></div>''')

WHY = {
 'a': ('Now: library first', 'The same first screen as every bookmark app: sidebar, toolbar, a wall of cards.', ['Familiar, nothing to learn', 'Hides everything that makes Shelfmark different', 'Looks like Raindrop, Pocket, mymind']),
 'b': ('Today', 'The first screen answers “what should I come back to?” before “what do I have?”. The library is one click away and still under the fold.', ['Shows the product: reminders, reading progress, auto-filing with Undo, a forgotten link', 'Sidebar: Today replaces Revisit; All links stays', 'Needs a few days of use to fill; first run shows the empty-library page']),
 'c': ('Today, editorial', 'Variant B with a voice: serif headings (Literata, already used in Reader), the brand sage as accent, and your note shown as a coloured label on the card.', ['Recognisable at a glance; nobody in the category does serif + notes on cards', 'Notes become the signature: “why I saved it” is visible', 'Sage is a change from the chosen Graphite; Graphite stays an option']),
 'd': ('Ask first', 'The first screen is one large field: search by words or meaning, or ask. Reading in progress sits under it.', ['Strongest AI story, very different from the category', 'Empty-looking for people who browse rather than search', 'Weak when AI is off: falls back to plain search']),
}
whyhtml = ''.join(f'<div class="why sm-l1 v{" on" if k == "b" else ""}" data-v="{k}"><div><h2>{t}</h2><p>{d}</p></div><ul>{"".join(f"<li>{x}</li>" for x in pts[:2])}</ul><ul><li>{pts[2]}</li></ul></div>' for k, (t, d, pts) in WHY.items())
body = f'''<div class="vbar" data-desk-host><b>Home variants</b><div class="sm-seg" role="radiogroup" aria-label="Variant" id="vs">{''.join(f'<button role="radio" type="button" aria-checked="{str(k == "b").lower()}" data-k="{k}">{l}</button>' for k, l in [('a', 'A · Now'), ('b', 'B · Today'), ('c', 'C · Today, editorial'), ('d', 'D · Ask first')])}</div>
<select id="th" aria-label="Theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
{whyhtml}
<div class="v" data-v="a">{VA}</div><div class="v on" data-v="b">{VB}</div><div class="v" data-v="c">{VC}</div><div class="v" data-v="d">{VD}</div>{TABBAR.replace('Revisit','Today')}'''
JS = '''<script>(function(){const bs=[...document.querySelectorAll('#vs button')];function set(k){bs.forEach(b=>b.setAttribute('aria-checked',b.dataset.k===k));document.querySelectorAll('.v').forEach(v=>v.classList.toggle('on',v.dataset.v===k));try{localStorage.setItem('hv',k)}catch(e){}}
bs.forEach(b=>b.addEventListener('click',()=>set(b.dataset.k)));document.getElementById('vs').addEventListener('keydown',e=>{const d={ArrowRight:1,ArrowLeft:-1}[e.key];if(!d)return;const i=bs.findIndex(b=>b.getAttribute('aria-checked')==='true');const n=bs[(i+d+bs.length)%bs.length];n.focus();set(n.dataset.k)});
try{const k=localStorage.getItem('hv');if(k)set(k)}catch(e){}
document.getElementById('th').addEventListener('change',e=>{const v=e.target.value;if(v==='system')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',v)});
document.addEventListener('click',e=>{if(e.target.closest('a[href="#"]'))e.preventDefault()})})();</script>'''
html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Shelfmark Home Variants</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,500;7..72,600&display=swap">
<style>{BUNDLE}
{TOK}
{SHELL_CSS}
{CSS}</style></head><body>{body}{JS}{open('/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/dsgen/desk.js').read()}</body></html>'''
open(f'{B}/design/home-variants.html', 'w').write(html)
print('ok', len(html))
