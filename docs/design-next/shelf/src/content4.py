exec(open('/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/dsgen4/build_pages.py').read())

A_CSS = r'''
.app2{display:flex;min-height:100vh;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:16px;gap:24px}
.app .main{display:flex;flex-direction:column}
.sm-search-ask[aria-current]{background:var(--surface)}
.askbtn{display:inline-flex;align-items:center;gap:6px}
.askbtn svg{color:var(--ai)}
.sm-nav .ai{color:var(--ai)}
.askwrap{display:grid;grid-template-columns:240px minmax(0,1fr);gap:24px;flex:1;margin-top:16px;min-height:0}
.hist{display:flex;flex-direction:column;gap:2px;padding:12px 8px;border-radius:var(--radius-lg);align-self:start}
.hist .sm-btn{margin:0 4px 8px}
.hist .h,.lc{text-decoration:none}.hist .h{display:block;padding:8px 10px;border-radius:var(--radius-sm);font-size:.875rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hist .h[aria-current]{background:var(--surface-hover);font-weight:500}
.hist .sec2{font:500 .75rem/1.4 var(--font-sans);color:var(--text-muted);padding:12px 10px 4px}
.conv{display:flex;flex-direction:column;min-width:0;max-width:820px;width:100%;margin:0 auto}
.start{text-align:center;padding:48px 0 0}
.start .sp{display:inline-grid;place-items:center;width:48px;height:48px;border-radius:var(--radius-md);background:var(--ai-bg);color:var(--ai)}
.start h1{margin:16px 0 0;font:600 2rem/2.5rem var(--font-display);letter-spacing:-.02em}
.start .lead{margin:8px auto 0}
.composer.sm-l2{background:var(--surface-hover);box-shadow:none}.composer:focus-within{box-shadow:0 0 0 2px var(--focus)}
.composer{display:flex;align-items:flex-end;gap:8px;padding:8px 8px 8px 16px;border-radius:var(--radius-lg);margin-top:24px}
.composer textarea{flex:1;border:0;outline:0;resize:none;background:transparent;color:var(--text);font:400 1rem/1.5 var(--font-sans);min-height:48px;padding:12px 0}
.composer .sm-btn{height:40px}
.caps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:32px;text-align:left}
.cap{padding:16px;border-radius:var(--radius-md);display:flex;flex-direction:column;gap:8px}
.cap h3{margin:0;display:flex;gap:8px;align-items:center;font:600 1rem/1.4 var(--font-sans)}
.cap h3 svg{color:var(--text-muted)}
.cap .q{display:block;width:100%;text-align:left;padding:8px 10px;border:0;border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font:400 .875rem/1.4 var(--font-sans)}
.cap .q:hover{background:var(--surface-hover)}
.fine{font-size:.75rem;color:var(--text-muted);text-align:center;margin-top:12px}
.msgs{display:flex;flex-direction:column;gap:24px;padding:16px 0 24px}
.me{align-self:flex-end;max-width:75%;padding:10px 14px;border-radius:var(--radius-md);background:var(--surface-hover);font-size:1rem}
.ai{display:flex;gap:12px}
.ai .av{flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:var(--radius-sm);background:var(--ai-bg);color:var(--ai)}
.ai .body{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px;font-size:1rem;line-height:1.6}
.ai .body p{margin:0}
.steps2{display:flex;flex-direction:column;gap:4px;font-size:.75rem;color:var(--text-muted)}
.steps2 span{display:flex;gap:6px;align-items:center}
.steps2 .done svg{color:var(--success)}
.lcards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.lc{color:var(--text);display:flex;gap:10px;align-items:center;padding:8px;border:0;border-radius:var(--radius-sm);background:var(--surface-hover);min-width:0}
.lc .sm-thumb{width:48px;height:36px;flex:none}
.lc b{display:block;font:500 .75rem/1.35 var(--font-sans);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lc span{font-size:.75rem;color:var(--text-muted)}
.big{font:600 2rem/1 var(--font-sans);font-variant-numeric:tabular-nums}
.bars{display:flex;flex-direction:column;gap:6px;max-width:420px}
.bars div{display:grid;grid-template-columns:90px 1fr 32px;gap:8px;align-items:center;font-size:.75rem}
.bars i{display:block;height:8px;border-radius:4px;background:var(--accent);opacity:.75}
.bars em{font-style:normal;text-align:right;color:var(--text-muted);font-variant-numeric:tabular-nums}
.acts2{display:flex;gap:4px;flex-wrap:wrap}
.cite{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 4px;border:0;background:var(--surface-pressed);border-radius:4px;font:500 .75rem/1 var(--font-sans);vertical-align:2px;color:var(--text-muted)}
.sticky{position:sticky;bottom:0;margin-top:auto;padding:12px 0 16px;background:linear-gradient(to bottom,transparent,var(--surface) 24%)}
.status2{display:inline-flex;gap:6px;align-items:center;font-size:.75rem;color:var(--text-muted)}
.shimmer{background:linear-gradient(90deg,var(--text-muted) 0%,var(--text) 50%,var(--text-muted) 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:sh 1.4s ease-in-out infinite}
@keyframes sh{from{background-position:100% 0}to{background-position:-100% 0}}
@media (prefers-reduced-motion:reduce){.shimmer{animation:none;color:var(--text-muted)}}
.limit{display:flex;gap:12px;align-items:center;padding:12px 16px;border-radius:var(--radius-md);font-size:.875rem}
.limit .sm-btn{margin-left:auto}
.srch-hint{display:flex;gap:12px;align-items:center;padding:10px 12px;border-top:1px solid var(--line);font-size:.875rem;color:var(--text-muted)}
.srch-hint .sm-btn{margin-left:auto}
.phones{display:flex;gap:32px;flex-wrap:wrap;margin-top:24px;align-items:flex-start}
.phone{position:relative;width:360px;height:740px;border-radius:28px;overflow:hidden;border:1px solid var(--line-strong);background:var(--canvas);flex:none;display:flex;flex-direction:column}
.phone .pc{padding:16px;flex:1;overflow:hidden;display:flex;flex-direction:column}
.phone .ptab{padding:0 12px 12px}.phone .ptab .sm-tabbar{width:100%}
.phone .pcap{font-size:.75rem;color:var(--text-muted);margin-top:8px;max-width:360px}
.ph-top{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.ph-top b{font:600 1.375rem/1.2 var(--font-sans);flex:1}
.ph-top .av2{width:32px;height:32px;border-radius:50%;background:var(--surface-hover);display:grid;place-items:center;font:600 .75rem/1 var(--font-sans)}
@media (max-width:39.99em){.sticky{bottom:calc(92px + env(safe-area-inset-bottom,0px));background:var(--surface);padding-bottom:8px}.sticky::after{content:"";position:absolute;left:-16px;right:-16px;top:100%;height:calc(100px + env(safe-area-inset-bottom,0px));background:var(--surface)}.sticky .fine{display:none}}
@media (max-width:63.99em){.askwrap{grid-template-columns:1fr}.hist{display:none}.caps{grid-template-columns:1fr}.lcards{grid-template-columns:1fr}}
'''
def side_ask(cur='ask'): return sidebar('ask')
TOP2 = TOP
HIST = f'''<aside class="hist sm-l1" aria-label="Conversations"><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">{ic("plus")}New conversation</button>
<div class="sec2">Today</div><a class="h" href="#" aria-current="page">Recipes for this weekend</a><a class="h" href="#">How many links do I have?</a>
<div class="sec2">Earlier</div><a class="h" href="#">Which Signal Forms video first?</a><a class="h" href="#">Coats I saved in autumn</a><a class="h" href="#">Summarise my Design folder</a>
<p class="lbl-s" style="padding:12px 10px 0">Kept in this browser only.</p></aside>'''
APP2 = lambda body: f'<div class="app">{side_ask()}<main class="main">{TOP2}{body}</main></div>{TABBAR}'
COMPOSER = lambda ph='Ask anything about your links', val='': f'<div class="composer sm-l2"><textarea rows="1" aria-label="Ask your shelf" placeholder="{ph}">{val}</textarea><button class="sm-btn sm-btn--primary" type="button" aria-label="Send">{ic("up")}</button></div>'
CAPS = [('search', 'Find', ['That ramen recipe with the soft egg', 'The Signal Forms article I saved in October']),
        ('hash', 'Count and compare', ['How many links do I have, by folder?', 'What did I save most this month?']),
        ('text', 'Summarise', ['What is in my Design folder, in five lines?', 'The main points of my unread Angular articles']),
        ('revisit', 'Plan and pick', ['Recipes for this weekend, under an hour', 'Which Signal Forms video should I watch first?'])]
start = APP2(f'''<div class="askwrap">{HIST}<div class="conv"><div class="start"><span class="sp">{ic("spark", 24)}</span><h1>Ask your shelf</h1><p class="lead">Questions in your own words, answered from the 58 links you saved. Every answer shows the links it used. Tap an example or type below.</p></div>
<div class="caps">{''.join(f'<div class="cap sm-l1"><h3>{ic(i)}{t}</h3>' + ''.join(f'<button class="q" type="button">{q}</button>' for q in qs) + '</div>' for i, t, qs in CAPS)}</div>
<div class="sticky">{COMPOSER()}<p class="fine">Answers are written by AI and can be wrong; check the links. 47 of 50 questions left this month.</p></div></div></div>''')
LC = lambda items: '<div class="lcards">' + ''.join(f'<a class="lc" href="#"><span class="sm-thumb">{ART[a]}</span><span style="min-width:0"><b>{t}</b><span>{d}</span></span></a>' for a, t, d in items) + '</div>'
conv = APP2(f'''<div class="askwrap">{HIST}<div class="conv"><div class="msgs">
<div class="me">How many links do I have, by folder?</div>
<div class="ai"><span class="av">{ic("spark", 16)}</span><div class="body"><div class="steps2"><span class="done">{ic("check", 12)}Counted links in 6 folders</span></div>
<p>You have <b>58 links</b>. Most are in Angular and Clothes:</p>
<div class="bars">{''.join(f'<div><span>{n}</span><i style="width:{v / 17 * 100:.0f}%"></i><em>{v}</em></div>' for n, v in [('Unsorted', 17), ('Angular', 12), ('Clothes', 7), ('Recipes', 7), ('Work', 7), ('Design', 5), ('Courses', 3)])}</div></div></div>
<div class="me">Recipes for this weekend, under an hour</div>
<div class="ai"><span class="av">{ic("spark", 16)}</span><div class="body"><div class="steps2"><span class="done">{ic("check", 12)}Looked through Recipes</span><span class="done">{ic("check", 12)}Read 7 pages for cooking times</span></div>
<p>Three fit: the <b>lemon ricotta pancakes</b> take 25 minutes <span class="cite">1</span>, <b>miso glazed salmon</b> 30 <span class="cite">2</span>. The tonkotsu broth needs 12 hours, but you noted “start on Friday evening”, so it works if you start tonight <span class="cite">3</span>.</p>
{LC([('pancakes', '1. Lemon ricotta pancakes', 'smittenkitchen.com · 25 min'), ('type', '2. Miso glazed salmon', 'bonappetit.com · 30 min'), ('bowl', '3. Tonkotsu ramen broth', 'seriouseats.com · 12 h')])}
<div class="acts2"><button class="sm-btn sm-btn--sm" type="button">{ic("bell")}Remind me Saturday</button><button class="sm-btn sm-btn--sm" type="button">{ic("plus")}Save as view</button><button class="sm-btn sm-btn--sm" type="button">{ic("copy")}Copy</button></div></div></div>
</div><div class="sticky">{COMPOSER('Ask a follow-up')}<p class="fine">Written by AI from your links, may be inaccurate. 45 questions left this month.</p></div></div></div>''')
thinking = APP2(f'''<div class="askwrap">{HIST}<div class="conv"><div class="msgs">
<div class="me">Coats I saved in autumn</div>
<div class="ai"><span class="av">{ic("spark", 16)}</span><div class="body"><div class="steps2"><span class="done">{ic("check", 12)}Searched for coats and jackets</span><span><span class="shimmer">Checking dates in Clothes…</span></span></div>
<p>You saved two coats in October: the COS wool-blend overcoat <span class="cite">1</span> and</p></div></div></div>
<div class="sticky"><div class="composer sm-l2"><textarea rows="1" aria-label="Ask your shelf" placeholder="Ask a follow-up" disabled></textarea><button class="sm-btn sm-btn--secondary" type="button">Stop</button></div></div></div></div>''')
limit = APP2(f'''<div class="askwrap">{HIST}<div class="conv"><div class="start" style="padding-top:32px"><span class="sp">{ic("spark", 24)}</span><h1>Ask your shelf</h1></div>
<div class="limit sm-l1" style="margin-top:24px">{ic("bell")}<span><b>You’ve used all 50 questions this month.</b> They come back on 1 December. Search still works.</span><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Open search</button></div>
<div class="limit sm-l1" style="margin-top:12px">{ic("spark")}<span><b>AI is off.</b> Turn it on in Settings › AI to ask questions. Nothing is sent while it’s off.</span><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Settings</button></div>
<p class="fine" style="margin-top:16px">Two states shown together: the monthly limit, and AI turned off.</p></div></div>''')
search_hint = APP2(f'''<div class="qp sm-l2" style="max-width:720px;margin-top:16px;border-radius:var(--radius-lg);overflow:hidden">
<div style="display:flex;align-items:center;gap:8px;height:52px;padding:0 12px 0 16px;border-bottom:1px solid var(--line)">{ic("search", 20)}<input value="how many links about angular" aria-label="Search your links" style="flex:1;border:0;outline:0;background:transparent;color:var(--text);font:400 1rem/1.5 var(--font-sans)"><span class="sm-kbd">Esc</span></div>
<div style="padding:24px 16px;text-align:center"><b style="font:600 1rem/1.5 var(--font-sans)">This looks like a question</b><p class="lead" style="margin:4px auto 0">Search finds links by words. Ask can count, compare and summarise.</p></div>
<div class="srch-hint">{ic("spark")}<span>Ask “how many links about angular”</span><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">Ask{ic("right")}</button></div></div>
<p class="lbl-s" style="margin-top:8px;max-width:720px">Search stays search. When a query reads like a question (how many, which, what is, summarise), it offers Ask instead of a row of weak matches.</p>''')
TAB_ASK = f'<nav class="sm-tabbar sm-l2" aria-label="Main"><button class="sm-tab" type="button">{ic("revisit", 20)}Today</button><button class="sm-tab" type="button">{ic("bookmark", 20)}Library</button><button class="sm-fab" type="button" aria-label="Add link">{ic("plus", 24)}</button><button class="sm-tab" type="button">{ic("search", 20)}Search</button><button class="sm-tab" type="button" aria-current="page">{ic("spark", 20)}Ask</button></nav>'
def phone(inner, tab=True): return f'<div class="phone"><div class="pc">{inner}</div>{"<div class=ptab>" + TAB_ASK + "</div>" if tab else ""}</div>'
P1 = f'''<div class="ph-top"><b>Ask</b><button class="sm-ib" type="button" aria-label="Conversations">{ic("list")}</button><span class="av2" aria-label="Account and settings">DU</span></div>
<div style="text-align:center;padding:16px 0 8px"><span class="sp" style="display:inline-grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--ai-bg);color:var(--ai)">{ic("spark", 20)}</span><p class="lead" style="margin:8px auto 0">Ask anything about your 58 links.</p></div>
<div style="display:flex;flex-direction:column;gap:8px">{''.join(f'<button class="sm-btn sm-btn--secondary" type="button" style="justify-content:flex-start;height:auto;padding:10px 12px;text-align:left;white-space:normal;font-weight:400">{q}</button>' for q in ['How many links do I have, by folder?', 'Recipes for this weekend, under an hour', 'What is in my Design folder?', 'The Signal Forms article from October'])}</div>
<div style="margin-top:auto">{COMPOSER()}</div>'''
P2 = f'''<div class="ph-top"><button class="sm-ib" type="button" aria-label="Back">{ic("left")}</button><b style="font-size:1rem">Recipes for this weekend</b><button class="sm-ib" type="button" aria-label="New conversation">{ic("plus")}</button></div>
<div class="msgs" style="padding-top:4px;overflow:hidden"><div class="me">Recipes for this weekend, under an hour</div><div class="ai"><span class="av">{ic("spark", 16)}</span><div class="body"><p>Three fit: the <b>lemon ricotta pancakes</b> take 25 minutes <span class="cite">1</span>, <b>miso glazed salmon</b> 30 <span class="cite">2</span>, and the tonkotsu broth if you start tonight <span class="cite">3</span>.</p>{LC([('pancakes', '1. Lemon ricotta pancakes', '25 min'), ('type', '2. Miso glazed salmon', '30 min')])}</div></div></div>
<div style="margin-top:auto">{COMPOSER('Ask a follow-up')}</div>'''
phones = f'''<div class="phones"><div>{phone(P1)}<p class="pcap">Phone: Ask gets its own tab. Settings move to the avatar at the top right of every tab.</p></div><div>{phone(P2, False)}<p class="pcap">A conversation is a pushed full-screen page; the tab bar hides, the composer sits above the keyboard.</p></div></div>'''
page('ask.html', 'Ask your shelf', A_CSS, [('start', 'Ask: what it can do', start), ('conv', 'Ask: a conversation', conv), ('thinking', 'Ask: answering', thinking), ('limit', 'Ask: limit reached, AI off', limit), ('phone', 'Ask on the phone', phones)], shell='bare')
