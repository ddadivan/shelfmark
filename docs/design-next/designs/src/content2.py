exec(open('/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/dsgen/build_pages.py').read())

COMMON = r'''
.overlay{position:relative;min-height:520px;margin-top:24px;border-radius:var(--radius-lg);overflow:hidden}
.overlay .scrim2{position:absolute;inset:0;background:var(--scrim)}
.overlay .sm-slide{position:absolute;right:0;top:0;bottom:0;border-radius:var(--radius-lg) 0 0 var(--radius-lg)}
.overlay .sm-dialog{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:calc(100% - 32px)}
.overlay .sm-pop,.overlay .sm-menu{position:absolute}
.phones{display:flex;gap:32px;flex-wrap:wrap;margin-top:24px;align-items:flex-start}
.phone{position:relative;width:360px;height:720px;border-radius:28px;overflow:hidden;border:1px solid var(--line-strong);background:var(--canvas);flex:none}
.phone .pc{padding:16px;height:100%;overflow:hidden}
.phone .pc h1{margin:8px 0 16px;font-size:1.6rem}
.phone .scrim2{position:absolute;inset:0;background:var(--scrim)}
.phone .ptab{position:absolute;left:12px;right:12px;bottom:12px}
.phone .ptab .sm-tabbar{width:100%}
.sheet{position:absolute;left:0;right:0;bottom:0;border-radius:20px 20px 0 0;padding:8px 16px 16px;display:flex;flex-direction:column;gap:12px}
.sheet .grab{width:36px;height:4px;border-radius:2px;background:var(--line-strong);align-self:center}
.sheet h2{margin:0;font:600 1.13rem/1.25 var(--font-sans)}
.sheet .sm-mi{height:48px;font-size:.9375rem}
.phone-cap{font-size:.75rem;color:var(--text-muted);margin-top:8px;max-width:360px}
.prow{display:flex;align-items:center;gap:12px;min-height:52px;padding:0 4px 0 12px;font-size:.9375rem;font-weight:500}
.prow .n{margin-left:auto;font-size:.75rem;color:var(--text-muted);font-weight:400}
.prow+.prow{border-top:1px solid var(--line)}
.psec{font:500 .75rem/1.4 var(--font-sans);color:var(--text-muted);margin:16px 0 6px}
.setrow{display:flex;align-items:center;gap:16px;padding:12px 16px;flex-wrap:wrap}
.setrow .tx{flex:1 1 240px;min-width:0}
.setrow .tx b{display:block;font:500 .875rem/1.5 var(--font-sans)}
.setrow .tx span{font-size:.75rem;color:var(--text-muted)}
.note-box{display:flex;gap:12px;align-items:center;padding:12px 16px;border-radius:var(--radius-md);font-size:.875rem}
.note-box .sm-btn{margin-left:auto}
.disc{font-size:.75rem;color:var(--text-muted);margin:0}
.sm-pop .setrow{flex-wrap:nowrap;padding:8px}.sm-pop .setrow .tx{flex:1 1 auto}
'''
def phone(inner, overlay='', tab=True):
    return f'<div class="phone"><div class="pc">{inner}</div>{overlay}{(chr(10)+chr(60)+"div class=ptab>"+TABBAR.replace("tabbar-wrap","x-tab")+"</div>") if tab else ""}</div>'
def rows_link(items):
    return ''.join(f'<div class="rrow"><span class="sm-thumb">{ART[a]}</span><span class="tx"><span class="tt">{t}</span><span class="sm-meta" style="margin:0">{fav(d[0].upper())}{d}</span></span></div>' for a, t, d in items)
SW = lambda on, l: f'<button class="sm-switch" role="switch" aria-checked="{str(on).lower()}" aria-label="{l}"></button>'
CHK = lambda on, l, mixed=False: f'<span class="sm-check" role="checkbox" aria-checked="{"mixed" if mixed else str(on).lower()}" aria-label="{l}">{ic("check", 14) if on else ("<i style=%swidth:10px;height:2px;background:var(--text);border-radius:1px%s></i>" % (chr(34), chr(34)) if mixed else "")}</span>'
def srow(t, d, ctl): return f'<div class="setrow"><span class="tx"><b>{t}</b><span>{d}</span></span>{ctl}</div>'

# ================= GROUP 8: SELECT, MOVE, SIDE BY SIDE =================
M_CSS = COMMON + r'''
.feed{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:24px}
.feed .sm-card{width:auto;position:relative}
.feed .selbox{position:absolute;top:12px;left:12px;z-index:2}
.feed .sm-card[aria-selected="true"]{box-shadow:0 0 0 2px var(--accent)}
.bulk{position:sticky;bottom:16px;display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:8px;border-radius:var(--radius-md);margin-top:24px;font-size:.875rem}
.bulk .cnt{padding:0 8px 0 4px;font-weight:600}
.bulk .sp{flex:1}
.mv{width:440px}
.mv .tree{display:flex;flex-direction:column;max-height:300px;overflow:auto;border:1px solid var(--line);border-radius:var(--radius-md);padding:4px}
.mv .tr{display:flex;align-items:center;gap:10px;height:40px;padding:0 10px;border-radius:var(--radius-sm);font-size:.875rem;border:0;background:transparent;color:var(--text);text-align:left;width:100%}
.mv .tr[aria-selected="true"]{background:var(--accent-bg);font-weight:500}
.mv .tr .here{margin-left:auto;font-size:.75rem;color:var(--text-muted)}
.tagpop{width:300px}
.tagpop .tl{display:flex;align-items:center;gap:10px;height:40px;padding:0 8px;font-size:.875rem;border-radius:var(--radius-sm)}
.tagpop .tl .n{margin-left:auto;font-size:.75rem;color:var(--text-muted)}
.sbs{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px}
.col{border-radius:var(--radius-lg);overflow:hidden;min-height:420px;display:flex;flex-direction:column}
.col-h{display:flex;align-items:center;gap:8px;padding:12px 12px 12px 16px;border-bottom:1px solid var(--line)}
.col-h .sm-btn{font-weight:600}
.col-h .n{font-size:.75rem;color:var(--text-muted)}
.col .rrow+.rrow{border-top:1px solid var(--line)}
.col .rrow .grip{color:var(--control);cursor:grab}
.col.drop{box-shadow:0 0 0 2px var(--accent) inset}
.ghost{transform:rotate(-1.5deg);box-shadow:var(--shadow-l3);border:1px solid var(--line-strong);background:var(--surface);border-radius:var(--radius-md);margin:8px;opacity:.96}
.dropline{height:2px;background:var(--accent);margin:0 16px;border-radius:1px}
.sugrow{display:flex;align-items:center;gap:12px;padding:8px 12px 8px 16px;min-height:56px;flex-wrap:wrap}
.sugrow+.sugrow{border-top:1px solid var(--line)}
.sugrow .tx{flex:1 1 240px;min-width:0;display:flex;flex-direction:column}
.sugrow .tt{font:600 1rem/1.5 var(--font-sans);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sugrow .sm-chip{height:28px;font-size:.75rem;padding:0 8px}
.dropzone{position:absolute;inset:16px;border:2px dashed var(--accent);border-radius:var(--radius-lg);display:grid;place-items:center;text-align:center;background:color-mix(in srgb,var(--canvas) 88%,transparent)}
.dropzone b{display:block;font:600 1.27rem/1.25 var(--font-sans);margin-top:12px}
.related{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.related .sm-card{width:auto}
.reader-mock{max-width:68ch;margin:24px auto 0;font-size:1.125rem;line-height:1.6}
.reader-mock h2{font:600 2.03rem/1.15 var(--font-sans);margin:0 0 8px}
@media (max-width:39.99em){.feed{grid-template-columns:1fr 1fr;gap:8px}body:has(.state.on .bulk) .tabbar-wrap{display:none}.bulk{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));flex-wrap:nowrap;overflow-x:auto;z-index:40}.bulk .sm-btn{flex:none}.sbs{grid-template-columns:1fr}.related{grid-template-columns:1fr 1fr}.mv{width:auto}}
'''
CARDS = [('video', '16/9', 'Signal Forms in 20 minutes', 'youtube.com'), ('shirt', '4/5', 'Wool overshirt', 'uniqlo.com'), ('bowl', '1/1', 'Rich tonkotsu ramen broth', 'seriouseats.com'), ('jacket', '4/5', 'Nano Puff jacket', 'patagonia.com'), ('pancakes', '1/1', 'Lemon ricotta pancakes', 'smittenkitchen.com'), ('dark', '16/9', 'Zoneless change detection', 'angular.dev')]
def selcard(a, r, t, d, on):
    return f'<article class="sm-card sm-l1" aria-selected="{str(on).lower()}"><span class="selbox">{CHK(on, "Select " + t)}</span><div class="sm-cover" style="aspect-ratio:{r}">{ART[a]}</div><div class="sm-card-body"><h3 class="sm-card-title">{t}</h3><div class="sm-meta">{fav(d[0].upper())}{d}</div></div></article>'
BULK = f'''<div class="bulk sm-l2" role="toolbar" aria-label="3 links selected"><button class="sm-ib" type="button" aria-label="Clear selection">{ic("x")}</button><span class="cnt">3 selected</span>
<button class="sm-btn sm-btn--sm" type="button">{ic("move")}Move</button><button class="sm-btn sm-btn--sm" type="button">{ic("hash")}Tags</button><button class="sm-btn sm-btn--sm" type="button">{ic("star")}Favorite</button><button class="sm-btn sm-btn--sm" type="button">{ic("bell")}Remind</button><button class="sm-btn sm-btn--sm" type="button">{ic("ext")}Open all</button><button class="sm-btn sm-btn--sm" type="button">{ic("copy")}Copy links</button><span class="sp"></span><button class="sm-btn sm-btn--sm" type="button" style="color:var(--danger)">{ic("trash")}Delete</button></div>'''
select = f'''<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-top:32px"><h1 style="margin:0">All links</h1><span class="lead" style="margin:0">Select with X, Shift-click for a range, Ctrl A for all</span><button class="sm-btn sm-btn--sm" type="button" style="margin-left:auto">Select all 58</button></div>
<div class="feed">{''.join(selcard(a, r, t, d, i in (0, 2, 4)) for i, (a, r, t, d) in enumerate(CARDS))}</div>{BULK}'''
TREE = [('All links', None, 0, ''), ('Unsorted', 'graphite', 0, 'here'), ('Angular', 'clay', 0, ''), ('Forms', 'clay', 1, ''), ('Clothes', 'rose', 0, ''), ('Recipes', 'amber', 0, 'sel'), ('Ramen', 'amber', 1, ''), ('Baking', 'amber', 1, ''), ('Work', 'ocean', 0, '')]
def tree(filter_=''):
    out = ''; parent = ''
    for n, c, lvl, k in TREE:
        if lvl == 0: parent = n
        if n == 'All links': continue
        if filter_ and filter_.lower() not in n.lower(): continue
        nm = n if not filter_ else (f'<span style="color:var(--text-muted)">{parent} /&nbsp;</span>' if lvl else '') + n.replace(filter_.capitalize(), f'<mark style="padding:0">{filter_.capitalize()}</mark>')
        if filter_: lvl = 0
        out += f'<button class="tr" role="treeitem" aria-level="{lvl+1}" aria-selected="{str(k == "sel").lower()}" type="button" style="padding-left:{10+lvl*24}px">{tile(c)}{nm}{"<span class=here>Current</span>" if k == "here" else ""}</button>'
    return out
move = f'''<div class="overlay sm-l1"><div class="scrim2"></div><form class="sm-dialog sm-l3 mv" role="dialog" aria-labelledby="mvt"><h2 id="mvt">Move 3 links</h2>
<div class="sm-input">{ic("search")}<input value="" placeholder="Find a folder" aria-label="Find a folder"></div>
<div class="tree" role="tree" aria-label="Folders">{tree()}<button class="tr" type="button" style="color:var(--text-muted)">{ic("plus")}New folder…</button></div>
<div class="foot"><button class="sm-btn sm-btn--secondary" type="button">Cancel</button><button class="sm-btn sm-btn--primary" type="button">Move to Recipes</button></div></form></div>
<p class="disc" style="margin-top:8px">Type to filter; arrows move, Enter moves. A folder is moved the same way; its own subfolders are not offered.</p>'''
move_phone = f'''<div class="phones"><div>{phone('<h1>Unsorted</h1>' + '<div class="sm-panel sm-l1" style="max-width:none">' + rows_link([('video', 'Sourdough for beginners', 'youtube.com'), ('jacket', 'Nano Puff jacket', 'patagonia.com')]) + '</div>', f'<div class="scrim2"></div><div class="sheet sm-l3" role="dialog" aria-labelledby="pmv" style="top:120px"><span class="grab"></span><h2 id="pmv">Move to</h2><div class="sm-input" style="height:48px">{ic("search")}<input placeholder="Find a folder" style="font-size:1rem"></div><div class="mv" style="width:auto"><div class="tree" style="max-height:none;border:0;padding:0">{tree("ra")}</div></div><p class="disc">Tap a folder to move it there. A subfolder shows its parent first.</p></div>', tab=False)}<p class="phone-cap">Phone: the same picker as a tall sheet, field focused; typing “ra” filters to Ramen.</p></div></div>'''
TAGS = [('angular', 1, 'all'), ('reading', 2, 'some'), ('video', 0, 'none'), ('clothes', 0, 'none'), ('recipes', 1, 'some')]
bulk_tags = f'''<div class="overlay sm-l1" style="min-height:440px"><div class="sm-pop sm-l2 tagpop" role="dialog" aria-label="Tags for 3 links" style="left:24px;top:24px"><div class="sm-input" style="margin:4px">{ic("hash")}<input placeholder="Add or find a tag" aria-label="Add or find a tag"></div>
{''.join(f'<div class="tl">{CHK(k == "all", t, k == "some")}<span>{t}</span><span class="n">{"on all 3" if k == "all" else ("on " + str(n) + " of 3" if k == "some" else "")}</span></div>' for t, n, k in TAGS)}
<div class="sm-msep"></div><div style="display:flex;gap:8px;justify-content:flex-end;padding:4px"><button class="sm-btn sm-btn--sm" type="button">Cancel</button><button class="sm-btn sm-btn--primary sm-btn--sm" type="button">Apply to 3 links</button></div></div>
<div style="position:absolute;left:360px;top:24px;max-width:300px;font-size:.875rem;color:var(--text-muted)">A dash means some of the selected links have the tag. Click it once to add it to all, again to remove it from all. Nothing changes until Apply.</div></div>'''
side = f'''<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-top:32px"><h1 style="margin:0">Side by side</h1><span class="lead" style="margin:0">Drag links between two feeds to file them. Esc closes.</span><button class="sm-btn sm-btn--sm" type="button" style="margin-left:auto">{ic("x")}Close</button></div>
<div class="sbs"><section class="col sm-l1" aria-label="Unsorted"><div class="col-h"><button class="sm-btn sm-btn--sm" type="button">{tile("graphite")}Unsorted{ic("chev")}</button><span class="n">17 links</span></div>
{''.join(f'<div class="rrow"><span class="grip">{ic("more")}</span><span class="sm-thumb">{ART[a]}</span><span class="tx"><span class="tt">{t}</span><span class="sm-meta" style="margin:0">{fav(d[0].upper())}{d}</span></span></div>' for a, t, d in [('video', 'Sourdough for beginners', 'youtube.com'), ('type', 'Learn accessibility', 'web.dev'), ('dark', 'linkedSignal in practice', 'youtube.com')])}
<div class="rrow" style="opacity:.35"><span class="grip">{ic("more")}</span><span class="sm-thumb">{ART['jacket']}</span><span class="tx"><span class="tt">Nano Puff jacket</span><span class="sm-meta" style="margin:0">{fav("P")}patagonia.com</span></span></div></section>
<section class="col sm-l1 drop" aria-label="Clothes"><div class="col-h"><button class="sm-btn sm-btn--sm" type="button">{tile("rose")}Clothes{ic("chev")}</button><span class="n">7 links</span></div>
{rows_link([('shirt', 'Wool overshirt', 'uniqlo.com')])}<div class="dropline"></div><div class="rrow ghost"><span class="sm-thumb">{ART['jacket']}</span><span class="tx"><span class="tt">Nano Puff jacket</span><span class="sm-meta" style="margin:0">Drop to move to Clothes</span></span></div>{rows_link([('shirt', 'Linen shirt', 'cos.com')])}</section></div>
<p class="disc" style="margin-top:8px">Keyboard: select a row, M opens Move with the other feed's folder first. From 80em; below that Side by side is not offered.</p>'''
unsorted = f'''<div style="display:flex;align-items:baseline;gap:12px;margin-top:32px"><h1 style="margin:0">Unsorted</h1><span class="lead" style="margin:0">17 links</span></div>
<div class="note-box sm-l1" style="margin-top:16px"><span style="color:var(--ai)">{ic("spark")}</span><span><b>4 links have a suggested folder.</b> Review them in Tidy up, or accept one by one below.</span><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Open Tidy up</button></div>
<div class="sm-panel sm-l1" style="max-width:none;margin-top:16px">{''.join(f'<div class="sugrow"><span class="sm-thumb">{ART[a]}</span><span class="tx"><span class="tt">{t}</span><span class="sm-meta" style="margin:0">{fav(d[0].upper())}{d}</span></span>{f"<button class={chr(34)}sm-chip sm-chip--ai{chr(34)} type=button>{ic(chr(115)+chr(112)+chr(97)+chr(114)+chr(107))}Move to {s}</button><button class={chr(34)}sm-ib{chr(34)} type=button aria-label={chr(34)}Dismiss suggestion{chr(34)}>{ic(chr(120))}</button>" if s else ""}</div>' for a, t, d, s in [('video', 'Sourdough for beginners', 'youtube.com', 'Recipes'), ('jacket', 'Nano Puff jacket', 'patagonia.com', 'Clothes'), ('type', 'A complete guide to CSS Grid', 'css-tricks.com', 'Design'), ('dark', 'Some untitled page', 'example.org', '')])}</div>'''
rule_offer = f'''<div class="sm-panel sm-l1" style="max-width:none;margin-top:32px">{rows_link([('shirt', 'Linen shirt', 'uniqlo.com'), ('shirt', 'Wool overshirt', 'uniqlo.com'), ('jacket', 'Ultra light down jacket', 'uniqlo.com')])}</div>
<div class="sm-toast sm-l2" role="status" style="margin-top:24px;max-width:560px;flex-wrap:wrap">{ic("rule")}<span style="flex:1 1 240px">Third link from <b>uniqlo.com</b> moved to Clothes. Do this automatically?</span><button class="sm-btn sm-btn--sm" type="button">Not now</button><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Create rule</button></div>
<p class="disc" style="margin-top:8px">Offered once per site after three manual moves to the same folder; “Not now” never asks again for that site. Create rule opens the rule editor prefilled.</p>'''
drop = f'''<div class="overlay sm-l1" style="min-height:460px;background:var(--canvas)"><div class="feed" style="padding:16px;margin:0;opacity:.35">{''.join(selcard(a, r, t, d, False).replace('<span class="selbox">', '<span class="selbox" hidden>') for a, r, t, d in CARDS[:3])}</div>
<div class="dropzone"><div>{SC["saved"].replace('class="sm-scene"', 'class="sm-scene sm-scene--sm"')}<b>Drop to save</b><span class="lbl-s">A link, several links, or text with links in it</span></div></div></div>'''
related = f'''<article class="reader-mock"><span class="lbl-s">angular.dev · 6 min read</span><h2>Zoneless change detection</h2><p>Angular can run without zone.js. Change detection then runs when a signal you read changes, when an event handler runs, or when you ask for it…</p>
<hr style="border:0;border-top:1px solid var(--line);margin:32px 0 24px"><p class="sec-t" style="font-size:1.13rem">Related on your shelf</p>
<div class="related">{''.join(f'<article class="sm-card sm-l1"><div class="sm-cover" style="aspect-ratio:16/9">{ART[a]}</div><div class="sm-card-body"><h3 class="sm-card-title" style="font-size:.875rem">{t}</h3><div class="sm-meta">{fav(d[0].upper())}{d}</div></div></article>' for a, t, d in [('video', 'Signal Forms in 20 minutes', 'youtube.com'), ('type', 'NgRx SignalStore patterns', 'dev.to'), ('dark', 'linkedSignal in practice', 'youtube.com')])}</div>
<p class="disc" style="margin-top:8px">Same tags, folder or close in meaning; three at most, at the end of Reader and in Details.</p></article>'''
PL = f'''<h1>Library</h1><div class="sm-panel sm-l1" style="max-width:none">{''.join(f'<div class="prow">{ic(i, 20)}<span>{l}</span><span class="n">{n}</span></div>' for i, l, n in [('bookmark', 'All links', 58), ('inbox', 'Unsorted', 17), ('star', 'Favorites', 6)])}</div>
<div class="psec">Pinned</div><div class="sm-panel sm-l1" style="max-width:none"><div class="prow">{tile("clay")}<span>Angular</span><span class="n">6</span><button class="sm-ib" type="button" aria-label="Actions for Angular" style="width:44px;height:44px">{ic("more")}</button></div></div>
<div class="psec" style="display:flex">Folders<button class="sm-ib" type="button" aria-label="New folder" style="margin-left:auto;width:32px;height:24px">{ic("plus")}</button></div><div class="sm-panel sm-l1" style="max-width:none">{''.join(f'<div class="prow">{tile(c)}<span>{n}</span><span class="n">{k}</span><button class="sm-ib" type="button" aria-label="Actions for {n}" style="width:44px;height:44px">{ic("more")}</button></div>' for n, c, k in [('Clothes', 'rose', 7), ('Recipes', 'amber', 7), ('Work', 'ocean', 7)])}</div>
<div class="psec">Tags</div><div style="display:flex;flex-wrap:wrap;gap:6px">{''.join(f'<span class="sm-tag">{t}</span>' for t in ['angular', 'reading', 'clothes', 'design'])}<span class="sm-tag" style="border-style:dashed">All 12</span></div>'''
PSEL = f'''<div style="display:flex;align-items:center;gap:8px;margin:4px 0 12px"><button class="sm-ib" type="button" aria-label="Cancel selection">{ic("x")}</button><b>2 selected</b><button class="sm-btn sm-btn--sm" type="button" style="margin-left:auto">Select all</button></div>
<div class="sm-panel sm-l1" style="max-width:none">{''.join(f'<div class="rrow" style="padding-left:12px">{CHK(on, t)}<span class="sm-thumb">{ART[a]}</span><span class="tx"><span class="tt">{t}</span><span class="sm-meta" style="margin:0">{fav(d[0].upper())}{d}</span></span></div>' for a, t, d, on in [('video', 'Sourdough', 'youtube.com', True), ('jacket', 'Nano Puff jacket', 'patagonia.com', True), ('shirt', 'Wool overshirt', 'uniqlo.com', False), ('bowl', 'Tonkotsu broth', 'seriouseats.com', False)])}</div>'''
PBULK = f'<div class="sheet sm-l3" style="flex-direction:row;justify-content:space-around;padding:12px 8px calc(12px + env(safe-area-inset-bottom,0px));border-radius:20px 20px 0 0">' + ''.join(f'<button class="sm-tab" type="button" style="width:64px">{ic(i, 20)}{l}</button>' for i, l in [('move', 'Move'), ('hash', 'Tags'), ('bell', 'Remind'), ('more', 'More'), ('trash', 'Delete')]) + '</div>'
phone_lib = f'''<div class="phones"><div>{phone(PL)}<p class="phone-cap">Library tab: scopes, pinned, folders with ⋯, tags. New folder opens the name sheet.</p></div><div>{phone(PSEL, PBULK, tab=False)}<p class="phone-cap">Select: long-press a link or Select in the ⋯ menu. The tab bar turns into the actions bar; More holds Favorite, Open all, Copy links.</p></div></div>'''
page('select-move.html', 'Select, move, side by side', M_CSS, [
 ('select', 'Select several links and the bulk bar', select), ('move', 'Move to a folder', move), ('move-phone', 'Move on the phone', move_phone), ('tags', 'Tags for several links', bulk_tags),
 ('side', 'Side by side, dragging a link', side), ('unsorted', 'Unsorted with suggestions', unsorted), ('rule-offer', 'Rule offer after three moves', rule_offer), ('drop', 'Drop to save', drop),
 ('related', 'Related on your shelf (Reader)', related), ('phone', 'Phone: Library tab and selection', phone_lib)], cur='all')

# ================= GROUP 9: IMPORT, EXPORT, SHARING =================
D_CSS = COMMON + r'''
.wrap{max-width:720px}
.steps{display:flex;gap:8px;align-items:center;margin-top:16px;font-size:.75rem;color:var(--text-muted);flex-wrap:wrap}
.steps b{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;border:1px solid var(--line-strong);font-weight:500;margin-right:6px}
.steps .on{color:var(--text)}.steps .on b{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.steps .ok b{background:var(--accent-bg);border-color:transparent}
.steps i{width:24px;height:1px;background:var(--line-strong)}
.dz{margin-top:24px;border:1.5px dashed var(--line-strong);border-radius:var(--radius-lg);padding:40px 24px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.dz b{font:600 1.13rem/1.25 var(--font-sans)}
.how{margin-top:24px}
.how ol{margin:12px 0 0;padding-left:20px;font-size:.875rem;line-height:1.6}
.nums{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border-radius:var(--radius-md);overflow:hidden;margin-top:24px;border:1px solid var(--line)}
.nums div{background:var(--surface);padding:16px}
.nums b{display:block;font:600 1.6rem/1.2 var(--font-sans)}
.nums span{font-size:.75rem;color:var(--text-muted)}
.choice{display:grid;gap:8px;margin-top:8px}
.opt{display:flex;gap:12px;align-items:flex-start;padding:16px;border-radius:var(--radius-md);border:1px solid var(--line);background:var(--surface)}
.opt[aria-checked="true"]{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.opt .rd{width:20px;height:20px;border-radius:50%;border:1px solid var(--control);flex:none;margin-top:2px;display:grid;place-items:center}
.opt[aria-checked="true"] .rd{border:6px solid var(--accent)}
.opt b{display:block;font:500 .875rem/1.5 var(--font-sans)}.opt span{font-size:.75rem;color:var(--text-muted)}
.grp{display:flex;align-items:center;gap:12px;padding:8px 16px;min-height:52px}
.grp+.grp{border-top:1px solid var(--line)}
.grp input{flex:1;min-width:0;border:0;background:transparent;font:500 .875rem/1.5 var(--font-sans);color:var(--text);outline:0}
.grp .from{font-size:.75rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}
.bar{height:6px;border-radius:999px;background:var(--surface-hover);overflow:hidden;margin-top:12px}.bar i{display:block;height:100%;background:var(--accent);width:50%}
.recent .setrow+.setrow{border-top:1px solid var(--line)}
.sharepop{width:360px}
.linkbox{display:flex;gap:8px;align-items:center}
.linkbox .sm-input{flex:1;min-width:0;font-family:var(--font-mono);font-size:.75rem}
@media (max-width:39.99em){.nums{grid-template-columns:1fr}.grp .from{display:none}.sharepop{width:auto}}
'''
STEPS = lambda cur: '<div class="steps" aria-label="Import steps">' + '<i></i>'.join(f'<span class="{"on" if i == cur else ("ok" if i < cur else "")}"><b>{ic("check", 12) if i < cur else i + 1}</b>{t}</span>' for i, t in enumerate(['Choose file', 'Check', 'Folders', 'Import'])) + '</div>'
imp_choose = f'''<div class="wrap"><h1>Import bookmarks</h1><p class="lead">Bring links from your browser. Nothing is saved until you confirm.</p>{STEPS(0)}
<div class="dz">{ic("upload", 24)}<b>Drop the bookmarks file here</b><span class="lbl-s">An .html file exported from Chrome, Safari, Firefox or Edge</span><button class="sm-btn sm-btn--primary" type="button" style="margin-top:8px">Choose file</button></div>
<section class="how"><div class="sm-seg" role="radiogroup" aria-label="Browser">{''.join(f'<button role="radio" aria-checked="{str(b == "Chrome").lower()}">{b}</button>' for b in ['Chrome', 'Safari', 'Firefox', 'Edge'])}</div>
<ol><li>Open <b>Bookmarks › Bookmark manager</b> (Ctrl Shift O).</li><li>Click ⋮ at the top right, then <b>Export bookmarks</b>.</li><li>Choose the saved file here.</li></ol></section>
<section style="margin-top:32px"><p class="sec-t">Recent imports</p><div class="sm-panel sm-l1 recent" style="max-width:none">{srow('bookmarks_11_12_26.html', '12 Nov · 1,163 links into 9 folders', '<button class="sm-btn sm-btn--sm" type="button">Undo import</button>')}{srow('safari-export.html', '3 Oct · 48 links', '<span class="lbl-s">Undo no longer available</span>')}</div></section></div>'''
imp_check = f'''<div class="wrap"><h1>Import bookmarks</h1><p class="lead">bookmarks_23_11_26.html</p>{STEPS(1)}
<div class="nums"><div><b>1,284</b><span>links in 46 folders</span></div><div><b>112</b><span>already on your shelf, skipped</span></div><div><b>9</b><span>not web addresses, skipped</span></div></div>
<section style="margin-top:32px"><p class="sec-t">Folders</p><div class="choice" role="radiogroup" aria-label="Folders">
<div class="opt" role="radio" aria-checked="false"><span class="rd"></span><span><b>Keep my folders</b><span>46 folders as they are in the browser, nested the same way.</span></span></div>
<div class="opt" role="radio" aria-checked="true"><span class="rd"></span><span><b>Group into fewer folders with AI {ic("spark", 12).replace('aria-hidden="true"', 'style="color:var(--ai);vertical-align:-1px" aria-hidden="true"')}</b><span>Suggests about 10 folders from titles and addresses. You review them before anything is imported.</span></span></div>
<div class="opt" role="radio" aria-checked="false"><span class="rd"></span><span><b>Everything to Unsorted</b><span>Sort later in Tidy up.</span></span></div></div></section>
<div class="sm-panel sm-l1" style="max-width:none;margin-top:16px">{srow('Turn folder names into tags', 'A link in “Work › Angular” gets #work and #angular.', SW(False, 'Folder names as tags'))}</div>
<div style="display:flex;gap:8px;margin-top:24px"><button class="sm-btn sm-btn--secondary" type="button">Back</button><button class="sm-btn sm-btn--primary" type="button">Suggest folders</button></div></div>'''
GR = [('Angular and frontend', 'clay', 312, 'Work › Angular, Dev, JS, CSS tricks'), ('Recipes', 'amber', 186, 'Food, Cooking, Bake'), ('Clothes', 'rose', 141, 'Shopping, Wishlist'), ('Design', 'plum', 128, 'Inspiration, UI, Fonts'), ('Travel', 'teal', 97, 'Trips, Japan 2025'), ('Reading', 'graphite', 88, 'Read later, Articles'), ('Tools', 'ocean', 71, 'Apps, Software')]
imp_groups = f'''<div class="wrap"><h1>Import bookmarks</h1><p class="lead">AI suggested 7 folders for 1,163 links. Rename, merge or skip them.</p>{STEPS(2)}
<div class="sm-panel sm-l1" style="max-width:none;margin-top:24px">{''.join(f'<div class="grp">{CHK(True, "Use " + n)}{tile(c)}<input value="{n}" aria-label="Folder name"><span class="from" title="From {fr}">from {fr}</span><span class="lbl-s">{k}</span></div>' for n, c, k, fr in GR)}
<div class="grp">{CHK(True, "Use Unsorted")}{tile("graphite")}<span style="flex:1;font:500 .875rem/1.5 var(--font-sans)">Unsorted</span><span class="from">didn't fit a group</span><span class="lbl-s">140</span></div></div>
<p class="disc" style="margin-top:8px">A cleared folder sends its links to Unsorted. Folders with the same name as one you have are merged into it. Uses 1,163 of your 500 monthly AI links? No: grouping reads titles only and counts as one request.</p>
<div style="display:flex;gap:8px;margin-top:24px"><button class="sm-btn sm-btn--secondary" type="button">Back</button><button class="sm-btn sm-btn--primary" type="button">Import 1,163 links</button></div></div>'''
imp_groups = imp_groups.replace(' Uses 1,163 of your 500 monthly AI links? No: grouping reads titles only and counts as one request.', ' Grouping reads titles and addresses only and counts as one AI request.')
imp_progress = f'''<div class="wrap"><h1>Import bookmarks</h1><p class="lead">You can keep using Shelfmark; this continues in the background.</p>{STEPS(3)}
<div class="sm-panel sm-l1" style="max-width:none;margin-top:24px;padding:24px"><div style="display:flex;justify-content:space-between;font-size:.875rem"><b style="font-weight:500">Importing… 640 of 1,163</b><span class="lbl-s">about 1 minute left</span></div><div class="bar" role="progressbar" aria-valuenow="55" aria-valuemin="0" aria-valuemax="100" aria-label="Import progress"><i style="width:55%"></i></div>
<p class="disc" style="margin-top:12px">Previews and pictures arrive over the next minutes.</p></div>
<div class="sm-toast sm-l2" role="status" style="margin-top:24px;max-width:420px">{ic("upload")}<span style="flex:1">Importing 640 of 1,163</span><button class="sm-btn sm-btn--sm" type="button">Show</button></div><p class="disc" style="margin-top:8px">Elsewhere in the app the progress stays as a small toast until it finishes.</p></div>'''
imp_done = f'''<div class="wrap"><div class="sm-l1" style="border-radius:var(--radius-lg);padding:48px 24px;margin-top:32px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px">{SC["saved"]}<b style="font:600 1.6rem/1.2 var(--font-sans)">1,163 links imported</b><p class="lead" style="margin:0">Into 7 folders and Unsorted. 112 were already on your shelf.</p>
<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;justify-content:center"><button class="sm-btn sm-btn--primary" type="button">Open All links</button><button class="sm-btn sm-btn--secondary" type="button">Open Unsorted (140)</button><button class="sm-btn" type="button">Undo import</button></div>
<p class="disc" style="margin-top:8px">Undo moves exactly these links and new folders to Trash, for 7 days.</p><button class="sm-btn sm-btn--sm" type="button" data-replay>Replay</button></div></div>'''
export = f'''<div class="overlay sm-l1"><div class="scrim2"></div><form class="sm-dialog sm-l3" role="dialog" aria-labelledby="ex" style="width:460px"><h2 id="ex">Export links</h2>
<div><span class="lbl-s">What</span><div class="sm-seg" role="radiogroup" aria-label="What" style="margin-top:6px"><button role="radio" aria-checked="true">Whole library · 58</button><button role="radio" aria-checked="false">Recipes · 7</button></div></div>
<div><span class="lbl-s">Format</span><div class="choice" role="radiogroup" aria-label="Format">{''.join(f'<div class="opt" role="radio" aria-checked="{str(i == 0).lower()}" style="padding:12px"><span class="rd"></span><span><b>{t}</b><span>{d}</span></span></div>' for i, (t, d) in enumerate([('JSON', 'Everything, including notes, tags, reminders. Can be imported back.'), ('Bookmarks HTML', 'Opens in any browser’s import. Folders kept, notes not.'), ('CSV', 'One row per link, for spreadsheets.')]))}</div></div>
<div class="foot"><button class="sm-btn sm-btn--secondary" type="button">Cancel</button><button class="sm-btn sm-btn--primary" type="button">{ic("upload")}Export JSON</button></div></form></div>'''
share = f'''<div class="overlay sm-l1" style="min-height:460px"><div class="sm-pop sm-l2 sharepop" role="dialog" aria-label="Share Recipes" style="left:24px;top:24px"><div class="sm-pgroup">
<div style="display:flex;align-items:center;gap:12px;padding:4px 8px">{tile("amber")}<b style="flex:1;font:600 1rem/1.5 var(--font-sans)">Share “Recipes”</b></div>
{srow('Anyone with the link can view', 'Read-only. Subfolders are not included.', SW(True, 'Public link'))}
<div class="linkbox" style="padding:0 8px"><span class="sm-input" style="height:36px">shelfmark.app/c/k3f9-ramen</span><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">{ic("copy")}Copy</button></div>
{srow('Show my notes', 'Notes appear under each link.', SW(True, 'Show notes'))}
<div style="display:flex;gap:8px;padding:4px 8px 8px"><button class="sm-btn sm-btn--sm" type="button">{ic("ext")}Open public page</button><button class="sm-btn sm-btn--sm" type="button" style="margin-left:auto">Reset link</button></div></div></div>
<div style="position:absolute;left:420px;top:24px;max-width:300px;font-size:.875rem;color:var(--text-muted)">Reset link makes the old address stop working and gives a new one; it asks first. Turning the switch off hides the page at once. The public page is in group 6.</div></div>'''
share_off = f'''<div class="overlay sm-l1" style="min-height:300px"><div class="sm-pop sm-l2 sharepop" role="dialog" aria-label="Share Recipes" style="left:24px;top:24px"><div class="sm-pgroup">
<div style="display:flex;align-items:center;gap:12px;padding:4px 8px">{tile("amber")}<b style="flex:1;font:600 1rem/1.5 var(--font-sans)">Share “Recipes”</b></div>
{srow('Anyone with the link can view', 'Off: only you can see this folder.', SW(False, 'Public link'))}</div></div></div>'''
SHARE_SHEET = f'''<div class="scrim2"></div><div class="sheet sm-l3" role="dialog" aria-labelledby="st2"><span class="grab"></span><h2 id="st2">Save to Shelfmark</h2>
<div style="display:flex;gap:12px;align-items:center"><span class="sm-thumb" style="width:72px;height:56px">{ART['bowl']}</span><span><b style="font:600 .9375rem/1.4 var(--font-sans)">Rich tonkotsu ramen broth from scratch</b><br><span class="lbl-s">seriouseats.com</span></span></div>
<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:var(--radius-sm);background:var(--surface-hover);font-size:.875rem">{tile("amber")}<span>Goes to <b>Recipes</b> <span style="color:var(--text-muted)">· rule</span></span><button class="sm-btn sm-btn--sm" type="button" style="margin-left:auto">Change</button></div>
<div class="sm-input" style="height:48px"><input placeholder="Add a note" style="font-size:1rem"></div>
<div style="display:flex;gap:8px"><button class="sm-btn sm-btn--secondary" type="button" style="flex:1;height:48px">Add details</button><button class="sm-btn sm-btn--primary" type="button" style="flex:1;height:48px">Save</button></div></div>'''
share_target = f'''<div class="phones"><div>{phone('<div style="font:600 1.13rem/1.3 var(--font-sans);margin-top:8px">seriouseats.com</div><p class="lead">Ramen broth recipe page in the browser…</p>', SHARE_SHEET, tab=False)}<p class="phone-cap">Android: Share › Shelfmark opens this sheet over the other app. Save closes it with a short confirmation; the user stays where they were.</p></div>
<div>{phone('<div style="font:600 1.13rem/1.3 var(--font-sans);margin-top:8px">seriouseats.com</div>', '<div class="sm-toast sm-l2" role="status" style="position:absolute;left:12px;right:12px;bottom:16px">' + ic("check") + '<span style="flex:1">Saved to Recipes</span><button class="sm-btn sm-btn--sm" type="button">Open</button></div>', tab=False)}<p class="phone-cap">After Save: a toast for 4 s, then back to the other app.</p></div></div>'''
page('data.html', 'Import, export, sharing', D_CSS, [
 ('import', 'Import: choose a file', imp_choose), ('check', 'Import: check and folders', imp_check), ('groups', 'Import: AI folders', imp_groups), ('progress', 'Import: in progress', imp_progress), ('done', 'Import: done', imp_done),
 ('export', 'Export', export), ('share', 'Share a folder', share), ('share-off', 'Share a folder: off', share_off), ('share-target', 'Phone: save from another app', share_target)], cur='')

# ================= GROUP 10: FIRST RUN, HELP, LANDING =================
F_CSS = COMMON + r'''
.strip{display:flex;align-items:center;gap:12px;padding:8px 16px;font-size:.875rem;border-bottom:1px solid var(--line);background:var(--surface);flex-wrap:wrap}
.strip .sm-btn{margin-left:auto}
.strip.off{background:var(--surface-hover)}
.onb{max-width:760px;margin:32px auto 0;text-align:center}
.onb h1{margin:8px 0 0;font:600 2.03rem/1.15 var(--font-sans);letter-spacing:-.01em}
.ways{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:32px;text-align:left}
.way{padding:20px;border-radius:var(--radius-md);display:flex;flex-direction:column;gap:8px}
.way b{font:600 1rem/1.5 var(--font-sans)}.way p{margin:0;font-size:.875rem;color:var(--text-muted);flex:1}
.way .n{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:var(--radius-sm);background:var(--surface-hover);font:600 .875rem/1 var(--font-sans)}
.sc-group{margin-top:24px}
.kbrow{display:flex;align-items:center;gap:16px;padding:10px 16px;font-size:.875rem}
.kbrow+.kbrow{border-top:1px solid var(--line)}
.kbrow span:first-child{flex:1}
.kbrow .sm-kbd+.sm-kbd{margin-left:4px}
.video{position:relative;aspect-ratio:16/9;border-radius:var(--radius-md);overflow:hidden;background:#1d1d1f;display:grid;place-items:center}
.video .sm-play{position:static}
.wn{display:flex;gap:16px;padding:12px 16px}.wn+.wn{border-top:1px solid var(--line)}
.wn .d{flex:none;width:72px;font-size:.75rem;color:var(--text-muted);padding-top:2px}
.wn b{font:500 .875rem/1.5 var(--font-sans)}.wn p{margin:2px 0 0;font-size:.875rem;color:var(--text-muted)}
.fb-list .setrow+.setrow{border-top:1px solid var(--line)}
.status{display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:var(--radius-xs);background:var(--surface-hover);font-size:.75rem}
.status.done{background:color-mix(in srgb,var(--success) 14%,transparent);color:var(--success)}
.ct{display:grid;grid-template-columns:1fr 320px;gap:24px;align-items:start;margin-top:24px}
.sw8{display:flex;gap:8px;flex-wrap:wrap}
.sw8 button{width:32px;height:32px;border-radius:50%;border:1px solid var(--line-strong)}
.sw8 button[aria-checked="true"]{box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--text)}
.prev{border-radius:var(--radius-lg);padding:16px;display:flex;flex-direction:column;gap:12px}
.rate{display:flex;gap:8px;flex-wrap:wrap}
.rate button{min-width:48px;height:40px;border:1px solid var(--line-strong);border-radius:var(--radius-sm);background:var(--surface);font:500 .875rem/1 var(--font-sans);color:var(--text)}
.land{max-width:1120px;margin:0 auto;padding:0 max(16px,env(safe-area-inset-left,0px)) 64px}
.lnav{display:flex;align-items:center;gap:16px;height:64px}
.lnav .logo{margin:0;padding:0}
.lnav a{color:var(--text-muted);text-decoration:none;font-size:.875rem}
.lnav .sm-btn{margin-left:auto}
.hero{text-align:center;padding:64px 0 32px}
.hero h1{margin:0 auto;font:600 2.57rem/1.1 var(--font-sans);letter-spacing:-.01em;max-width:18ch}
.hero p{margin:16px auto 0;color:var(--text-muted);font-size:1.13rem;max-width:52ch;line-height:1.5}
.hero .cta{display:flex;gap:8px;justify-content:center;margin-top:24px;flex-wrap:wrap}
.shot{border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--line-strong);box-shadow:var(--shadow-l3)}
.shot .bar{height:32px;background:var(--surface-hover);display:flex;gap:6px;align-items:center;padding:0 12px}.shot .bar i{width:10px;height:10px;border-radius:50%;background:var(--control);opacity:.5}
.shot .in{display:grid;grid-template-columns:200px 1fr;gap:16px;padding:16px;background:var(--canvas)}
.mini-side{display:flex;flex-direction:column;gap:2px;padding:8px;border-radius:var(--radius-md)}
.mini-side .sm-nav{width:100%;height:28px;font-size:.75rem}
.mini-feed{columns:3 140px;column-gap:12px}.mini-feed .sm-card{width:auto;margin-bottom:12px;break-inside:avoid}
.jobs{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;margin-top:64px}
.job h3{margin:12px 0 4px;font:600 1.13rem/1.25 var(--font-sans)}.job p{margin:0;color:var(--text-muted);font-size:.9375rem;line-height:1.5}
.job .ji{display:grid;place-items:center;width:40px;height:40px;border-radius:var(--radius-md);background:var(--surface);border:1px solid var(--line)}
.lfoot{display:flex;gap:16px;margin-top:64px;padding-top:24px;border-top:1px solid var(--line);font-size:.75rem;color:var(--text-muted);flex-wrap:wrap}
.lfoot a{color:inherit}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:24px}
.stat{padding:16px;border-radius:var(--radius-md)}.stat b{display:block;font:600 1.6rem/1.2 var(--font-sans)}.stat span{font-size:.75rem;color:var(--text-muted)}
.tbl{width:100%;border-collapse:collapse;font-size:.875rem}
.tbl th{text-align:left;font:500 .75rem/1.4 var(--font-sans);color:var(--text-muted);padding:10px 16px;border-bottom:1px solid var(--line)}
.tbl td{padding:12px 16px;border-bottom:1px solid var(--line);vertical-align:top}
.tbl tr:last-child td{border-bottom:0}
@media (max-width:63.99em){.ct{grid-template-columns:1fr}.stats{grid-template-columns:1fr 1fr}.shot .in{grid-template-columns:1fr}.mini-side{display:none}}
@media (max-width:39.99em){.lnav a{display:none}.ways,.jobs{grid-template-columns:1fr}.hero h1{font-size:2.03rem}.tbl .hide-s{display:none}}
'''
APP = lambda body, cur='all', strip='': f'{strip}<div class="app">{sidebar(cur)}<main class="main">{TOP}{body}</main></div>{TABBAR}'
onboarding = APP(f'''<div class="onb">{SC["empty-library"]}<h1>Your shelf is empty</h1><p class="lead" style="margin:8px auto 0">Three ways to fill it. Most people start by pasting one link.</p>
<div class="ways"><div class="way sm-l1"><span class="n">1</span><b>Paste a link</b><p>Copy any address and press Ctrl V anywhere in Shelfmark.</p><div class="sm-input">{ic("paste")}<input placeholder="Paste a link" aria-label="Paste a link"></div></div>
<div class="way sm-l1"><span class="n">2</span><b>Get the extension</b><p>Save the page you’re on in one click, or all open tabs at once.</p><button class="sm-btn sm-btn--secondary" type="button">{ic("browser")}Add to Chrome</button></div>
<div class="way sm-l1"><span class="n">3</span><b>Import bookmarks</b><p>Bring everything from your browser; AI can group it into a few folders.</p><button class="sm-btn sm-btn--secondary" type="button">{ic("upload")}Import</button></div></div>
<button class="sm-btn sm-btn--sm" type="button" data-replay style="margin-top:24px">Replay</button></div>''')
DEMO = f'<div class="strip" role="status">{ic("user")}<span>You’re in the demo. Look around and change anything; it resets every day.</span><button class="sm-btn sm-btn--primary sm-btn--sm" type="button">Start your own shelf</button></div>'
OFF = f'<div class="strip off" role="status">{ic("x")}<span><b>You’re offline.</b> What’s loaded stays readable; saving and changes come back when you are.</span><button class="sm-btn sm-btn--sm" type="button">Try again</button></div>'
FEED = '<h1>All links</h1><div class="mini-feed" style="columns:4 200px;column-gap:16px;margin-top:24px">' + ''.join(f'<article class="sm-card sm-l1"><div class="sm-cover" style="aspect-ratio:{r}">{ART[a]}</div><div class="sm-card-body"><h3 class="sm-card-title">{t}</h3><div class="sm-meta">{fav(d[0].upper())}{d}</div></div></article>' for a, r, t, d in CARDS) + '</div>'
strips = DEMO + f'<div class="app" style="min-height:auto">{sidebar("all")}<main class="main">{TOP}{FEED}</main></div>'
strips_off = OFF + f'<div class="app" style="min-height:auto">{sidebar("all")}<main class="main">{TOP.replace("sm-btn--primary add-btn", "sm-btn--primary add-btn\" disabled title=\"Saving is off while offline")}{FEED}</main></div>'
SHORT = [('Everywhere', [('Search or ask', ['Ctrl', 'K']), ('Add a link', ['N']), ('Paste to save', ['Ctrl', 'V']), ('Undo', ['Ctrl', 'Z']), ('All shortcuts', ['?'])]),
         ('Library', [('Move between links', ['↑', '↓']), ('Open preview', ['Enter']), ('Open in browser', ['Ctrl', 'Enter']), ('Select', ['X']), ('Favorite', ['F']), ('Move to folder', ['M']), ('Remind me', ['R']), ('Rename', ['F2']), ('Delete', ['⌫'])]),
         ('Link page', [('Next / previous link', ['J', 'K']), ('Site / Reader', ['V']), ('Details', ['I']), ('Back to the list', ['Esc'])])]
shortcuts = APP(f'''<h1>Keyboard shortcuts</h1><p class="lead">Press ? anywhere to see this list.</p><div style="max-width:720px">
<div class="sm-panel sm-l1" style="max-width:none;margin-top:24px">{srow('Single-key shortcuts', 'N, X, F, M and the like. Turn off if you use voice control or they get in the way.', SW(True, 'Single-key shortcuts'))}</div>
{''.join(f'<section class="sc-group"><p class="sec-t">{g}</p><div class="sm-panel sm-l1" style="max-width:none">' + ''.join(f'<div class="kbrow"><span>{t}</span>' + ''.join(f'<span class="sm-kbd">{k}</span>' for k in ks) + '</div>' for t, ks in rows) + '</div></section>' for g, rows in SHORT)}</div>''')
help_ = APP(f'''<h1>Help</h1><p class="lead">How Shelfmark works, what changed, and a way to tell us what’s wrong.</p>
<div class="ct"><div style="display:flex;flex-direction:column;gap:24px">
<section><p class="sec-t">How it works · 2 min</p><div class="video"><span class="sm-play" style="width:56px;height:56px">{ic("play", 24)}</span></div></section>
<section><p class="sec-t">Send feedback</p><div class="sm-panel sm-l1" style="max-width:none;padding:16px;display:flex;flex-direction:column;gap:12px">
<div class="sm-seg" role="radiogroup" aria-label="Kind"><button role="radio" aria-checked="true">Something’s broken</button><button role="radio" aria-checked="false">Idea</button><button role="radio" aria-checked="false">Other</button></div>
<div class="sm-field" style="min-width:0"><label for="fbt">What happened?</label><textarea id="fbt" class="sm-input" rows="4" style="height:auto;padding:10px 12px;resize:vertical;font:inherit">The preview stays blank for github.com links.</textarea><span class="sm-hint">The page you’re on and your browser are attached. No links or notes.</span></div>
<button class="sm-btn sm-btn--primary" type="button" style="align-self:flex-start">Send</button></div></section></div>
<div style="display:flex;flex-direction:column;gap:24px"><section><p class="sec-t">What’s new</p><div class="sm-panel sm-l1" style="max-width:none">{''.join(f'<div class="wn"><span class="d">{d}</span><span><b>{t}</b><p>{p}</p></span></div>' for d, t, p in [('20 Nov', 'Side by side', 'File links by dragging between two folders.'), ('12 Nov', 'Import with AI folders', 'Hundreds of bookmarks into a few folders.'), ('2 Nov', 'Revisit', 'Reminders, continue reading and forgotten links in one place.')])}</div><button class="sm-btn sm-btn--sm" type="button" style="margin-top:8px">All changes{ic("right")}</button></section>
<section><p class="sec-t">Your feedback</p><div class="sm-panel sm-l1 fb-list" style="max-width:none">{srow('Dark theme flashes on load', '4 Nov', '<span class="status done">Fixed</span>')}{srow('Export to CSV', '28 Oct', '<span class="status">Planned</span>')}</div></section></div></div>''')
ai_intro = f'''<div class="overlay sm-l1" style="min-height:620px;margin:24px"><div class="scrim2"></div><div class="sm-dialog sm-l3" role="dialog" aria-labelledby="ai1" style="width:520px">
<span style="color:var(--ai)">{ic("spark", 24)}</span><h2 id="ai1">Turn on AI helpers?</h2>
<div class="sm-panel" style="max-width:none;border:1px solid var(--line);border-radius:var(--radius-md)">{''.join(f'<div class="setrow" style="padding:10px 12px"><span class="tx"><b>{t}</b><span>{d}</span></span></div>' for t, d in [('What it does', 'Suggests a folder and tags when you save, writes a short summary when a page has none, finds links by meaning, answers questions with Ask.'), ('What is sent', 'The address, title and page text of links you save. Your notes only if you allow it. Never your other links’ notes or your account.'), ('Limits', '500 links and 50 questions a month. You can turn it off any time and delete AI data.')])}</div>
<div class="foot"><button class="sm-btn sm-btn--secondary" type="button">Not now</button><button class="sm-btn sm-btn--primary" type="button">Turn on AI</button></div></div></div>'''
ACC = [('#171717', 'Graphite'), ('#2A5BD7', 'Ink'), ('#3B7443', 'Sage'), ('#96304F', 'Rose'), ('#8F4423', 'Clay'), ('#1F6460', 'Teal'), ('#6A3D7A', 'Plum'), ('#7A5605', 'Amber')]
BGS = [('#F5F5F4', 'Stone'), ('#F7F5F0', 'Paper'), ('#F2F5F8', 'Mist'), ('#F6F2F4', 'Blush')]
custom = f'''<div class="overlay sm-l1" style="min-height:640px;margin:24px"><div class="scrim2"></div><section class="sm-slide sm-l3" role="dialog" aria-labelledby="ctt" style="width:440px;max-width:100%"><div class="head"><h2 id="ctt">Custom theme</h2><button class="sm-ib" aria-label="Close">{ic("x")}</button></div><div class="content">
<div class="sm-field" style="min-width:0"><label>Base</label><div class="sm-seg" role="radiogroup" aria-label="Base"><button role="radio" aria-checked="true">Light</button><button role="radio" aria-checked="false">Dark</button></div></div>
<div class="sm-field" style="min-width:0"><label>Accent</label><div class="sw8" role="radiogroup" aria-label="Accent">{''.join(f'<button role="radio" aria-checked="{str(i == 3).lower()}" aria-label="{n}" style="background:{v}"></button>' for i, (v, n) in enumerate(ACC))}</div><div class="sm-input" style="margin-top:8px;max-width:160px;font-family:var(--font-mono)"><input value="#96304F" aria-label="Accent hex"></div></div>
<div class="sm-field" style="min-width:0"><label>Background</label><div class="sw8" role="radiogroup" aria-label="Background">{''.join(f'<button role="radio" aria-checked="{str(i == 1).lower()}" aria-label="{n}" style="background:{v}"></button>' for i, (v, n) in enumerate(BGS))}</div></div>
<div class="prev" style="background:#F7F5F0;border:1px solid rgba(0,0,0,.08)"><span style="font:600 .75rem/1 var(--font-sans);color:#5D5D5A">Preview</span><div style="display:flex;gap:8px;align-items:center"><button class="sm-btn sm-btn--primary sm-btn--sm" type="button" style="background:#96304F;border-color:#96304F;color:#fff">{ic("plus")}Add link</button><span class="sm-tag" style="background:#fff">angular</span><span style="font-size:.875rem;color:#96304F;text-decoration:underline">Open</span></div></div>
<p class="disc" style="display:flex;gap:6px;align-items:center;color:var(--success)">{ic("check", 14)}Text on the accent passes contrast (6.9 : 1).</p>
<div style="display:flex;gap:8px"><button class="sm-btn sm-btn--primary" type="button">Use this theme</button><button class="sm-btn sm-btn--secondary" type="button">Reset</button></div></div></section></div>'''
rating = APP(f'''<h1>Revisit</h1><p class="lead">Nothing due today.</p><div class="sm-l1" style="border-radius:var(--radius-lg);padding:20px;margin-top:24px;max-width:640px;display:flex;flex-direction:column;gap:12px;position:relative">
<button class="sm-ib" type="button" aria-label="Dismiss" style="position:absolute;top:8px;right:8px">{ic("x")}</button><b style="font:600 1rem/1.5 var(--font-sans)">How is Shelfmark working for you?</b><p class="lead" style="margin:0">One tap. It helps decide what to fix next.</p>
<div class="rate" role="radiogroup" aria-label="Rating from 1 to 5">{''.join(f'<button role="radio" aria-checked="false" type="button">{n}</button>' for n in range(1, 6))}<span class="lbl-s" style="align-self:center;margin-left:8px">1 not useful · 5 can’t do without</span></div></div>
<p class="disc" style="margin-top:8px;max-width:640px">Shown once, after 2 weeks of use and on a calm screen (an empty Revisit). Dismissed for good with ×. After a tap: “Thanks. Want to tell us more?” with a link to feedback.</p>''', cur='revisit')
changelog = f'''<div class="land"><div class="lnav"><div class="logo"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="4" fill="var(--accent)"/><path d="M14 4h5v8l-2.5-2-2.5 2z" fill="var(--brand-notch)"/></svg>Shelfmark</div><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Open Shelfmark</button></div>
<div style="max-width:68ch;margin:32px auto 0"><h1 style="font-size:2.03rem;margin:0">What’s new</h1><p class="lead">Every change that you can see.</p>
{''.join(f'<section style="margin-top:32px;padding-top:24px;border-top:1px solid var(--line)"><span class="lbl-s">{d}</span><h2 style="font:600 1.27rem/1.25 var(--font-sans);margin:4px 0 8px">{t}</h2><p style="margin:0;line-height:1.6">{p}</p></section>' for d, t, p in [('20 November 2026', 'Side by side', 'Open two folders next to each other and drag links between them to file them. From wide screens.'), ('12 November 2026', 'Import with AI folders', 'Import hundreds of browser bookmarks; AI suggests a handful of folders and you review them before anything is saved. Undo removes exactly what was imported.'), ('2 November 2026', 'Revisit', 'Reminders, links you started reading and links you forgot about, on one page.')])}</div></div>'''
landing = f'''<div class="land"><div class="lnav"><div class="logo"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="4" fill="var(--accent)"/><path d="M14 4h5v8l-2.5-2-2.5 2z" fill="var(--brand-notch)"/></svg>Shelfmark</div><a href="#">What’s new</a><a href="#">Privacy</a><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Sign in</button></div>
<section class="hero"><h1>All your links, and a way back to them</h1><p>Save anything in one move, find it in seconds by words or meaning, and see it again before it’s forgotten.</p><div class="cta"><button class="sm-btn sm-btn--primary sm-btn--lg" type="button">Start for free</button><button class="sm-btn sm-btn--secondary sm-btn--lg" type="button">Look around in the demo</button></div></section>
<div class="shot"><div class="bar"><i></i><i></i><i></i></div><div class="in"><div class="mini-side sm-l1">{''.join(f'<span class="sm-nav"{" aria-current=%spage%s" % (chr(34), chr(34)) if i == 0 else ""}>{ic(c, 16)}{t}</span>' for i, (c, t) in enumerate([('bookmark', 'All links'), ('inbox', 'Unsorted'), ('star', 'Favorites'), ('revisit', 'Revisit')]))}<span class="sm-sec" style="width:auto">Folders</span>{''.join(f'<span class="sm-nav">{tile(c, 12)}{n}</span>' for n, c in [('Clothes', 'rose'), ('Recipes', 'amber'), ('Work', 'ocean')])}</div>
<div class="mini-feed">{''.join(f'<article class="sm-card sm-l1"><div class="sm-cover" style="aspect-ratio:{r}">{ART[a]}</div><div class="sm-card-body" style="padding:8px 10px 10px"><h3 class="sm-card-title" style="font-size:.8125rem">{t}</h3></div></article>' for a, r, t, d in CARDS)}</div></div></div>
<div class="jobs">{''.join(f'<div class="job"><span class="ji">{ic(i, 20)}</span><h3>{t}</h3><p>{p}</p></div>' for i, t, p in [('plus', 'Save', 'Paste, drop, share from your phone or click the extension. A rule or AI files it; you can always change it.'), ('search', 'Find', 'Search titles, notes, tags and the page itself. Or ask a question and get an answer with sources from your own links.'), ('revisit', 'Come back', 'Reminders, links you started reading and ones you forgot, in one calm queue.')])}</div>
<div class="lfoot"><span>© 2026 Shelfmark</span><a href="#">Privacy</a><a href="#">What’s new</a><a href="#">GitHub</a></div></div>'''
admin = APP(f'''<h1>Admin</h1><p class="lead">Visible only to the owner account.</p>
<div class="stats">{''.join(f'<div class="stat sm-l1"><b>{v}</b><span>{l}</span></div>' for v, l in [('214', 'people signed in this week'), ('3,912', 'links saved this week'), ('61%', 'saves filed by a rule or AI'), ('12', 'new feedback')])}</div>
<section style="margin-top:32px"><div style="display:flex;align-items:center;gap:12px"><p class="sec-t" style="margin:0">Feedback</p><div class="sm-seg" role="radiogroup" aria-label="Show" style="margin-left:auto"><button role="radio" aria-checked="true">New 12</button><button role="radio" aria-checked="false">Planned</button><button role="radio" aria-checked="false">Fixed</button></div></div>
<div class="sm-panel sm-l1" style="max-width:none;margin-top:12px;overflow:auto"><table class="tbl"><thead><tr><th>Message</th><th class="hide-s">Kind</th><th class="hide-s">Page</th><th>Date</th><th><span class="sm-sr" style="position:absolute;left:-9999px">Status</span></th></tr></thead><tbody>
{''.join(f'<tr><td>{m}</td><td class="hide-s">{k}</td><td class="hide-s" style="font-family:var(--font-mono);font-size:.75rem">{pg}</td><td style="white-space:nowrap">{d}</td><td><button class="sm-btn sm-btn--sm" type="button">Set status{ic("chev")}</button></td></tr>' for m, k, pg, d in [('The preview stays blank for github.com links.', 'Broken', '/links/812', 'Today'), ('Could tags have colours too?', 'Idea', '/tags', 'Yesterday'), ('Import froze at 90% with a 4 MB file', 'Broken', '/import', '21 Nov')])}</tbody></table></div></section>''', cur='')
page('first-run.html', 'First run, help, landing', F_CSS, [
 ('onboarding', 'Empty library as first run', onboarding), ('demo', 'Demo strip', strips), ('offline', 'Offline strip', strips_off), ('shortcuts', 'Keyboard shortcuts', shortcuts), ('help', 'Help, what’s new, feedback', help_),
 ('ai-intro', 'AI intro (first time AI is turned on)', ai_intro), ('custom', 'Custom theme', custom), ('rating', 'Rating card in Revisit', rating), ('changelog', 'Changelog (public)', changelog), ('landing', 'Landing', landing), ('admin', 'Admin: stats and feedback', admin)], shell='bare')
