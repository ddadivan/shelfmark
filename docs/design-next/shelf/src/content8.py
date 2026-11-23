exec(open('/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/dsgen4/build_pages.py').read())
# settings shell (snav, spage, srow, sw, seg, G_CSS) from content.py, without writing its page
_src = open(f'{B}/dsgen4/content.py').read()
_sec = _src.split('# ================= SETTINGS =================')[1].split('# ================= PUBLIC')[0]
_real_page = page; page = lambda *a, **k: None; exec(_sec); page = _real_page
# Group 15: connect your assistant, library clean-up, older links, feedback, welcome, video, move folder, tag page, recently opened
T_CSS = G_CSS + r'''
.fx-scrim{position:fixed;inset:0;background:var(--scrim);z-index:80}
.fx-dlg{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:81;width:min(480px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto}
.fx-dlg.wide{width:min(880px,calc(100vw - 32px))}
.fx-dlg .foot{display:flex;gap:8px;justify-content:flex-end;align-items:center}.fx-dlg .foot .sp{flex:1}
.fld{display:flex;flex-direction:column;gap:6px}.fld label{font:500 .75rem/1rem var(--font-sans);color:var(--text-muted)}
.inp{display:flex;align-items:center;height:40px;padding:0 12px;border-radius:var(--radius-sm);background:var(--surface-hover);font-size:1rem}
.inp.mono{font:400 .875rem/1 var(--font-mono);gap:8px}.inp.mono span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.inp.focus{box-shadow:0 0 0 2px var(--focus)}
.txa{min-height:120px;padding:10px 12px;border-radius:var(--radius-sm);background:var(--surface-hover);font-size:1rem;color:var(--text-muted)}
.opt2{display:flex;flex-direction:column;gap:4px}
.opt2 button{display:flex;gap:12px;align-items:flex-start;padding:12px;border:0;border-radius:var(--radius-md);background:var(--fill);text-align:left;color:var(--text);font:inherit;cursor:pointer}
.opt2 button[aria-checked="true"]{background:var(--accent-bg);box-shadow:inset 0 0 0 2px var(--accent)}
.opt2 b{display:block;font-weight:500;font-size:.875rem}.opt2 span{font-size:.75rem;color:var(--text-muted)}
.opt2 .rd{flex:none;width:18px;height:18px;margin-top:1px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--control)}
.opt2 button[aria-checked="true"] .rd{box-shadow:inset 0 0 0 5px var(--accent)}
.warnbox{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:var(--radius-md);background:color-mix(in srgb,var(--warning) 12%,transparent);font-size:.875rem}
.warnbox svg{color:var(--warning);flex:none;margin-top:2px}
.tok{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:16px;align-items:center;padding:12px 16px}
.tok+.tok{border-top:1px solid var(--line)}.tok b{display:block;font-weight:500;font-size:.875rem}.tok span{font-size:.75rem;color:var(--text-muted)}
.ctabs{display:flex;gap:2px;padding:4px;border-radius:12px;background:var(--surface-hover);width:max-content;max-width:100%;overflow:auto}
.ctabs button{height:32px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:var(--text-muted);font:500 .875rem/1 var(--font-sans);white-space:nowrap}
.ctabs button[aria-selected="true"]{background:var(--surface);color:var(--text)}
.steps3{margin:12px 0 0;padding:0 0 0 20px;display:flex;flex-direction:column;gap:10px;font-size:.875rem}
.code{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:var(--radius-sm);background:var(--surface-hover);font:400 .8125rem/1.4 var(--font-mono);overflow:auto}
.code span{flex:1;white-space:pre}
.probadge{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;background:var(--ai-bg);color:var(--ai);font:600 .75rem/1 var(--font-sans);margin-left:8px;vertical-align:2px}
.cl-h{display:flex;align-items:baseline;gap:12px;margin:32px 0 12px}.cl-h h2{margin:0;font:600 1rem/1.5rem var(--font-display)}.cl-h span{color:var(--text-muted);font-size:.875rem}.cl-h .sm-btn{margin-left:auto}
.dup{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px;border-radius:var(--radius-md);background:var(--fill)}
.dup+.dup{margin-top:8px}
.dl{display:flex;gap:10px;align-items:center;min-width:0;padding:8px;border-radius:var(--radius-sm)}
.dl.keep{background:var(--accent-bg)}
.dl .sm-thumb{width:56px;height:40px}.dl b{display:block;font-weight:500;font-size:.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dl span{font-size:.75rem;color:var(--text-muted)}
.stag{display:flex;align-items:center;gap:8px;padding:12px;border-radius:var(--radius-md);background:var(--fill);flex-wrap:wrap}
.stag+.stag{margin-top:8px}.stag .ar{color:var(--text-muted)}.stag .sp{flex:1}
.prog{height:6px;border-radius:999px;background:var(--surface-hover);overflow:hidden}.prog i{display:block;height:100%;background:var(--ai);border-radius:999px}
.bf-num{display:flex;gap:24px;margin:8px 0}.bf-num div{display:flex;flex-direction:column}.bf-num b{font:600 1.375rem/1.75rem var(--font-display)}.bf-num span{font-size:.75rem;color:var(--text-muted)}
.fbk{display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:var(--radius-md);background:var(--fill)}
.fbk+.fbk{margin-top:8px}.fbk .h{display:flex;gap:8px;align-items:center;font-size:.75rem;color:var(--text-muted)}
.fbk p{margin:0}.fbk .rep{display:flex;gap:10px;padding:10px 12px;border-radius:var(--radius-sm);background:var(--surface);font-size:.875rem}
.fbk .rep .av{flex:none;width:24px;height:24px;border-radius:50%;background:var(--accent);color:var(--on-accent);display:grid;place-items:center;font:600 .75rem/1 var(--font-sans)}
.st{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;font:600 .75rem/1 var(--font-sans);background:var(--surface-hover);color:var(--text-muted)}
.st.plan{background:var(--ai-bg);color:var(--ai)}.st.done{background:color-mix(in srgb,var(--success) 14%,transparent);color:var(--success)}
.shot{display:flex;align-items:center;gap:10px;padding:8px;border-radius:var(--radius-sm);background:var(--fill);font-size:.875rem}
.shot i{width:64px;height:40px;border-radius:6px;background:linear-gradient(135deg,var(--surface-hover),var(--surface-pressed));flex:none}
.wl{text-align:center}.wl .sm-scene{width:280px;height:175px;margin:0 auto}
.wl h2{font:600 1.375rem/1.75rem var(--font-display)!important}
.dots{display:flex;gap:6px;justify-content:center}.dots i{width:6px;height:6px;border-radius:50%;background:var(--surface-pressed)}.dots i.on{width:18px;border-radius:3px;background:var(--text)}
.video{position:relative;aspect-ratio:16/9;border-radius:var(--radius-md);overflow:hidden;background:#15161a}
.video .play{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(255,255,255,.94);display:grid;place-items:center;color:#18181b}
.video .bar{position:absolute;left:16px;right:16px;bottom:14px;height:4px;border-radius:2px;background:rgba(255,255,255,.25)}.video .bar i{display:block;width:22%;height:100%;border-radius:2px;background:#fff}
.chap{display:flex;gap:8px;flex-wrap:wrap}.chap button{display:flex;gap:8px;align-items:center;height:32px;padding:0 10px;border:0;border-radius:8px;background:var(--fill);color:var(--text);font:500 .75rem/1 var(--font-sans)}.chap button span{color:var(--text-muted);font-weight:400}
.chap button[aria-current="true"]{background:var(--accent-bg)}
.mvp{position:fixed;left:236px;top:330px;z-index:82;width:300px;padding:8px;border-radius:var(--radius-md)}
.mvp .q{display:flex;align-items:center;gap:8px;height:36px;padding:0 10px;margin-bottom:6px;border-radius:var(--radius-sm);background:var(--surface-hover);color:var(--text-muted);font-size:.875rem}
.mvp .r{display:flex;align-items:center;gap:10px;width:100%;height:36px;padding:0 10px;border:0;border-radius:var(--radius-sm);background:transparent;color:var(--text);font:400 .875rem/1 var(--font-sans);text-align:left}
.mvp .r:hover,.mvp .r[aria-selected="true"]{background:var(--surface-hover)}
.mvp .r[disabled]{color:var(--text-muted);opacity:.55}.mvp .r .n{margin-left:auto;font-size:.75rem;color:var(--text-muted)}
.mvp .sub{padding-left:30px}
.mvp .mh{padding:6px 10px 4px;font-size:.75rem;color:var(--text-muted)}
.hl-row{outline:2px solid var(--focus);outline-offset:-2px;border-radius:10px}
.tg-h{display:flex;align-items:center;gap:12px;margin-top:32px}.tg-h h1{margin:0}.tg-h .cnt{color:var(--text-muted)}.tg-h .sp{flex:1}
.tg-i{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--surface-hover);color:var(--text-muted)}
.grid5{display:grid;grid-template-columns:repeat(auto-fill,minmax(208px,1fr));gap:20px;margin-top:24px}.grid5 .sm-card{width:auto}
.anchor{position:relative}.anchor .sm-menu{position:absolute;right:0;top:44px;z-index:5}
.rec-h{display:flex;align-items:center;gap:12px;margin-top:32px}.rec-h h1{margin:0}.rec-h .sp{flex:1}
.rec-g{margin-top:24px}.rec-g h2{margin:0 0 8px;font:500 .75rem/1rem var(--font-sans);color:var(--text-muted)}
.rrow2{display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:var(--radius-md)}.rrow2:hover{background:var(--fill-hover)}
.rrow2 .sm-thumb{width:56px;height:40px}.rrow2 .tx{flex:1;min-width:0}.rrow2 b{display:block;font-weight:500;font-size:.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rrow2 span{font-size:.75rem;color:var(--text-muted)}
.rrow2 time{font-size:.75rem;color:var(--text-muted)}
.paused{display:flex;align-items:center;gap:12px;margin-top:16px;padding:12px 16px;border-radius:var(--radius-md);background:var(--fill);font-size:.875rem}.paused span{flex:1}
'''
def card(a, r, t, d): return f'<article class="sm-card sm-l1"><div class="sm-cover" style="aspect-ratio:{r}">{ART[a]}</div><div class="sm-card-body"><h3 class="sm-card-title">{t}</h3><div class="sm-meta">{fav(d[0].upper())}{d}</div></div></article>'
FEED = '<div class="tg-h"><h1>All links</h1><span class="cnt">58 links</span></div><div class="grid5">' + ''.join(card(*c) for c in [('video', '16/9', 'Angular 22: Signal Forms in 20 minutes', 'youtube.com'), ('shirt', '4/5', 'Wool overshirt', 'uniqlo.com'), ('bowl', '1/1', 'Rich tonkotsu ramen broth', 'seriouseats.com'), ('jacket', '4/5', 'Nano Puff jacket', 'patagonia.com'), ('pancakes', '1/1', 'Lemon ricotta pancakes', 'smittenkitchen.com')]) + '</div>'
APP = lambda body, cur='all': f'<div class="app">{sidebar(cur)}<main class="main">{TOP}{body}</main></div>{TABBAR}'
DLG = lambda inner, cls='', role='dialog', lab='': f'<div class="fx-scrim"></div><div class="fx-dlg sm-dialog sm-l3 {cls}" role="{role}" aria-modal="true" aria-labelledby="{lab}">{inner}</div>'
# 1. Connect your assistant
TOKS = [('Claude Desktop', 'Read and save', 'Created 3 Nov · used 2 hours ago'), ('Cursor', 'Read only', 'Created 18 Oct · used 5 days ago')]
mcp_body = f'''<p class="lead">Let an AI assistant that speaks MCP search and read your shelf, and save links you ask it to. Each assistant gets its own token; you can revoke it any time.<span class="probadge">Pro</span></p>
<section class="group"><p class="sec-t">Tokens</p><div class="sm-panel sm-l1" style="max-width:none">{''.join(f'<div class="tok"><span><b>{n}</b><span>{d}</span></span><span class="st">{a}</span><button class="sm-btn sm-btn--sm" type="button" style="color:var(--danger)">Revoke</button></div>' for n, a, d in TOKS)}</div>
<div style="margin-top:12px"><button class="sm-btn sm-btn--primary" type="button">{ic("plus")}Create token</button></div></section>
<section class="group"><p class="sec-t">How to connect</p><div class="sm-panel sm-l1" style="max-width:none;padding:16px">
<div class="ctabs" role="tablist" aria-label="Assistant"><button role="tab" aria-selected="true">Claude Desktop</button><button role="tab" aria-selected="false">Claude Code</button><button role="tab" aria-selected="false">ChatGPT</button><button role="tab" aria-selected="false">Cursor</button><button role="tab" aria-selected="false">Other</button></div>
<ol class="steps3"><li>Open Claude Desktop › Settings › Connectors, choose <b>Add custom connector</b>.</li><li>Paste the server address:<div class="code" style="margin-top:6px"><span>https://shelfmark.app/api/mcp</span><button class="sm-ib" type="button" aria-label="Copy address">{ic("copy")}</button></div></li><li>When asked for a token, paste the one you created above.</li><li>Try it: “What did I save about Signal Forms?”</li></ol></div></section>
<section class="group"><p class="sec-t">What an assistant can do</p><div class="sm-panel sm-l1" style="max-width:none">{srow('Search and read your links', 'Titles, notes, tags, folders and summaries. Never your account details.', '')}{srow('Save links', 'Only with a “Read and save” token. Saved links get the source “Claude Desktop”.', '')}</div></section>'''
mcp = spage('ai', 'Connect your assistant', mcp_body)
mcp_new = mcp + DLG(f'''<h2 id="mn-t">New token</h2><div class="fld"><label>Name</label><div class="inp focus">Claude Desktop</div></div>
<div class="fld"><label>Access</label><div class="opt2" role="radiogroup" aria-label="Access"><button role="radio" aria-checked="false"><span class="rd"></span><span><b>Read only</b><span>Search and read your links.</span></span></button><button role="radio" aria-checked="true"><span class="rd"></span><span><b>Read and save</b><span>Also save new links you ask for. It can’t delete anything.</span></span></button></div></div>
<div class="fld"><label>Expires</label>{seg(['30 days', '90 days', 'Never'], '90 days', 'Expires')}</div>
<div class="foot"><button class="sm-btn" type="button">Cancel</button><button class="sm-btn sm-btn--primary" type="button">Create token</button></div>''', lab='mn-t')
mcp_shown = mcp + DLG(f'''<h2 id="ms-t">Copy your token now</h2><p>This is the only time it’s shown. Paste it into Claude Desktop; if you lose it, revoke it and create a new one.</p>
<div class="inp mono"><span>smk_live_7Hq2…xR4fN9pL3vW8kT1</span><button class="sm-btn sm-btn--sm sm-btn--secondary" type="button">{ic("copy")}Copy</button></div>
<div class="warnbox">{ic("bell")}<span>Anyone with this token can read your links. Keep it like a password.</span></div>
<div class="foot"><button class="sm-btn sm-btn--primary" type="button">Done</button></div>''', lab='ms-t')
# 2. Library clean-up
def dl(a, t, d, keep): return f'<div class="dl{" keep" if keep else ""}"><span class="sm-thumb">{ART[a]}</span><span style="min-width:0"><b>{t}</b><span>{d}</span></span></div>'
cleanup = APP(f'''<div class="tg-h"><h1>Clean up</h1><span class="cnt">7 things to tidy</span></div><p class="lead" style="margin-top:8px">Duplicates and near-duplicate tags found on your shelf. Nothing changes until you choose; every change can be undone.</p>
<div class="cl-h"><h2>Duplicates</h2><span>3 pairs</span><button class="sm-btn sm-btn--sm sm-btn--secondary" type="button">Keep newest of all</button></div>
<div class="dup">{dl('video', 'Angular 22: Signal Forms in 20 minutes', 'youtube.com · saved 2 Nov · in Angular', True)}{dl('video', 'Signal Forms in 20 min', 'youtu.be · saved 14 Sep · Unsorted', False)}<span style="display:flex;gap:4px"><button class="sm-btn sm-btn--sm sm-btn--primary" type="button">Merge</button><button class="sm-btn sm-btn--sm" type="button">Not duplicates</button></span></div>
<div class="dup">{dl('shirt', 'Wool overshirt', 'uniqlo.com · with a note', True)}{dl('shirt', 'Wool overshirt – UNIQLO', 'uniqlo.com/uk · no note', False)}<span style="display:flex;gap:4px"><button class="sm-btn sm-btn--sm sm-btn--primary" type="button">Merge</button><button class="sm-btn sm-btn--sm" type="button">Not duplicates</button></span></div>
<p class="sm-muted" style="font-size:.75rem;margin:8px 0 0">Merge keeps the highlighted link and moves the other’s note, tags and reminder onto it; the other goes to Trash.</p>
<div class="cl-h"><h2>Similar tags</h2><span>4 groups</span><button class="sm-btn sm-btn--sm sm-btn--secondary" type="button">Merge all</button></div>
{''.join(f'<div class="stag">{"".join(f"<span class=sm-chip>#{t} <b>{n}</b></span>" for t, n in g)}<span class="ar">{ic("right")}</span><span class="sm-chip" aria-pressed="true">#{to}</span><span class="sp"></span><button class="sm-btn sm-btn--sm" type="button">Merge</button><button class="sm-btn sm-btn--sm" type="button">Skip</button></div>' for g, to in [([('recipe', 4), ('recipes', 11)], 'recipes'), ([('js', 3), ('javascript', 9)], 'javascript'), ([('UI', 2), ('ui-design', 5)], 'ui-design')])}
''', 'unsorted')
# 3. Process older links
backfill = APP(FEED) + DLG(f'''<h2 id="bf-t">Sorting older links</h2><p>Shelfmark is adding folders, tags and summaries to links saved before AI was on. You can close this; it keeps going in the background.</p>
<div class="bf-num"><div><b>140</b><span>of 212 done</span></div><div><b>96</b><span>filed into folders</span></div><div><b>318</b><span>tags suggested</span></div></div>
<div class="prog" role="progressbar" aria-valuenow="66" aria-valuemin="0" aria-valuemax="100" aria-label="Progress"><i style="width:66%"></i></div>
<p class="sm-muted" style="font-size:.75rem;margin:0">Uses 212 of your 500 AI links this month. Suggestions wait in Tidy up; nothing is moved without you in Suggest mode.</p>
<div class="foot"><button class="sm-btn" type="button">Pause</button><button class="sm-btn sm-btn--primary" type="button">Close</button></div>''', lab='bf-t')
backfill_done = APP(FEED) + DLG(f'''<div style="display:flex;justify-content:center">{SC["revisit-done"]}</div><h2 id="bd-t">Older links are sorted</h2><p>212 links now have suggestions: 148 folders and 412 tags. Review them in Tidy up, or accept them all at once.</p>
<div class="foot"><button class="sm-btn" type="button">Later</button><button class="sm-btn sm-btn--primary" type="button">Open Tidy up</button></div>''', lab='bd-t')
# 4. Feedback
feedback = APP(FEED) + DLG(f'''<h2 id="fb-t">Send feedback</h2><div class="fld"><label>What is it about?</label>{seg(['Idea', 'Problem', 'Something nice'], 'Problem', 'Kind')}</div>
<div class="fld"><label>Tell us more</label><div class="txa">Drag to a folder sometimes opens the link instead of moving it…</div></div>
<div class="shot"><i></i><span style="flex:1">Screenshot of this page</span><button class="sm-btn sm-btn--sm" type="button">Remove</button></div>
<p class="sm-muted" style="font-size:.75rem;margin:0">Sent with your browser and app version. Replies appear in Settings › Your feedback.</p>
<div class="foot"><button class="sm-btn" type="button">Cancel</button><button class="sm-btn sm-btn--primary" type="button">Send</button></div>''', lab='fb-t')
myfb = spage('data', 'Your feedback', f'''<p class="lead">What you’ve sent and what came of it.</p>
<div class="fbk"><div class="h"><span class="st plan">Planned</span><span>Problem · 12 Nov</span></div><p>Drag to a folder sometimes opens the link instead of moving it.</p><div class="rep"><span class="av">D</span><span>Thanks! Found it: a short drag counted as a click. Fixed in the next update.</span></div></div>
<div class="fbk"><div class="h"><span class="st done">Done</span><span>Idea · 28 Oct</span></div><p>Could the card size be changed in the library?</p><div class="rep"><span class="av">D</span><span>It’s in: View › Card size. Thanks for the idea.</span></div></div>
<div class="fbk"><div class="h"><span class="st">Received</span><span>Something nice · 3 Oct</span></div><p>Reminders brought back a recipe I’d forgotten. Lovely.</p></div>
<div style="margin-top:16px"><button class="sm-btn sm-btn--secondary" type="button">Send feedback</button></div>''')
# 5. Welcome tour and video
welcome = APP(FEED) + DLG(f'''<div class="wl">{SC["empty-library"]}<h2 id="wl-t">Everything you save, in one calm place</h2><p>Paste a link, and Shelfmark grabs the picture and title. Videos, articles, things to buy: they all live here.</p></div>
<div class="dots" aria-label="Step 1 of 3"><i class="on"></i><i></i><i></i></div><div class="foot"><button class="sm-btn" type="button">Skip</button><span class="sp"></span><button class="sm-btn sm-btn--primary" type="button">Next</button></div>''', lab='wl-t')
welcome3 = APP(FEED) + DLG(f'''<div class="wl">{SC["revisit-done"]}<h2 id="w3-t">It brings things back</h2><p>Ask for a reminder on any link, and Today shows what you meant to come back to: a sale, a half-read article, a recipe for the weekend.</p></div>
<div class="dots" aria-label="Step 3 of 3"><i></i><i></i><i class="on"></i></div><div class="foot"><button class="sm-btn" type="button">Back</button><span class="sp"></span><button class="sm-btn sm-btn--primary" type="button">Start saving</button></div>''', lab='w3-t')
video = APP(FEED) + DLG(f'''<div style="display:flex;align-items:center"><h2 id="vd-t" style="flex:1">How Shelfmark works</h2><button class="sm-ib" type="button" aria-label="Close">{ic("x")}</button></div>
<div class="video"><span class="play">{ic("play", 28)}</span><span class="bar"><i></i></span></div>
<div class="chap" aria-label="Chapters">{''.join(f'<button type="button"{" aria-current=true" if i == 1 else ""}>{t} <span>{m}</span></button>' for i, (t, m) in enumerate([('Save a link', '0:00'), ('Folders and tags', '0:42'), ('Find it again', '1:30'), ('Today and reminders', '2:10'), ('Ask your shelf', '2:55')]))}</div>
<p class="sm-muted" style="font-size:.75rem;margin:0">3 minutes · captions in 7 languages</p>''', cls='wide', lab='vd-t')
# 6. Move folder
movef = APP(FEED) + f'''<div class="mvp sm-l2" role="dialog" aria-label="Move Ramen"><div class="mh">Move “Ramen” to</div><div class="q">{ic("search")}Find a folder</div>
<button class="r" type="button">{ic("bookmark")}Top level</button>
<button class="r" type="button" aria-selected="false"><span class="sm-ficon" style="color:var(--folder-rose)">{ic("folder")}</span>Clothes<span class="n">7</span></button>
<button class="r" type="button" disabled><span class="sm-ficon" style="color:var(--folder-amber)">{ic("folder")}</span>Recipes<span class="n">current</span></button>
<button class="r sub" type="button" disabled><span class="sm-ficon" style="color:var(--folder-amber)">{ic("folder")}</span>Ramen<span class="n">this folder</span></button>
<button class="r" type="button" aria-selected="true"><span class="sm-ficon" style="color:var(--folder-ocean)">{ic("folder")}</span>Work<span class="n">7</span></button>
<button class="r" type="button"><span class="sm-ficon" style="color:var(--folder-plum)">{ic("folder")}</span>Design<span class="n">5</span></button></div>'''
# 7. Tag page
tagpage = APP(f'''<div class="tg-h"><span class="tg-i">{ic("hash", 20)}</span><h1>angular</h1><span class="cnt">12 links</span><span class="sp"></span><span class="anchor"><button class="sm-btn sm-btn--sm" type="button" aria-expanded="true">{ic("more")}</button>
<div class="sm-menu sm-l2" role="menu"><button class="sm-mi" type="button">{ic("edit")}Rename</button><button class="sm-mi" type="button">{ic("merge")}Merge into…</button><button class="sm-mi" type="button">{ic("plus")}Save as view</button><div class="sm-msep"></div><button class="sm-mi sm-mi--danger" type="button">{ic("trash")}Delete tag</button></div></span></div>
<div class="grid5">{"".join(card(*c) for c in [('video', '16/9', 'Angular 22: Signal Forms in 20 minutes', 'youtube.com'), ('dark', '16/9', 'Zoneless change detection', 'angular.dev'), ('type', '16/9', 'Validation without Reactive Forms', 'dev.to'), ('dark', '16/9', 'Nx 23: monorepo setup', 'nx.dev')])}</div>''')
tagmerge = APP(f'<div class="tg-h"><span class="tg-i">{ic("hash", 20)}</span><h1>js</h1><span class="cnt">3 links</span></div>' + '<div class="grid5">' + card('type', '16/9', 'Event loop, visually', 'javascript.info') + '</div>') + DLG(f'''<h2 id="tm-t">Merge #js into another tag</h2><p>The 3 links tagged #js get the tag you choose; #js is removed.</p>
<div class="fld"><label>Into</label><div class="inp focus">#javascript <span class="sm-muted" style="margin-left:auto;font-size:.75rem">9 links</span></div></div>
<div class="foot"><button class="sm-btn" type="button">Cancel</button><button class="sm-btn sm-btn--primary" type="button">Merge</button></div>''', lab='tm-t')
# 8. Recently opened
REC = [('Today', [('video', 'Angular 22: Signal Forms in 20 minutes', 'youtube.com', '14:20'), ('bowl', 'Rich tonkotsu ramen broth', 'seriouseats.com', '12:05')]), ('Yesterday', [('type', 'Progressive disclosure', 'nngroup.com', '21:40'), ('jacket', 'Nano Puff jacket', 'patagonia.com', '18:12'), ('pancakes', 'Lemon ricotta pancakes', 'smittenkitchen.com', '9:30')])]
recbody = lambda paused: f'''<div class="rec-h"><h1>Recently opened</h1><span class="sp"></span><button class="sm-btn sm-btn--sm" type="button">{"Resume history" if paused else "Pause history"}</button><button class="sm-btn sm-btn--sm" type="button">Clear…</button></div>
{('<div class="paused">' + ic("bell") + '<span><b>History is paused.</b> Links you open now aren’t remembered here or in Today.</span><button class="sm-btn sm-btn--sm sm-btn--secondary" type="button">Resume</button></div>') if paused else ''}
{''.join(f'<section class="rec-g"><h2>{g}</h2>' + ''.join(f'<div class="rrow2"><span class="sm-thumb">{ART[a]}</span><span class="tx"><b>{t}</b><span>{d}</span></span><time>{tm}</time><button class="sm-ib" type="button" aria-label="Remove from history">{ic("x")}</button></div>' for a, t, d, tm in rows) + '</section>' for g, rows in REC)}
<p class="sm-muted" style="font-size:.75rem;margin-top:16px">Kept for 30 days. Only you see it; it powers “Continue reading” in Today.</p>'''
recent = APP(recbody(False), 'revisit'); recent_p = APP(recbody(True), 'revisit')
mcp_free = spage('ai', 'Connect your assistant', '<p class="lead">Let an AI assistant that speaks MCP search and read your shelf.</p><div class="sm-panel sm-l1" style="max-width:none;padding:24px;display:flex;flex-direction:column;gap:12px;align-items:flex-start"><span class="probadge" style="margin:0">Pro</span><b style="font:600 1.125rem/1.5rem var(--font-display)">Connecting an assistant is part of Pro</b><p class="sm-muted" style="margin:0">Pro isn’t on sale yet. Everything else in Shelfmark, AI included, works on your plan; Ask has 5 questions a month on Free.</p></div>')
page('tools.html', 'Assistant, clean-up, help', T_CSS, [
 ('mcp', 'Connect your assistant (Settings › AI)', mcp), ('mcp-new', 'New token', mcp_new), ('mcp-shown', 'Token shown once', mcp_shown), ('mcp-free', 'Connect your assistant on Free', mcp_free),
 ('cleanup', 'Clean up: duplicates and similar tags', cleanup), ('backfill', 'Sorting older links', backfill), ('backfill-done', 'Older links sorted', backfill_done),
 ('feedback', 'Send feedback', feedback), ('myfb', 'Your feedback, with replies', myfb), ('welcome', 'Welcome: step 1', welcome), ('welcome3', 'Welcome: step 3', welcome3),
 ('video', 'How it works video', video), ('movef', 'Move a folder', movef), ('tag', 'Tag page and tag menu', tagpage), ('tagmerge', 'Merge a tag', tagmerge),
 ('recent', 'Recently opened', recent), ('recent-p', 'Recently opened: history paused', recent_p)], shell='none')
