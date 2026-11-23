exec(open('/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/dsgen/build_pages.py').read())

# ================= SEARCH AND ASK =================
S_CSS = r'''
.qp{position:fixed;left:50%;top:10vh;transform:translateX(-50%);width:min(760px,calc(100vw - 32px));max-height:78vh;overflow:auto;z-index:80;border-radius:var(--radius-lg);box-shadow:var(--shadow-l3)}
.qscrim{position:fixed;inset:0;z-index:79;background:var(--scrim)}
@media (max-width:39.99em){.qp{top:0;left:0;transform:none;width:100%;height:100%;max-height:none;border-radius:0}}
.qp-field{display:flex;align-items:center;gap:8px;height:52px;padding:0 12px 0 16px;border-bottom:1px solid var(--line);font-size:1rem}
.qp-field input{flex:1;border:0;outline:0;background:transparent;color:var(--text);font:400 1rem/1.5 var(--font-sans)}
.qp-chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;border-bottom:1px solid var(--line)}
.qp-chips .sm-chip{height:28px;font-size:.75rem;padding:0 8px}
.qp-group{padding:8px}
.qp-gt{display:flex;align-items:center;gap:8px;padding:4px 8px 6px;font:500 .75rem/1.4 var(--font-sans);color:var(--text-muted)}
.qp-gt svg{color:var(--ai)}
.qp-row{display:flex;align-items:center;gap:12px;width:100%;padding:8px;border:0;border-radius:var(--radius-sm);background:transparent;color:var(--text);text-align:left;font-size:.875rem}
.qp-row[aria-selected="true"]{background:var(--accent-bg)}
.qp-row .tx{flex:1;min-width:0;display:flex;flex-direction:column}
.qp-row b{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qp-row small{font-size:.75rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qp-row .lead-ic{display:grid;place-items:center;width:32px;height:32px;border-radius:var(--radius-sm);background:var(--surface-hover);flex:none}
.qp-foot{display:flex;gap:16px;padding:8px 16px;border-top:1px solid var(--line);font-size:.75rem;color:var(--text-muted)}
.qp-foot span{display:inline-flex;gap:4px;align-items:center}
.ans{padding:16px;display:flex;flex-direction:column;gap:12px;font-size:.9375rem}
.ans .q{align-self:flex-end;max-width:80%;padding:8px 12px;border-radius:var(--radius-md);background:var(--surface-hover);font-size:.875rem}
.ans .a{display:flex;gap:12px}
.ans .a p{margin:0;line-height:1.6}
.cite{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 4px;border:1px solid var(--line-strong);border-radius:var(--radius-xs);font:500 .6875rem/1 var(--font-sans);vertical-align:2px;color:var(--text-muted)}
.srcs{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.src{display:flex;gap:8px;align-items:center;padding:8px;border:1px solid var(--line);border-radius:var(--radius-sm);font-size:.75rem}
.src .sm-thumb{width:40px;height:32px}
.disc{font-size:.75rem;color:var(--text-muted)}
.caret{display:inline-block;width:2px;height:1em;background:var(--text);vertical-align:-2px;animation:blink 1s steps(2) infinite}
@keyframes blink{50%{opacity:0}}@media (prefers-reduced-motion:reduce){.caret{animation:none}}
.statuspill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 8px;border-radius:var(--radius-xs);background:var(--surface-hover);font-size:.75rem;color:var(--text-muted)}
.res-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:32px}
.res-head h1{margin:0}
.res-head .sm-btn{margin-left:auto}
.qp-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:32px 16px;text-align:center}
.qp-empty b{font:600 1.13rem/1.25 var(--font-sans)}.qp-empty p{margin:0;color:var(--text-muted);font-size:.875rem;max-width:44ch}

'''
def qrow(a, t, sub, sel=False, lead=None):
    left = lead or f'<span class="sm-thumb" style="width:40px;height:32px">{ART[a]}</span>'
    return f'<button class="qp-row" type="button" role="option" aria-selected="{str(sel).lower()}">{left}<span class="tx"><b>{t}</b><small>{sub}</small></span>{"<span class=sm-kbd>Enter</span>" if sel else ""}</button>'
field = lambda v, extra='': f'<div class="qp-field">{ic("search", 20)}<input value="{v}" aria-label="Search or ask your shelf" placeholder="Search or ask your shelf">{extra}<span class="sm-kbd">Esc</span></div>'
foot = f'<div class="qp-foot"><span><span class="sm-kbd">↑</span><span class="sm-kbd">↓</span>move</span><span><span class="sm-kbd">Enter</span>open</span><span><span class="sm-kbd">Ctrl Enter</span>new tab</span></div>'
chips = '<div class="qp-chips" role="toolbar" aria-label="Filters"><button class="sm-chip" aria-pressed="false">Type</button><button class="sm-chip" aria-pressed="false">Folder</button><button class="sm-chip" aria-pressed="true">#angular ×</button><button class="sm-chip" aria-pressed="false">Saved: any time</button><button class="sm-chip" aria-pressed="false">Favorites</button></div>'
recent = f'''<div class="qscrim" aria-hidden="true"></div><div class="qp sm-l2" role="dialog" aria-modal="true" aria-label="Search and ask">{field('')}
<div class="qp-group"><div class="qp-gt">Recent searches</div>{''.join(f'<button class="qp-row" type="button">{ic("revisit")}<span class="tx"><b>{t}</b></span></button>' for t in ['signal forms', 'ramen', '#clothes sale'])}</div>
<div class="qp-group"><div class="qp-gt">Ways to search</div><div style="padding:0 8px 8px;display:flex;flex-wrap:wrap;gap:6px">{''.join(f'<span class="sm-tag" style="font-family:var(--font-mono);font-weight:400">{x}</span>' for x in ['#tag', 'in:Recipes', 'site:youtube.com', 'last week'])}</div><p class="disc" style="margin:0 8px 8px">Or ask a question in your own words: “that coat I saved in autumn”.</p></div>{foot}</div>'''
results = f'''<div class="qscrim" aria-hidden="true"></div><div class="qp sm-l2" role="dialog" aria-modal="true" aria-label="Search and ask">{field('signal forms')}{chips}
<div class="qp-group" role="listbox" aria-label="Results"><div class="qp-gt">Links</div>
{qrow('video', '<mark>Signal</mark> <mark>Forms</mark> in 20 minutes', 'youtube.com · in Angular · #angular', True)}
{qrow('dark', 'Getting started with <mark>Signal</mark> <mark>Forms</mark>', 'angular.dev · in Angular')}
{qrow('type', 'Validation without Reactive <mark>Forms</mark>', 'dev.to · note: “compare with <mark>signal</mark> approach”')}
</div>
<div class="qp-group"><div class="qp-gt">{ic("spark", 14)}Close in meaning</div>
{qrow('dark', 'linkedSignal in practice', 'youtube.com · about form state')}
{qrow('type', 'NgRx SignalStore: patterns for real apps', 'dev.to · about signals')}</div>
<div class="qp-group"><div class="qp-gt">Folders and tags</div>
{qrow('', 'Angular / Forms', '13 links', lead=tile('clay'))}
{qrow('', '#signals', '9 links', lead=f'<span class="lead-ic">{ic("hash")}</span>')}</div>
<div class="qp-group"><div class="qp-gt">{ic("spark", 14)}Ask your shelf</div>
{qrow('', 'Ask “signal forms”', 'An answer from your links, with sources', lead=f'<span class="lead-ic" style="background:var(--ai-bg);color:var(--ai)">{ic("spark")}</span>')}</div>{foot}</div>'''
ask = f'''<div class="qscrim" aria-hidden="true"></div><div class="qp sm-l2" role="dialog" aria-modal="true" aria-label="Search and ask">{field('which signal forms video should I watch first?')}
<div class="ans" aria-live="polite"><span class="q">Which Signal Forms video should I watch first?</span>
<div class="a"><span style="color:var(--ai);flex:none;margin-top:2px">{ic("spark", 18)}</span><div style="display:flex;flex-direction:column;gap:12px">
<p>Start with <b>“Signal Forms in 20 minutes”</b> <span class="cite">1</span>: it covers form(), validators and custom controls in one pass. Then read the official getting-started guide <span class="cite">2</span> for the details you skipped. You also saved a comparison with Reactive Forms <span class="cite">3</span> if you are migrating.</p>
<div class="srcs">{''.join(f'<a class="src" href="#"><span class="sm-thumb">{ART[a]}</span><span><b style="font-weight:500">{n}. {t}</b><br><span style="color:var(--text-muted)">{d}</span></span></a>' for n, a, t, d in [(1, 'video', 'Signal Forms in 20 min', 'youtube.com'), (2, 'dark', 'Signal Forms: getting started', 'angular.dev'), (3, 'type', 'Validation without Reactive Forms', 'dev.to')])}</div>
<span class="disc">Written by AI from your links, may be inaccurate. 47 questions left this month.</span>
<div style="display:flex;gap:8px"><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Ask a follow-up</button><button class="sm-btn sm-btn--sm" type="button">{ic("copy")}Copy</button></div></div></div></div></div>'''
streaming = f'''<div class="qscrim" aria-hidden="true"></div><div class="qp sm-l2" role="dialog" aria-modal="true" aria-label="Search and ask">{field('coat I saved in autumn')}
<div class="ans"><span class="q">Coat I saved in autumn</span><div class="a"><span style="color:var(--ai);flex:none;margin-top:2px">{ic("spark", 18)}</span><div style="display:flex;flex-direction:column;gap:8px"><span class="statuspill">{ic("search", 12)}Looking through Clothes…</span><p>You saved two coats in October: the COS wool-blend overcoat <span class="cite">1</span> and<span class="caret" aria-hidden="true"></span></p></div></div></div></div>'''
nothing = f'''<div class="qscrim" aria-hidden="true"></div><div class="qp sm-l2" role="dialog" aria-modal="true" aria-label="Search and ask">{field('blue velvet sofa')}<div class="qp-empty">{SC['nothing-found'].replace('class="sm-scene"', 'class="sm-scene sm-scene--sm"')}<b>Nothing with these words</b><p>No link mentions “blue velvet sofa” in its title, note, tags or address.</p></div>
<div class="qp-group"><div class="qp-gt">{ic("spark", 14)}Close in meaning</div>{qrow('shirt', 'Standing desk', 'ikea.com · about furniture')}</div>
<div class="qp-group"><div class="qp-gt">{ic("spark", 14)}Ask your shelf</div>{qrow('', 'Ask “blue velvet sofa”', 'An answer from your links, with sources', lead=f'<span class="lead-ic" style="background:var(--ai-bg);color:var(--ai)">{ic("spark")}</span>')}</div></div>'''
respage = f'''<div class="res-head"><h1>Results for “signal forms”</h1><span class="lead" style="margin:0">5 links, 2 close in meaning</span><button class="sm-btn sm-btn--secondary" type="button">{ic("plus")}Save as view</button></div>
<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px"><button class="sm-chip" aria-pressed="false">Type</button><button class="sm-chip" aria-pressed="false">Folder</button><button class="sm-chip" aria-pressed="true">#angular ×</button><button class="sm-chip" aria-pressed="false">Saved: any time</button></div>
<div class="stack"><div class="sm-panel sm-l1" style="max-width:none">{''.join(f'<div class="rrow"><span class="sm-thumb">{ART[a]}</span><span class="tx"><span class="tt">{t}</span><span class="sm-meta" style="margin:0">{fav(d[0].upper())}{d}</span></span><span class="sm-tag">angular</span></div>' for a, t, d in [('video', 'Signal Forms in 20 minutes', 'youtube.com'), ('dark', 'Signal Forms: getting started', 'angular.dev'), ('type', 'Validation without Reactive Forms', 'dev.to')])}</div>
<div><p class="sec-t" style="display:flex;gap:8px;align-items:center"><span style="color:var(--ai)">{ic("spark")}</span>Close in meaning</p><div class="sm-panel sm-l1" style="max-width:none">{''.join(f'<div class="rrow"><span class="sm-thumb">{ART[a]}</span><span class="tx"><span class="tt">{t}</span><span class="sm-meta" style="margin:0">{fav(d[0].upper())}{d}</span></span></div>' for a, t, d in [('dark', 'linkedSignal in practice', 'youtube.com'), ('type', 'NgRx SignalStore patterns', 'dev.to')])}</div></div></div>'''
SBG = '<h1>All links</h1><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:24px">' + ''.join(f'<article class="sm-card sm-l1" style="width:auto"><div class="sm-cover" style="aspect-ratio:{r}">{ART[x]}</div><div class="sm-card-body"><h3 class="sm-card-title">{t}</h3><div class="sm-meta">{fav(d[0].upper())}{d}</div></div></article>' for x, r, t, d in [('video', '16/9', 'Signal Forms in 20 minutes', 'youtube.com'), ('shirt', '4/5', 'Wool overshirt', 'uniqlo.com'), ('bowl', '1/1', 'Tonkotsu broth', 'seriouseats.com'), ('jacket', '4/5', 'Nano Puff jacket', 'patagonia.com')]) + '</div>'
results, recent, ask, streaming, nothing = [SBG + x for x in (results, recent, ask, streaming, nothing)]
page('search.html', 'Search and Ask', S_CSS, [
 ('results', 'Results (words, meaning, folders, Ask)', results), ('recent', 'Before typing: recent searches', recent),
 ('ask', 'Ask: answer with sources', ask), ('streaming', 'Ask: answering', streaming), ('nothing', 'Nothing with these words', nothing),
 ('page', 'Full results page', respage)])

# ================= ORGANISE =================
O_CSS = r'''
.fhead{display:flex;align-items:center;gap:12px;margin-top:24px;flex-wrap:wrap}
.crumbs{display:flex;gap:6px;align-items:center;font-size:.875rem;color:var(--text-muted);margin-top:24px}
.crumbs a{color:inherit;text-decoration:none}
.fhead h1{margin:0}
.fhead .sm-tile{width:40px;height:40px;border-radius:var(--radius-md)}.fhead .sm-tile svg{width:20px;height:20px}
.subs{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.sub{display:flex;align-items:center;gap:8px;height:40px;padding:0 12px 0 8px;border-radius:var(--radius-sm);font-size:.875rem;font-weight:500}
.sub .n{font-size:.75rem;color:var(--text-muted);font-weight:400}
.mini-feed{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:24px}
.mini-feed .sm-card{width:auto}
.anchored{position:relative}
.anchored .sm-menu,.anchored .sm-pop{position:absolute;z-index:5}
.cgrid{display:grid;grid-template-columns:repeat(8,32px);gap:8px}
.cdot{width:32px;height:32px;border-radius:var(--radius-full);border:0;display:grid;place-items:center}
.cdot[aria-checked="true"]{box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--text)}
.igrid{display:grid;grid-template-columns:repeat(7,36px);gap:4px}
.igrid button{width:36px;height:36px;border:0;border-radius:var(--radius-sm);background:transparent;color:var(--text-muted);display:grid;place-items:center}
.igrid button[aria-checked="true"]{background:var(--accent-bg);color:var(--text)}
.inplace-row{display:flex;align-items:center;gap:12px;height:32px;padding:0 8px;border-radius:var(--radius-sm);width:260px}
.inplace-row input{flex:1;min-width:0;height:28px;padding:0 6px;margin-left:-7px;border:1px solid var(--focus);border-radius:6px;box-shadow:0 0 0 3px rgba(37,99,235,.2);background:var(--surface);color:var(--text);font:500 .875rem/1.5 var(--font-sans);outline:0}
.tags-page{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.tagbig{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 12px;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--surface);font-size:.875rem;font-weight:500}
.tagbig b{font-weight:400;font-size:.75rem;color:var(--text-muted)}
.tidy-row{display:flex;align-items:center;gap:12px;padding:12px 16px;flex-wrap:wrap}
.tidy-row .tx{flex:1 1 240px;min-width:0}
.tidy-row .sugs{display:flex;gap:6px;flex-wrap:wrap}
.tidy-row .sm-chip{height:28px;font-size:.75rem;padding:0 8px}
.dup{display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:center;padding:12px 16px}
.dup .opt{display:flex;gap:8px;align-items:center;font-size:.875rem;min-width:0}
.dup .opt span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.applybar{position:sticky;bottom:16px;display:flex;align-items:center;gap:12px;padding:8px 8px 8px 16px;border-radius:var(--radius-md);margin-top:16px;font-size:.875rem}
.applybar .sm-btn--primary{margin-left:auto}
.setrow{display:flex;align-items:center;gap:16px;padding:12px 16px;flex-wrap:wrap}
.setrow .tx{flex:1 1 240px;min-width:0}
.setrow .tx b{display:block;font:500 .875rem/1.5 var(--font-sans)}
.setrow .tx span{font-size:.75rem;color:var(--text-muted)}
.overlay{position:relative;min-height:520px;margin-top:24px;border-radius:var(--radius-lg);overflow:hidden}
.overlay .scrim2{position:absolute;inset:0;background:var(--scrim)}
.overlay .sm-slide{position:absolute;right:0;top:0;bottom:0;border-radius:var(--radius-lg) 0 0 var(--radius-lg)}
.overlay .sm-dialog{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}
.trash-row{display:flex;align-items:center;gap:12px;padding:8px 16px;min-height:56px}
.trash-row .tx{flex:1;min-width:0;display:flex;flex-direction:column}
.trash-row .tt{font:600 1rem/1.5 var(--font-sans);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trash-row .sm-meta{margin:0}
@media (max-width:39.99em){.dup{grid-template-columns:1fr}.cgrid{grid-template-columns:repeat(4,32px)}}
'''
card = lambda a, r, t, d: f'<article class="sm-card sm-l1"><div class="sm-cover" style="aspect-ratio:{r}">{ART[a]}</div><div class="sm-card-body"><h3 class="sm-card-title">{t}</h3><div class="sm-meta">{fav(d[0].upper())}{d}</div></div></article>'
folder_page = f'''<nav class="crumbs" aria-label="Breadcrumbs"><a href="#">All links</a>{ic("right", 14)}<span>Recipes</span></nav>
<div class="fhead"><span class="sm-tile" style="background:var(--folder-amber-bg);color:var(--folder-amber)">{ic("folder", 20)}</span><h1>Recipes</h1><span class="lead" style="margin:0">7 links, 2 subfolders</span>
<div style="margin-left:auto;display:flex;gap:8px"><button class="sm-btn sm-btn--sm" type="button">{ic("plus")}Add link here</button><button class="sm-ib" type="button" aria-label="Folder actions">{ic("more")}</button></div></div>
<div class="subs">{''.join(f'<button class="sub sm-l1" type="button">{tile(c)}{n}<span class="n">{k}</span></button>' for n, c, k in [('Ramen', 'amber', 3), ('Baking', 'clay', 2)])}</div>
<div class="mini-feed">{card('bowl', '1/1', 'Rich tonkotsu ramen broth from scratch', 'seriouseats.com')}{card('pancakes', '1/1', 'Lemon ricotta pancakes', 'smittenkitchen.com')}{card('video', '16/9', 'Sourdough for beginners', 'youtube.com')}</div>'''
folder_menu = f'''<div class="row2"><div class="sm-menu sm-l2" role="menu" aria-label="Folder actions for Recipes">
<button class="sm-mi" role="menuitem">{ic("plus")}New subfolder</button><button class="sm-mi" role="menuitem">{ic("plus")}Add link here</button>
<div class="sm-msep"></div><button class="sm-mi" role="menuitem">{ic("edit")}Rename<span class="sm-kbd">F2</span></button><button class="sm-mi" role="menuitem">{ic("palette")}Colour and icon…</button><button class="sm-mi" role="menuitem">{ic("move")}Move to…</button>
<button class="sm-mi" role="menuitem">{ic("pin")}Pin to sidebar</button><button class="sm-mi" role="menuitem">{ic("share")}Share…</button><div class="sm-msep"></div><button class="sm-mi sm-mi--danger" role="menuitem">{ic("trash")}Delete folder</button></div>
<div style="display:flex;flex-direction:column;gap:12px;flex:1;min-width:280px"><span class="lbl-s">Rename opens a small dialog, so a click on a folder always opens it.</span>
<div class="overlay sm-l1" style="min-height:300px;margin-top:0"><div class="scrim2"></div><form class="sm-dialog sm-l3" role="dialog" aria-labelledby="rn" style="width:400px;max-width:calc(100% - 32px)"><h2 id="rn">Rename folder</h2>
<div class="sm-field" style="min-width:0;margin-top:8px"><label for="rnf">Name</label><div class="sm-input">{tile("amber")}<input id="rnf" value="Recipes and baking"></div></div>
<div class="foot"><button class="sm-btn sm-btn--secondary" type="button">Cancel</button><button class="sm-btn sm-btn--primary" type="button">Rename</button></div></form></div>
<div class="overlay sm-l1" style="min-height:360px;margin-top:0"><div class="scrim2"></div><form class="sm-dialog sm-l3" role="dialog" aria-labelledby="nf" style="width:400px;max-width:calc(100% - 32px)"><h2 id="nf">New folder</h2>
<div class="sm-field" style="min-width:0;margin-top:8px"><label for="nff">Name</label><div class="sm-input"><input id="nff" value="" placeholder="For example, Travel"></div></div>
<div class="sm-field" style="min-width:0"><label>Inside</label><button class="sm-input" type="button" style="cursor:pointer;justify-content:flex-start">{ic("folder")}Top level<span style="margin-left:auto">{ic("chev")}</span></button></div>
<div class="foot"><button class="sm-btn sm-btn--secondary" type="button">Cancel</button><button class="sm-btn sm-btn--primary" type="button">Create folder</button></div></form></div>
<span class="lbl-s">Enter confirms, Esc closes, focus returns to the folder. The same dialog renames tags and saved views.</span></div></div>'''
colour_pop = f'''<div class="row2"><div class="sm-pop sm-l2" role="dialog" aria-label="Colour and icon for Recipes" style="width:344px">
<div class="sm-pgroup"><span class="lbl">Colour</span><div class="cgrid" role="radiogroup" aria-label="Colour">{''.join(f'<button class="cdot" role="radio" aria-checked="{str(c == "amber").lower()}" aria-label="{c.capitalize()}" style="background:var(--folder-{c}-bg);color:var(--folder-{c})">{ic("folder", 16)}</button>' for c in ['graphite', 'sage', 'ocean', 'plum', 'clay', 'amber', 'rose', 'teal'])}</div></div>
<div class="sm-pgroup"><span class="lbl">Icon</span><div class="igrid" role="radiogroup" aria-label="Icon">{''.join(f'<button role="radio" aria-checked="{str(i == 0).lower()}" aria-label="Icon {i+1}">{ic(n, 20)}</button>' for i, n in enumerate(['folder', 'bookmark', 'star', 'bell', 'hash', 'search', 'text', 'browser', 'user', 'copy', 'share', 'palette', 'pin', 'inbox']))}</div></div>
<p class="disc" style="margin:4px 8px 8px;font-size:.75rem;color:var(--text-muted)">Changes apply at once.</p></div>
<div style="max-width:320px;font-size:.875rem;color:var(--text-muted)">Colour and icon only: cover, highlight, description, own colours and emoji are gone (D4). Opened from the folder menu, anchored to the folder.</div></div>'''
tags_page = f'''<h1>Tags</h1><p class="lead">12 tags. Click one to see its links; rename, merge or delete from its menu.</p>
<div class="tags-page">{''.join(f'<button class="tagbig" type="button">{ic("hash")}{t}<b>{k}</b></button>' for t, k in [('angular', 12), ('reading', 8), ('clothes', 7), ('design', 5), ('ramen', 3), ('video', 6), ('tools', 4), ('a11y', 2), ('breakfast', 2), ('baking', 2), ('css', 1), ('home', 1)])}</div>
<div class="row2"><div class="sm-menu sm-l2" role="menu" aria-label="Actions for tag reading"><div class="sm-mh">#reading · 8 links</div><button class="sm-mi" role="menuitem">{ic("search")}Show links</button><button class="sm-mi" role="menuitem">{ic("edit")}Rename</button><button class="sm-mi" role="menuitem">{ic("merge")}Merge into…</button><div class="sm-msep"></div><button class="sm-mi sm-mi--danger" role="menuitem">{ic("trash")}Delete tag</button></div></div>'''
tidy = f'''<h1>Tidy up</h1><p class="lead">Everything that needs a decision, in one place. Nothing changes until you apply.</p>
<div class="stack"><section><p class="sec-t">Unsorted: suggested folders and tags <span class="lbl-s">4 links</span></p><div class="sm-panel sm-l1" style="max-width:none">
{''.join(f'<div class="tidy-row"><span class="sm-check" role="checkbox" aria-checked="true" aria-label="Apply to {t}">{ic("check", 14)}</span><span class="sm-thumb" style="width:56px;height:40px">{ART[a]}</span><span class="tx"><span style="font-weight:600">{t}</span><span class="sm-meta" style="margin:0">{fav(d[0].upper())}{d}</span></span><span class="sugs"><button class="sm-chip sm-chip--ai">{ic("spark")}{f}</button>{"".join(f"<button class=\"sm-chip sm-chip--ai\">{ic(chr(115)+chr(112)+chr(97)+chr(114)+chr(107))}{x}</button>" for x in tg)}</span></div>' for a, t, d, f, tg in [('video', 'Sourdough for beginners', 'youtube.com', 'Recipes', ['baking']), ('jacket', 'Nano Puff jacket', 'patagonia.com', 'Clothes', ['outdoor']), ('type', 'Learn accessibility', 'web.dev', 'Courses', ['a11y'])])}</div></section>
<section><p class="sec-t">Saved more than once <span class="lbl-s">1 pair</span></p><div class="sm-panel sm-l1" style="max-width:none"><div class="dup"><label class="opt"><span class="sm-check" role="radio" aria-checked="true" aria-label="Keep the one in Clothes">{ic("check", 14)}</span>{tile("rose")}<span>Wool overshirt · in Clothes, with a note</span></label><label class="opt"><span class="sm-check" role="radio" aria-checked="false" aria-label="Keep the one in Unsorted"></span>{tile("graphite")}<span>Wool overshirt · in Unsorted</span></label><span class="lbl-s">The other goes to Trash</span></div></div></section>
<section><p class="sec-t">Tags that mean the same <span class="lbl-s">1</span></p><div class="sm-panel sm-l1" style="max-width:none"><div class="tidy-row"><span class="sm-check" role="checkbox" aria-checked="true" aria-label="Merge">{ic("check", 14)}</span><span class="tx" style="font-size:.875rem">Merge <span class="sm-tag">a11y</span> and <span class="sm-tag">accessibility</span> into <b>a11y</b></span><span class="lbl-s">3 links</span></div></div></section></div>
<div class="applybar sm-l2"><span>6 changes selected</span><button class="sm-btn sm-btn--sm" type="button">Skip all</button><button class="sm-btn sm-btn--primary sm-btn--sm" type="button">Apply 6 changes</button></div>'''
rules = f'''<h1>Rules</h1><p class="lead">Links from a site go to a folder and get tags when you save them. A folder or tags you choose yourself always win.</p>
<div class="stack"><div class="sm-panel sm-l1" style="max-width:none">{''.join(f'<div class="setrow"><span class="sm-fav" style="width:24px;height:24px">{d[0].upper()}</span><span class="tx"><b>{d}</b><span>{tile(c, 12) if False else ""}→ {f}{" · " + tg if tg else ""}</span></span><button class="sm-btn sm-btn--sm" type="button">Edit</button><button class="sm-ib" type="button" aria-label="More for {d}">{ic("more")}</button></div>' for d, f, c, tg in [('seriouseats.com', 'Recipes', 'amber', '#ramen'), ('uniqlo.com', 'Clothes', 'rose', ''), ('youtube.com/@Angular', 'Angular', 'clay', '#video')])}</div>
<button class="sm-btn sm-btn--secondary" type="button" style="align-self:flex-start">{ic("plus")}Add rule</button></div>
<div class="overlay sm-l1"><div class="scrim2"></div><section class="sm-slide sm-l3" role="dialog" aria-labelledby="re"><div class="head"><h2 id="re">Edit rule</h2><button class="sm-ib" aria-label="Close">{ic("x")}</button></div><div class="content">
<div class="sm-field" style="min-width:0"><label>Site</label><div class="sm-input"><input value="seriouseats.com"></div><span class="sm-hint">Pages on subdomains match too.</span></div>
<div class="sm-field" style="min-width:0"><label>Folder</label><button class="sm-input" style="cursor:pointer;justify-content:flex-start">{tile("amber")}Recipes<span style="margin-left:auto">{ic("chev")}</span></button></div>
<div class="sm-field" style="min-width:0"><label>Tags</label><div class="sm-input" style="gap:4px"><span class="sm-tag">ramen</span><input placeholder="Add tag"></div></div>
<div style="display:flex;gap:8px;margin-top:8px"><button class="sm-btn sm-btn--primary" type="button">Save rule</button><button class="sm-btn sm-btn--secondary" type="button">Apply to 4 links in Unsorted</button></div></div></section></div>'''
trash = f'''<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-top:32px"><h1 style="margin:0">Trash</h1><span class="lead" style="margin:0">4 items, kept for 30 days</span><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button" style="margin-left:auto">Empty trash</button></div>
<div style="margin-top:16px"><div class="sm-seg" role="radiogroup" aria-label="Show"><button role="radio" aria-checked="true">All 4</button><button role="radio" aria-checked="false">Links 3</button><button role="radio" aria-checked="false">Folders 1</button></div></div>
<div class="stack"><div class="sm-panel sm-l1" style="max-width:none">
{''.join(f'<div class="trash-row"><span class="sm-thumb" style="width:56px;height:40px">{ART[a]}</span><span class="tx"><span class="tt">{t}</span><span class="sm-meta">{fr} · {left}</span></span><button class="sm-btn sm-btn--sm sm-btn--secondary" type="button">{ic("restore")}Restore</button><button class="sm-ib" type="button" aria-label="Delete forever">{ic("trash")}</button></div>' for a, t, fr, left in [('shirt', 'Linen shirt', 'From Clothes', '29 days left'), ('type', 'Old design notes', 'From Unsorted', '12 days left'), ('video', 'Livestream replay', 'From Work', '2 days left')])}
<div class="trash-row"><span class="sm-tile" style="width:56px;height:40px;border-radius:var(--radius-sm);background:var(--folder-plum-bg);color:var(--folder-plum)">{ic("folder", 20)}</span><span class="tx"><span class="tt">Old projects</span><span class="sm-meta">Folder with 6 links · 20 days left</span></span><button class="sm-btn sm-btn--sm sm-btn--secondary" type="button">{ic("restore")}Restore</button><button class="sm-ib" type="button" aria-label="Delete forever">{ic("trash")}</button></div></div></div>
<div class="overlay sm-l1" style="min-height:300px"><div class="scrim2"></div><div class="sm-dialog sm-l3" role="alertdialog" aria-labelledby="dd"><h2 id="dd">Delete “Old projects” forever?</h2><p>The folder and its 6 links will be gone for good. This can't be undone.</p><div class="foot"><button class="sm-btn sm-btn--secondary">Cancel</button><button class="sm-btn sm-btn--danger">Delete forever</button></div></div></div>'''
trash_empty = f'<h1>Trash</h1><p class="lead">Deleted links and folders wait here for 30 days.</p><div class="stack"><div class="sm-l1" style="border-radius:var(--radius-lg);padding:48px 24px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">{SC["empty-trash"]}<b style="font:600 1.27rem/1.25 var(--font-sans)">Trash is empty</b><p class="lead" style="margin:0">Deleted links stay here for 30 days, so you can bring them back.</p><button class="sm-btn sm-btn--sm" type="button" data-replay>Replay</button></div></div>'

O_CSS += r"""
.phones{display:flex;gap:32px;flex-wrap:wrap;margin-top:24px;align-items:flex-start}
.phone{position:relative;width:360px;height:720px;border-radius:28px;overflow:hidden;border:1px solid var(--line-strong);background:var(--canvas);flex:none}
.phone .pc{padding:16px}
.phone .pc h1{margin:8px 0 16px;font-size:1.6rem}
.phone .prow{display:flex;align-items:center;gap:12px;height:52px;padding:0 12px;font-size:.9375rem;font-weight:500}
.phone .prow{padding-right:4px}.phone .prow .n{margin-left:auto;margin-right:4px;font-size:.75rem;color:var(--text-muted);font-weight:400}
.phone .scrim2{position:absolute;inset:0;background:var(--scrim)}
.sheet{position:absolute;left:0;right:0;bottom:0;border-radius:20px 20px 0 0;padding:8px 16px 16px;display:flex;flex-direction:column;gap:12px}
.sheet .grab{width:36px;height:4px;border-radius:2px;background:var(--line-strong);align-self:center;margin-bottom:4px}
.sheet h2{margin:0;font:600 1.13rem/1.25 var(--font-sans)}
.sheet[role=menu]{gap:0}.sheet .sm-mi{height:48px;font-size:.9375rem}
.sheet .acts{display:flex;gap:8px}.sheet .acts .sm-btn{flex:1;height:48px}
.kbd{position:absolute;left:0;right:0;bottom:0;height:260px;background:color-mix(in srgb,var(--text) 14%,var(--canvas));display:grid;grid-template-columns:repeat(10,1fr);gap:6px;padding:10px 4px;align-content:start}
.kbd i{height:40px;border-radius:6px;background:var(--surface)}
.phone-cap{font-size:.75rem;color:var(--text-muted);margin-top:8px;max-width:360px}
"""
def phone(inner, overlay='', hl=True):
    rows = ''.join(f'<div class="prow">{tile(c)}{n}<span class="n">{k}</span><button class="sm-ib" type="button" aria-label="Actions for {n}" style="margin-right:-8px;width:44px;height:44px{";background:var(--surface-pressed)" if n == "Recipes" and hl else ""}">{ic("more")}</button></div>' for n, c, k in [('Clothes', 'rose', 7), ('Recipes', 'amber', 7), ('Work', 'ocean', 7), ('Design', 'plum', 5)])
    return f'<div class="phone"><div class="pc"><h1>Folders</h1><div class="sm-l1" style="border-radius:var(--radius-lg);padding:4px">{rows}</div></div>{overlay}{inner}</div>'
phone_sheet = phone(f'''<div class="sheet sm-l3" role="menu" aria-label="Folder actions for Recipes"><span class="grab"></span><div style="display:flex;align-items:center;gap:12px;padding:4px 8px">{tile("amber")}<h2>Recipes</h2></div>
<button class="sm-mi" role="menuitem">{ic("plus")}New subfolder</button><button class="sm-mi" role="menuitem">{ic("edit")}Rename</button><button class="sm-mi" role="menuitem">{ic("palette")}Colour and icon</button><button class="sm-mi" role="menuitem">{ic("move")}Move to…</button><button class="sm-mi" role="menuitem">{ic("share")}Share…</button><button class="sm-mi sm-mi--danger" role="menuitem">{ic("trash")}Delete folder</button></div>''', '<div class="scrim2"></div>')
phone_rename = phone(f'''<div class="kbd" aria-hidden="true">{"<i></i>"*30}</div><form class="sheet sm-l3" role="dialog" aria-labelledby="prn" style="bottom:260px"><span class="grab"></span><h2 id="prn">Rename folder</h2>
<div class="sm-field" style="min-width:0"><label for="prnf">Name</label><div class="sm-input" style="height:48px">{tile("amber")}<input id="prnf" value="Recipes and baking" style="font-size:1rem"></div></div>
<div class="acts"><button class="sm-btn sm-btn--secondary" type="button">Cancel</button><button class="sm-btn sm-btn--primary" type="button">Rename</button></div></form>''', '<div class="scrim2"></div>')
phone_sort = phone(f'''<div class="sheet sm-l3" role="dialog" aria-labelledby="pso" style="gap:0"><span class="grab"></span><h2 id="pso" style="padding:4px 8px 8px">Sort by</h2>
<div role="radiogroup" aria-labelledby="pso">{"".join(f'<button class="sm-mi" role="radio" aria-checked="{str(i == 0).lower()}" style="height:48px;font-size:.9375rem">{x}<span style="margin-left:auto">{ic("check") if i == 0 else ""}</span></button>' for i, x in enumerate(["Newest first", "Oldest first", "Title A to Z", "Recently opened"]))}</div></div>''', '<div class="scrim2"></div>', hl=False)
phone_state = f'''<h1>On the phone</h1><p class="lead">On phones every dropdown (menus, selects, pickers) opens as a sheet from the bottom, where the thumb is. The ⋯ button on a folder opens its actions; Rename replaces that sheet (never a sheet on a sheet) and sits right above the keyboard. Tap on a folder always opens it.</p>
<div class="phones"><div>{phone_sheet}<p class="phone-cap">1. ⋯ on Recipes: actions as a bottom sheet. The button is 44px, a tap on the row opens the folder.</p></div><div>{phone_rename}<p class="phone-cap">2. Rename: field focused, keyboard open, buttons within thumb reach. Input text is 16px so the phone doesn't zoom.</p></div><div>{phone_sort}<p class="phone-cap">3. Any select, here Sort: the same sheet with the current choice ticked; a tap picks and closes.</p></div></div>'''

O_CSS += r"""
.selfeed{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:24px}
.selfeed .sm-card{width:auto;position:relative}
.selfeed .sb{position:absolute;top:12px;left:12px;z-index:2}
.selfeed .sm-card[aria-selected="true"]{box-shadow:0 0 0 2px var(--accent)}
.selfeed .sb .sm-check{box-shadow:0 0 0 2px var(--surface)}
.bulkbar{position:sticky;bottom:16px;display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:8px;border-radius:var(--radius-md);margin-top:24px;font-size:.875rem;z-index:5}
.bulkbar .cnt{padding:0 8px 0 4px;font-weight:600}.bulkbar .sp{flex:1}
.hover-hint{display:flex;gap:16px;flex-wrap:wrap;margin-top:24px;align-items:flex-start}
"""
def sck(on, t): return f'<span class="sm-check" role="checkbox" aria-checked="{str(on).lower()}" aria-label="Select {t}">{ic("check", 14) if on else ""}</span>'
SELC = [('bowl', '1/1', 'Rich tonkotsu ramen broth from scratch', 'seriouseats.com', True), ('pancakes', '1/1', 'Lemon ricotta pancakes', 'smittenkitchen.com', True), ('video', '16/9', 'Sourdough for beginners', 'youtube.com', False), ('type', '16/9', 'Miso glazed salmon', 'bonappetit.com', True), ('dark', '16/9', 'Knife skills in 10 minutes', 'youtube.com', False)]
folder_select = f"""<nav class="crumbs" aria-label="Breadcrumbs"><a href="#">All links</a>{ic("right", 14)}<span>Recipes</span></nav>
<div class="fhead"><span class="sm-tile" style="background:var(--folder-amber-bg);color:var(--folder-amber)">{ic("folder", 20)}</span><h1>Recipes</h1><span class="lead" style="margin:0">Select with X or the checkbox on a card; Shift-click selects a range</span>
<div style="margin-left:auto;display:flex;gap:8px"><button class="sm-btn sm-btn--sm" type="button">Select all 7</button></div></div>
<div class="selfeed">{''.join(f'<article class="sm-card sm-l1" aria-selected="{str(on).lower()}"><span class="sb">{sck(on, t)}</span><div class="sm-cover" style="aspect-ratio:{r}">{ART[a]}</div><div class="sm-card-body"><h3 class="sm-card-title">{t}</h3><div class="sm-meta">{fav(d[0].upper())}{d}</div></div></article>' for a, r, t, d, on in SELC)}</div>
<div class="bulkbar sm-l2" role="toolbar" aria-label="3 links selected"><button class="sm-ib" type="button" aria-label="Clear selection">{ic("x")}</button><span class="cnt">3 selected</span>
<button class="sm-btn sm-btn--sm" type="button">{ic("move")}Move</button><button class="sm-btn sm-btn--sm" type="button">{ic("hash")}Tags</button><button class="sm-btn sm-btn--sm" type="button">{ic("star")}Favorite</button><button class="sm-btn sm-btn--sm" type="button">{ic("bell")}Remind</button><button class="sm-btn sm-btn--sm" type="button">{ic("ext")}Open all</button><button class="sm-btn sm-btn--sm" type="button">{ic("copy")}Copy links</button><span class="sp"></span><button class="sm-btn sm-btn--sm" type="button" style="color:var(--danger)">{ic("trash")}Delete</button></div>
<p class="lbl-s" style="margin-top:8px">Without a selection the checkbox appears on hover (always on touch, after long-press). Move, Tags and Remind open their pickers for all selected links; full set in “Select, move, side by side”.</p>"""
page('organise.html', 'Organise', O_CSS, [
 ('folder', 'Folder page', folder_page), ('select', 'Select several links and bulk actions', folder_select), ('menu', 'Folder menu, rename and new folder', folder_menu), ('phone-rename', 'Phone: actions sheet and rename', phone_state), ('colour', 'Colour and icon', colour_pop),
 ('tags', 'Tags', tags_page), ('tidy', 'Tidy up', tidy), ('rules', 'Rules and the rule editor', rules), ('trash', 'Trash and delete forever', trash), ('trash-empty', 'Trash: empty', trash_empty)], cur='recipes')

# ================= SETTINGS =================
G_CSS = r'''
.sapp{display:flex;min-height:100vh;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:16px;gap:24px}
.snav{flex:none;width:var(--sidebar);display:flex;flex-direction:column;gap:2px;padding:16px 8px;border-radius:var(--radius-lg);align-self:flex-start;position:sticky;top:16px;height:calc(100vh - 32px);overflow:auto}
.snav .ver{margin-top:auto}
.showgrid{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:16px;align-items:start}
.pvwrap{position:sticky;top:16px;display:flex;flex-direction:column;gap:8px}.pvcard{width:auto}
[data-pv] [hidden]{display:none!important}
@media (max-width:52em){.showgrid{grid-template-columns:1fr}.pvwrap{position:static;max-width:240px}}
.snav .sm-nav{width:100%}
.smain{flex:1;min-width:0;max-width:840px;margin:0 auto;padding-bottom:64px}
.smain h1{margin:16px 0 0}
.group{margin-top:24px}
.setrow{display:flex;align-items:center;gap:16px;padding:12px 16px;flex-wrap:wrap}
.setrow .tx{flex:1 1 240px;min-width:0}
.setrow .tx b{display:block;font:500 .875rem/1.5 var(--font-sans)}
.setrow .tx span{font-size:.75rem;color:var(--text-muted)}
.themes{display:flex;gap:12px;flex-wrap:wrap}
.thm{display:flex;flex-direction:column;gap:6px;align-items:center;border:0;background:transparent;color:var(--text);font-size:.75rem}
.thm i{display:block;width:88px;height:56px;border-radius:var(--radius-sm);border:1px solid var(--line-strong);position:relative;overflow:hidden}
.thm i::before{content:"";position:absolute;left:8px;top:8px;width:24px;height:40px;border-radius:4px}
.thm i::after{content:"";position:absolute;left:40px;top:8px;width:40px;height:10px;border-radius:3px}
.thm[aria-checked="true"] i{box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--text)}
.t-light i{background:#F5F5F4}.t-light i::before{background:#fff}.t-light i::after{background:#171717}
.t-dark i{background:#0F0F0F}.t-dark i::before{background:#181818}.t-dark i::after{background:#EDEDED}
.t-sys i{background:linear-gradient(90deg,#F5F5F4 50%,#0F0F0F 50%)}.t-sys i::before{background:#fff}.t-sys i::after{background:#777}
.acc{display:flex;gap:8px}
.adot{width:28px;height:28px;border-radius:var(--radius-full);border:0}
.adot[aria-checked="true"]{box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--text)}
.profile{display:flex;align-items:center;gap:16px;padding:16px}
.pav{width:56px;height:56px;border-radius:var(--radius-full);background:var(--surface-hover);display:grid;place-items:center;font:600 1.13rem/1 var(--font-sans)}
.nums{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line)}
.nums div{background:var(--surface);padding:12px 16px}
.nums b{display:block;font:600 1.27rem/1.25 var(--font-sans)}.nums span{font-size:.75rem;color:var(--text-muted)}
.meter{height:6px;border-radius:var(--radius-full);background:var(--surface-hover);overflow:hidden;width:100%;max-width:240px}.meter i{display:block;height:100%;background:var(--accent)}
.danger-panel{border-color:color-mix(in srgb,var(--danger) 40%,transparent)}
.notice{display:flex;gap:8px;align-items:center;padding:12px 16px;border-radius:var(--radius-md);font-size:.875rem}
@media (max-width:63.99em){.snav{display:none}}
'''
snav = lambda cur: f'<nav class="snav sm-l1" aria-label="Settings"><button class="sm-nav" type="button">{ic("left", 20)}Back to links</button><div class="sm-sec" style="width:auto;margin-top:8px">Settings</div>' + ''.join(f'<button class="sm-nav" type="button"{" aria-current=%spage%s" % (chr(34), chr(34)) if cur == k else ""}>{ic(i, 20)}{l}</button>' for k, i, l in [('account', 'user', 'Account'), ('appearance', 'palette', 'Appearance'), ('library', 'bookmark', 'Library'), ('ai', 'spark', 'AI'), ('language', 'browser', 'Language and region'), ('data', 'upload', 'Your data'), ('keys', 'text', 'Keyboard shortcuts')]) + '<p class="lbl-s ver" style="padding:16px 8px 0">Shelfmark 3.0</p></nav>'
def srow(t, d, ctl): return f'<div class="setrow"><span class="tx"><b>{t}</b><span>{d}</span></span>{ctl}</div>'
sw = lambda on, l: f'<button class="sm-switch" role="switch" aria-checked="{str(on).lower()}" aria-label="{l}"></button>'
seg = lambda opts, cur, l: f'<div class="sm-seg" role="radiogroup" aria-label="{l}">' + ''.join(f'<button role="radio" aria-checked="{str(o == cur).lower()}">{o}</button>' for o in opts) + '</div>'
def spage(cur, h, body): return f'<div class="sapp">{snav(cur)}<main class="smain"><h1>{h}</h1>{body}</main></div>{TABBAR}'
appearance = spage('appearance', 'Appearance', f'''<p class="lead">Saved as you go and synced to your devices.</p>
<section class="group"><p class="sec-t">Theme</p><div class="sm-panel sm-l1" style="max-width:none"><div class="setrow"><div class="themes" role="radiogroup" aria-label="Theme">{''.join(f'<button class="thm {c}" role="radio" aria-checked="{str(c == "t-sys").lower()}"><i></i>{l}</button>' for c, l in [('t-sys', 'System'), ('t-light', 'Light'), ('t-dark', 'Dark')])}</div></div>
{srow('Accent', 'Graphite keeps the interface quiet; Ink and Sage add one colour.', '<div class="acc" role="radiogroup" aria-label="Accent">' + ''.join(f'<button class="adot" role="radio" aria-checked="{str(n == "Graphite").lower()}" aria-label="{n}" style="background:{v}"></button>' for n, v in [('Graphite', 'var(--accent)'), ('Ink', 'var(--accent-ink)'), ('Sage', 'var(--accent-sage)')]) + '</div>')}
{srow('Custom theme', 'Your own accent and background, checked for contrast.', '<button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Customize</button>')}</div></section>
<section class="group"><p class="sec-t">Text and layout</p><div class="sm-panel sm-l1" style="max-width:none">{srow('Text size', 'Scales the whole interface.', seg(['90%', '100%', '112%', '125%'], '100%', 'Text size'))}{srow('Font', 'Readable is designed for low vision.', seg(['Onest', 'System', 'Readable'], 'Onest', 'Font'))}{srow('Density', 'Compact fits more links on screen.', seg(['Comfortable', 'Compact'], 'Comfortable', 'Density'))}</div></section>
<section class="group"><p class="sec-t">Motion</p><div class="sm-panel sm-l1" style="max-width:none">{srow('Animations', 'Reduced keeps fades, removes movement.', seg(['System', 'Full', 'Reduced'], 'System', 'Animations'))}</div></section>
<section class="group"><p class="sec-t">Show on cards</p><p class="lbl-s" style="margin:-4px 0 8px">Also in the library toolbar, next to the views. The card on the right shows the result.</p><div class="showgrid"><div class="sm-panel sm-l1" style="max-width:none">{srow('Preview image', '', sw(True, 'Preview image').replace('<button', '<button data-show="img"'))}{srow('Description', 'The page’s own text, or an AI summary when it has none.', sw(True, 'Description').replace('<button', '<button data-show="desc"'))}{srow('Note', 'What you wrote when saving.', sw(True, 'Note').replace('<button', '<button data-show="note"'))}{srow('Tags', '', sw(False, 'Tags').replace('<button', '<button data-show="tags"'))}{srow('Site', '', sw(True, 'Site').replace('<button', '<button data-show="site"'))}{srow('Date saved', '', sw(False, 'Date saved').replace('<button', '<button data-show="date"'))}</div>
<div class="pvwrap"><span class="lbl-s">Preview</span><article class="sm-card sm-l1 pvcard" data-pv><div class="sm-cover" data-part="img" style="aspect-ratio:4/5">{ART['shirt']}</div><div class="sm-card-body"><h3 class="sm-card-title">Wool overshirt</h3><p data-part="desc" style="margin:4px 0 0;font-size:.875rem;color:var(--text-muted)">Relaxed overshirt in brushed wool blend, with two chest pockets.</p><p data-part="note" style="display:flex;gap:6px;margin:6px 0 0;font-size:.875rem">{ic("edit", 12)}<span>Wait for the sale</span></p><div data-part="tags" hidden style="display:flex;gap:4px;margin-top:8px"><span class="sm-tag">clothes</span><span class="sm-tag">wishlist</span></div><div class="sm-meta"><span data-part="site" style="display:inline-flex;gap:6px;align-items:center">{fav("U")}uniqlo.com</span><span data-part="date" hidden>· 12 Nov</span></div></div></article></div></div></section>
<script>(function(){{document.querySelectorAll('[data-show]').forEach(b=>b.addEventListener('click',()=>{{const on=b.getAttribute('aria-checked')!=='true';b.setAttribute('aria-checked',on);document.querySelectorAll('[data-pv] [data-part="'+b.dataset.show+'"]').forEach(p=>p.hidden=!on)}}))}})();</script>''')
library = spage('library', 'Library', f'''<p class="lead">How links open, where new ones go, and how long Trash keeps things.</p>
<section class="group"><p class="sec-t">Viewing</p><div class="sm-panel sm-l1" style="max-width:none">{srow('Clicking a link', 'Opens the preview inside Shelfmark, or the site in a new tab.', seg(['Preview', 'Site'], 'Preview', 'Clicking a link'))}{srow('Default view', 'How a folder opens the first time.', seg(['Masonry', 'Grid', 'List', 'Headlines'], 'Masonry', 'Default view'))}{srow('Reader for these sites', 'Open in Reader when a site can’t be shown.', sw(True, 'Reader fallback'))}</div></section>
<section class="group"><p class="sec-t">Saving</p><div class="sm-panel sm-l1" style="max-width:none">{srow('New links go to', 'When no rule or suggestion applies.', '<button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">' + tile('graphite', 12) + 'Unsorted' + ic('chev') + '</button>')}{srow('Default reminder time', 'Used by Tomorrow, This weekend and Next week.', '<button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">9:00' + ic('chev') + '</button>')}{srow('Rules', '3 rules', '<button class="sm-btn sm-btn--sm" type="button">Manage' + ic('right') + '</button>')}</div></section>
<section class="group"><p class="sec-t">Trash</p><div class="sm-panel sm-l1" style="max-width:none">{srow('Keep deleted items for', 'Then they’re removed for good.', seg(['7 days', '30 days', '90 days'], '30 days', 'Keep deleted items for'))}</div></section>''')
ai = spage('ai', 'AI', f'''<p class="lead">A quiet helper for saving, finding and coming back. Off until you turn it on; nothing is sent while it’s off.</p>
<section class="group"><div class="sm-panel sm-l1" style="max-width:none">{srow('Use AI in Shelfmark', 'Suggestions, summaries, search by meaning and Ask.', sw(True, 'Use AI'))}</div></section>
<section class="group"><p class="sec-t">When you save</p><div class="sm-panel sm-l1" style="max-width:none">{srow('Folder', 'Suggest shows the suggestion; Automatic fills it when you don’t choose.', seg(['Suggest', 'Automatic', 'Off'], 'Suggest', 'Folder'))}{srow('Tags', '', seg(['Suggest', 'Automatic', 'Off'], 'Suggest', 'Tags'))}{srow('Short summaries', 'One or two sentences on cards without a note.', sw(True, 'Short summaries'))}{srow('Include my notes', 'Notes make suggestions better. Off: notes never leave Shelfmark.', sw(False, 'Include my notes'))}</div></section>
<section class="group"><p class="sec-t">Finding</p><div class="sm-panel sm-l1" style="max-width:none">{srow('Search by meaning', 'Finds links close to your words.', sw(True, 'Search by meaning'))}{srow('Process older links', '212 links saved before AI was on.', '<button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Start</button>')}</div></section>
<section class="group"><p class="sec-t">This month</p><div class="sm-panel sm-l1" style="max-width:none"><div class="setrow"><span class="tx"><b>184 of 500 links</b><span>Resets on 1 December</span></span><span class="meter" role="meter" aria-valuenow="37" aria-valuemin="0" aria-valuemax="100" aria-label="AI links used"><i style="width:37%"></i></span></div>{srow('Questions to Ask', '47 of 50 left today', '')}</div></section>
<section class="group"><p class="sec-t">Your AI data</p><div class="sm-panel sm-l1" style="max-width:none">{srow('Connect your assistant', 'Let Claude or another MCP client search your links.', '<button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Create token</button>')}{srow('Delete AI data', 'Removes summaries, suggestions and search data. Your own notes stay.', '<button class="sm-btn sm-btn--sm" type="button" style="color:var(--danger)">Delete…</button>')}</div></section>''')
account = spage('account', 'Account', f'''<section class="group"><div class="sm-panel sm-l1" style="max-width:none"><div class="profile"><span class="pav">DU</span><span class="tx"><b style="font:600 1rem/1.5 var(--font-sans)">Demo User</b><br><span class="lbl-s">demo@example.com · member since November 2026</span></span></div>
<div class="nums"><div><b>58</b><span>Links</span></div><div><b>6</b><span>Folders</span></div><div><b>12</b><span>Tags</span></div></div></div></section>
<section class="group"><p class="sec-t">Sign-in</p><div class="sm-panel sm-l1" style="max-width:none">{srow('Google', 'Connected 2 Nov 2026', '<span class="lbl-s">Connected</span>')}{srow('GitHub', 'Not connected', '<button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Connect</button>')}</div></section>
<section class="group"><div class="sm-panel sm-l1" style="max-width:none">{srow('Sign out', 'On this device.', '<button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Sign out</button>')}</div></section>
<section class="group"><p class="sec-t">Delete account</p><div class="sm-panel sm-l1 danger-panel" style="max-width:none">{srow('Delete your account', 'Your links, folders and tags are kept for 7 days in case you change your mind, then deleted for good.', '<button class="sm-btn sm-btn--danger sm-btn--sm" type="button">Delete account…</button>')}</div></section>''')
deletion = spage('account', 'Account', f'''<section class="group"><div class="notice sm-l1" role="status" style="border-color:color-mix(in srgb,var(--warning) 40%,transparent)"><span style="color:var(--warning)">{ic("bell")}</span><span style="flex:1">Your account will be deleted on <b>30 November</b>. Until then you can bring everything back.</span><button class="sm-btn sm-btn--primary sm-btn--sm" type="button">Keep my account</button></div></section>''')
data = spage('data', 'Your data', f'''<p class="lead">Bring links in, take them out, and control what Shelfmark remembers.</p>
<section class="group"><p class="sec-t">Import and export</p><div class="sm-panel sm-l1" style="max-width:none">{srow('Import links', 'Bookmarks from Chrome, Safari, Firefox or Edge.', '<button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">' + ic('upload') + 'Import</button>')}{srow('Export', 'JSON, bookmarks HTML or CSV. Last export: 12 Nov, JSON.', '<button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Export…</button>')}</div></section>
<section class="group"><p class="sec-t">History</p><div class="sm-panel sm-l1" style="max-width:none">{srow('Remember recently opened', 'Powers Recently opened and Continue reading.', sw(True, 'Remember recently opened'))}</div></section>
<section class="group"><p class="sec-t">Privacy</p><div class="sm-panel sm-l1" style="max-width:none">{srow('Privacy policy', 'What we store and why, in plain words.', '<button class="sm-btn sm-btn--sm" type="button">Read' + ic('right') + '</button>')}</div></section>''')
language = spage('language', 'Language and region', f'''<section class="group"><p class="sec-t">Language</p><div class="sm-panel sm-l1" style="max-width:none">{''.join(srow(n, s, f'<span class="sm-check" role="radio" aria-checked="{str(i == 0).lower()}" aria-label="{n}" style="border-radius:999px">{"" if i else ic("check", 14)}</span>') for i, (n, s) in enumerate([('Match my browser', 'English'), ('English', ''), ('Українська', ''), ('Deutsch', ''), ('Français', '')]))}</div></section>
<section class="group"><p class="sec-t">Dates and numbers</p><div class="sm-panel sm-l1" style="max-width:none">{srow('Date format', '', '<button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">23 Nov 2026' + ic('chev') + '</button>')}{srow('Clock', '', seg(['24-hour', '12-hour'], '24-hour', 'Clock'))}{srow('Week starts on', '', seg(['Monday', 'Sunday'], 'Monday', 'Week starts on'))}</div></section>''')
you = f'''<main style="padding:16px;max-width:480px;margin:0 auto"><h1 style="margin-top:8px">You</h1>
<div class="sm-panel sm-l1" style="max-width:none;margin-top:16px"><div class="profile"><span class="pav">DU</span><span><b style="font:600 1rem/1.5 var(--font-sans)">Demo User</b><br><span class="lbl-s">Account and sign-in</span></span><span style="margin-left:auto;color:var(--text-muted)">{ic("right")}</span></div></div>
<div class="sm-panel sm-l1" style="max-width:none;margin-top:16px">{''.join(f'<div class="setrow" style="min-height:52px"><span style="color:var(--text-muted)">{ic(i, 20)}</span><span class="tx"><b>{l}</b></span><span style="color:var(--text-muted)">{ic("right")}</span></div>' for i, l in [('palette', 'Appearance'), ('bookmark', 'Library'), ('spark', 'AI'), ('browser', 'Language and region'), ('upload', 'Your data'), ('text', 'Keyboard shortcuts')])}</div>
<div class="sm-panel sm-l1" style="max-width:none;margin-top:16px">{''.join(f'<div class="setrow" style="min-height:52px"><span class="tx"><b>{l}</b></span><span style="color:var(--text-muted)">{ic("right")}</span></div>' for l in ['Help and feedback', 'What’s new', 'Sign out'])}</div></main>{TABBAR}'''
page('settings.html', 'Settings', G_CSS, [('appearance', 'Appearance', appearance), ('library', 'Library', library), ('ai', 'AI', ai), ('account', 'Account', account), ('deletion', 'Account: deletion scheduled', deletion), ('data', 'Your data', data), ('language', 'Language and region', language), ('you', 'Phone: You', you)], shell='bare')

# ================= PUBLIC =================
P_CSS = r'''
.auth{min-height:100vh;display:grid;place-items:center;padding:24px max(16px,env(safe-area-inset-left,0px))}
.authcard{width:400px;max-width:100%;padding:32px;border-radius:var(--radius-lg);display:flex;flex-direction:column;gap:16px}
.authcard h1{margin:8px 0 0;font:600 2.03rem/1.15 var(--font-sans);letter-spacing:-.01em}
.authcard p{margin:0;color:var(--text-muted);font-size:.875rem}
.prov{width:100%;height:48px;justify-content:center;gap:12px}
.or{display:flex;align-items:center;gap:12px;color:var(--text-muted);font-size:.75rem}.or::before,.or::after{content:"";flex:1;height:1px;background:var(--line)}
.pub{max-width:1040px;margin:0 auto;padding:16px max(16px,env(safe-area-inset-left,0px)) 64px}
.pubtop{display:flex;align-items:center;gap:12px;height:56px}
.pubtop .logo{margin:0}
.pubtop .sm-btn{margin-left:auto}
.pubhead{display:flex;align-items:flex-end;gap:16px;margin-top:24px;flex-wrap:wrap}
.pubhead h1{margin:0}
.byline{display:flex;align-items:center;gap:8px;font-size:.875rem;color:var(--text-muted);margin-top:4px}
.pubgrid{column-width:240px;column-gap:16px;margin-top:24px}.pubgrid .sm-card{width:auto;break-inside:avoid;margin-bottom:16px}
.pubnote{margin:4px 0 0;font-size:.875rem;color:var(--text-muted);font-style:italic}
.nf{min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px}
.nf b{display:block;font:600 2.03rem/1.15 var(--font-sans);margin:8px 0}
.nf p{margin:0 auto 16px;color:var(--text-muted);max-width:40ch}
'''
signin = f'''<div class="auth"><div class="authcard sm-l2"><svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="4" fill="var(--accent)"/><path d="M14 4h5v8l-2.5-2-2.5 2z" fill="var(--brand-notch)"/></svg>
<h1>All your links, and a way back to them</h1><p>Save anything in one move, find it in seconds, and see it again before it’s forgotten.</p>
<button class="sm-btn sm-btn--secondary prov" type="button">{ic("google", 20)}Continue with Google</button><button class="sm-btn sm-btn--secondary prov" type="button">{ic("github", 20)}Continue with GitHub</button>
<div class="or">or</div><button class="sm-btn prov" type="button">Look around in the demo</button>
<p style="font-size:.75rem">By continuing you agree to the <a href="#" style="color:var(--text)">privacy policy</a>.</p></div></div>'''
DRIFT_CSS = r"""
.auth{position:relative;overflow:hidden}
.authcard{position:relative;z-index:2}
.drift{position:absolute;inset:0;pointer-events:none;z-index:1}
.dc{position:absolute;left:var(--x);top:var(--y);width:var(--w);transform:translate(-50%,-50%) rotate(var(--r));opacity:var(--o)}
.dc .fly{animation:dc-fly 1s cubic-bezier(.2,.8,.2,1) var(--dl) both}
.dc .flt{animation:dc-float var(--fd) ease-in-out var(--fp) infinite alternate}
.dc .sm-card{width:100%;position:relative}
.dc .sm-card-title{font-size:.8125rem}
.dc .sm-card-body{padding:8px 10px 10px}
.dc .sm-card::after{content:"";position:absolute;inset:-1px;border-radius:inherit;box-shadow:0 0 0 0 var(--accent);opacity:0;animation:dc-ring 24s ease-out var(--rd) infinite}
@keyframes dc-fly{from{transform:translate(var(--fx),var(--fy)) scale(.55) rotate(calc(var(--r) * -1));opacity:0}to{transform:none;opacity:1}}
@keyframes dc-float{from{transform:translate(0,-6px)}to{transform:translate(4px,6px)}}
@keyframes dc-ring{0%{opacity:0;box-shadow:0 0 0 0 var(--accent)}1%{opacity:.6}5%{opacity:0;box-shadow:0 0 0 10px var(--accent)}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.dc .fly,.dc .flt,.dc .sm-card::after{animation:none}}
@media (max-width:63.99em){.drift{display:none}}
"""
DC = [('video', '16/9', 'Signal Forms in 20 minutes', 13, 22, 210, -6, 1), ('shirt', '4/5', 'Wool overshirt', 27, 62, 170, 4, 1), ('bowl', '1/1', 'Tonkotsu ramen broth', 10, 78, 150, -3, .7), ('type', '16/9', 'Learn accessibility', 30, 18, 150, 5, .7),
      ('pancakes', '1/1', 'Lemon ricotta pancakes', 86, 24, 180, 5, 1), ('jacket', '4/5', 'Nano Puff jacket', 72, 66, 170, -4, 1), ('dark', '16/9', 'Zoneless change detection', 90, 76, 190, 3, .8), ('video', '16/9', 'Sourdough for beginners', 70, 14, 140, -6, .6)]
def dcard(i, a, r, t, x, y, w, rot, o):
    return (f'<div class="dc" style="--x:{x}%;--y:{y}%;--w:{w}px;--r:{rot}deg;--o:{o};--fx:{(50-x)*0.9:.1f}vw;--fy:{(50-y)*0.9:.1f}vh;--dl:{0.15+i*0.09:.2f}s;--fd:{5+i%4*1.3:.1f}s;--fp:-{i*0.7:.1f}s;--rd:{2.6+i*3:.1f}s">'
            f'<div class="fly"><div class="flt"><article class="sm-card sm-l1"><div class="sm-cover" style="aspect-ratio:{r}">{ART[a]}</div><div class="sm-card-body"><h3 class="sm-card-title">{t}</h3></div></article></div></div></div>')
DRIFT = '<div class="drift" aria-hidden="true">' + ''.join(dcard(i, *c) for i, c in enumerate(DC)) + '</div>'
signin = signin.replace('<div class="auth">', '<div class="auth">' + DRIFT + '<button class="sm-btn sm-btn--sm" type="button" data-replay-drift style="position:absolute;left:16px;bottom:16px;z-index:3">Replay</button>', 1)
P_CSS += DRIFT_CSS
signin_err = signin.replace('<button class="sm-btn sm-btn--secondary prov"', f'<div class="notice sm-l1" role="alert" style="display:flex;gap:8px;padding:12px 16px;border-radius:var(--radius-md);font-size:.875rem;border-color:color-mix(in srgb,var(--danger) 40%,transparent)"><span style="color:var(--danger)">{ic("x")}</span>Sign-in with Google didn’t finish. Try again, or use GitHub.</div><button class="sm-btn sm-btn--secondary prov"', 1)
collection = f'''<div class="pub"><div class="pubtop"><div class="logo"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="4" fill="var(--accent)"/><path d="M14 4h5v8l-2.5-2-2.5 2z" fill="var(--brand-notch)"/></svg>Shelfmark</div><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Start your own shelf</button></div>
<div class="pubhead"><span class="sm-tile sm-tile--lg" style="background:var(--folder-amber-bg);color:var(--folder-amber)">{ic("folder", 20)}</span><div><h1>Weekend recipes</h1><div class="byline"><span class="sm-fav">D</span>Shared by Demo User · 7 links</div></div></div>
<div class="pubgrid">{''.join(f'<article class="sm-card sm-l1"><div class="sm-cover" style="aspect-ratio:{r}">{ART[a]}</div><div class="sm-card-body"><h3 class="sm-card-title">{t}</h3>{f"<p class=pubnote>“{n}”</p>" if n else ""}<div class="sm-meta">{fav(d[0].upper())}{d}</div></div></article>' for a, r, t, d, n in [('bowl', '1/1', 'Rich tonkotsu ramen broth', 'seriouseats.com', 'Start on Friday evening'), ('pancakes', '1/1', 'Lemon ricotta pancakes', 'smittenkitchen.com', ''), ('video', '16/9', 'Sourdough for beginners', 'youtube.com', 'Best intro I found')])}</div></div>'''
notfound = f'<div class="nf"><div>{SC["not-found"]}<b>This page doesn’t exist</b><p>The address may be mistyped, or the page has moved.</p><button class="sm-btn sm-btn--primary" type="button">Go to your links</button> <button class="sm-btn" type="button" data-replay>Replay</button></div></div>'
offline = f'<div class="nf"><div>{SC["offline"]}<b>You’re offline</b><p>What’s already loaded stays readable. Changes can’t be saved until you’re back online.</p><button class="sm-btn sm-btn--secondary" type="button">Try again</button> <button class="sm-btn" type="button" data-replay>Replay</button></div></div>'
signin = signin + '<script>document.addEventListener("click",e=>{const b=e.target.closest("[data-replay-drift]");if(!b)return;const d=b.parentElement.querySelector(".drift");d.outerHTML=d.outerHTML})</script>'
page('public.html', 'Sign-in and public pages', P_CSS, [('signin', 'Sign-in', signin), ('signin-error', 'Sign-in: error', signin_err), ('collection', 'Shared folder (public)', collection), ('404', 'Not found', notfound), ('offline', 'Offline', offline)], shell='bare')

# ================= EXTENSION =================
E_CSS = r'''
.stage{min-height:100vh;display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start;justify-content:center;padding:48px max(16px,env(safe-area-inset-left,0px))}
.popup{width:380px;max-width:100%;border-radius:var(--radius-lg);overflow:hidden;display:flex;flex-direction:column}
.ph{display:flex;align-items:center;gap:8px;padding:12px 12px 12px 16px;border-bottom:1px solid var(--line)}
.ph .logo{margin:0;height:auto;padding:0;font-size:.875rem}
.ph .sm-seg{margin-left:auto}
.pb{padding:16px;display:flex;flex-direction:column;gap:12px}
.pf{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--line);align-items:center}
.pf .hint{flex:1;font-size:.75rem;color:var(--text-muted)}
.pv{display:flex;gap:12px;align-items:center}
.pv .sm-thumb{width:96px;height:64px}
.pv b{font:600 .875rem/1.5 var(--font-sans);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.goes{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:var(--radius-sm);background:var(--surface-hover);font-size:.875rem}
.goes .sm-btn{margin-left:auto}
.tabs{display:flex;flex-direction:column;max-height:300px;overflow:auto;border:1px solid var(--line);border-radius:var(--radius-md)}
.tabs .ln{display:flex;align-items:center;gap:10px;padding:8px 12px;font-size:.875rem}
.tabs .ln+.ln{border-top:1px solid var(--line)}
.tabs .u{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.done{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:8px 0}
.done b{font:600 1.13rem/1.25 var(--font-sans)}
.ctx{width:260px;padding:8px;border-radius:var(--radius-md)}
.page-mock{width:420px;max-width:100%;border-radius:var(--radius-lg);overflow:hidden}
.page-mock .bar{height:36px;background:var(--surface-hover);display:flex;align-items:center;gap:6px;padding:0 12px}
.page-mock .bar i{width:10px;height:10px;border-radius:50%;background:var(--control);opacity:.5}
.page-mock .c{padding:20px;position:relative;min-height:260px;font-size:.875rem}
.page-mock a.lk{color:var(--focus);text-decoration:underline}
.page-mock .ctx{position:absolute;left:120px;top:56px}
.page-mock .tst{position:absolute;right:12px;bottom:12px}
'''
ph = lambda mode=True: f'<div class="ph"><div class="logo"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="4" fill="var(--accent)"/><path d="M14 4h5v8l-2.5-2-2.5 2z" fill="var(--brand-notch)"/></svg>Shelfmark</div>{seg(["This page", "All tabs (6)"], "This page", "What to save") if mode else ""}</div>'
ext_save = f'''<div class="stage"><section class="popup sm-l3" aria-label="Save to Shelfmark">{ph()}<div class="pb">
<div class="pv"><span class="sm-thumb">{ART['bowl']}</span><span><b>Rich tonkotsu ramen broth from scratch</b><span class="sm-meta" style="margin:4px 0 0">{fav("S")}seriouseats.com</span></span></div>
<div class="goes">{tile("amber")}<span>Goes to <b>Recipes</b> <span style="color:var(--text-muted)">· rule</span></span><button class="sm-btn sm-btn--sm" type="button">Change</button></div>
<div class="sm-field" style="min-width:0"><label>Tags</label><div class="sm-input" style="gap:4px"><span class="sm-tag">ramen</span><button class="sm-chip sm-chip--ai" type="button" style="height:24px;padding:0 8px;font-size:.75rem">{ic("spark")}soup</button><input placeholder="Add tag" aria-label="Add tag"></div></div>
<div class="sm-field" style="min-width:0"><label>Note</label><div class="sm-input"><input placeholder="Why are you saving this?"></div></div></div>
<div class="pf"><span class="hint">Ctrl Enter to save</span><button class="sm-btn sm-btn--primary" type="button">Save</button></div></section></div>'''
ext_tabs = f'''<div class="stage"><section class="popup sm-l3" aria-label="Save open tabs">{ph()}<div class="pb"><div class="tabs">{''.join(f'<div class="ln"><span class="sm-check" role="checkbox" aria-checked="{str(k != "dup").lower()}" aria-label="Save {t}">{"" if k == "dup" else ic("check", 14)}</span>{fav(d[0].upper())}<span class="u">{t}</span><span class="lbl-s">{"Saved" if k == "dup" else f}</span></div>' for t, d, f, k in [('Rich tonkotsu ramen broth', 'seriouseats.com', 'Recipes', ''), ('Signal Forms in 20 minutes', 'youtube.com', 'Angular', ''), ('Nano Puff jacket', 'patagonia.com', 'Clothes', ''), ('Wool overshirt', 'uniqlo.com', '', 'dup'), ('Learn accessibility', 'web.dev', 'Unsorted', ''), ('A complete guide to CSS Grid', 'css-tricks.com', 'Design', '')])}</div>
<button class="sm-btn sm-btn--secondary sm-btn--sm" type="button" style="align-self:flex-start">{ic("spark")}Sort 5 links with AI</button></div>
<div class="pf"><span class="hint">5 of 6 tabs</span><button class="sm-btn sm-btn--primary" type="button">Save 5 links</button></div></section></div>'''
ext_saved = f'''<div class="stage"><section class="popup sm-l3" aria-label="Saved">{ph(False)}<div class="pb"><div class="done">{SC["saved"].replace('class="sm-scene"', 'class="sm-scene sm-scene--sm"')}<b>Saved to Recipes</b><span class="lbl-s">Rich tonkotsu ramen broth from scratch</span></div>
<div class="goes" style="background:transparent;border:1px solid var(--line)">{tile("amber")}<span>Recipes</span><button class="sm-btn sm-btn--sm" type="button">Change</button></div></div>
<div class="pf"><button class="sm-btn sm-btn--sm" type="button">{ic("edit")}Edit</button><span class="hint"></span><button class="sm-btn sm-btn--secondary" type="button">Open in Shelfmark</button><button class="sm-btn sm-btn--primary" type="button">Done</button></div></section></div>'''
ext_dup = f'''<div class="stage"><section class="popup sm-l3" aria-label="Already saved">{ph(False)}<div class="pb"><div class="pv"><span class="sm-thumb">{ART['shirt']}</span><span><b>Wool overshirt</b><span class="sm-meta" style="margin:4px 0 0">{fav("U")}uniqlo.com</span></span></div>
<div class="goes" style="background:transparent;border:1px solid var(--line-strong)"><span style="color:var(--warning)">{ic("bell")}</span><span>Already saved in <b>Clothes</b>, 3 weeks ago.</span></div></div>
<div class="pf"><span class="hint"></span><button class="sm-btn sm-btn--secondary" type="button">Save a copy</button><button class="sm-btn sm-btn--primary" type="button">Open in Shelfmark</button></div></section></div>'''
ext_out = f'''<div class="stage"><section class="popup sm-l3" aria-label="Signed out">{ph(False)}<div class="pb"><div class="done">{SC["empty-library"].replace('class="sm-scene"', 'class="sm-scene sm-scene--sm"')}<b>Sign in to save this page</b><span class="lbl-s">The extension uses your Shelfmark account in this browser.</span></div></div>
<div class="pf"><span class="hint"></span><button class="sm-btn sm-btn--primary" type="button" style="flex:1">Sign in to Shelfmark</button></div></section>
<section class="popup sm-l3" aria-label="Can't save this page">{ph(False)}<div class="pb"><div class="done">{SC["site-blocked"].replace('class="sm-scene"', 'class="sm-scene sm-scene--sm"')}<b>This page can’t be saved</b><span class="lbl-s">Browser pages like settings and new tabs have no address to save.</span></div></div>
<div class="pf"><span class="hint"></span><button class="sm-btn sm-btn--secondary" type="button" style="flex:1">Open Shelfmark</button></div></section></div>'''
ext_ctx = f'''<div class="stage"><div class="page-mock sm-l1"><div class="bar"><i></i><i></i><i></i></div><div class="c"><p style="margin:0 0 8px">Reading list for the weekend: start with <a class="lk" href="#">this ramen guide</a> and then the pancakes.</p>
<div class="ctx sm-l2" role="menu"><button class="sm-mi" role="menuitem">Open link in new tab</button><button class="sm-mi" role="menuitem">Copy link address</button><div class="sm-msep"></div><button class="sm-mi" role="menuitem"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="4" fill="var(--accent)"/><path d="M14 4h5v8l-2.5-2-2.5 2z" fill="var(--brand-notch)"/></svg>Save link to Shelfmark</button></div>
<div class="tst sm-toast sm-l2" role="status">{ic("check")}Saved to Recipes<button class="sm-btn sm-btn--sm" type="button">Open</button></div></div></div></div>'''
page('extension.html', 'Browser extension', E_CSS, [('save', 'Save this page', ext_save), ('tabs', 'All tabs', ext_tabs), ('saved', 'Saved (edit after save)', ext_saved), ('dup', 'Already saved', ext_dup), ('out', 'Signed out, page can’t be saved', ext_out), ('ctx', 'Right-click save', ext_ctx)], shell='bare')
