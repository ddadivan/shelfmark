exec(open('/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/dsgen4/build_pages.py').read())
# Group 14: system states — loading, errors, session, update, demo end, failed save.
Y_CSS = r'''
.sk{display:block;background:var(--surface-hover);border-radius:8px;position:relative;overflow:hidden}
.sk::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--surface) 60%,transparent),transparent);transform:translateX(-100%);animation:sk 1.4s ease-in-out infinite}
@keyframes sk{to{transform:translateX(100%)}}
@media (prefers-reduced-motion:reduce){.sk::after{animation:none;display:none}}
.y-head{display:flex;align-items:baseline;gap:16px;margin-top:32px}
.strip+.y-head{margin-top:24px}.y-head h1{margin:0}.y-head .cnt{color:var(--text-muted)}
.y-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(208px,1fr));gap:20px;margin-top:24px}
.y-grid .sm-card{width:auto}
.y-skc{border-radius:var(--radius-card,8px);overflow:hidden;background:var(--fill)}
.y-skc .b{padding:12px;display:flex;flex-direction:column;gap:8px}
.y-side{display:flex;flex-direction:column;gap:10px;padding:0 12px}
.y-fail{display:flex;flex-direction:column;align-items:center;gap:12px;padding:56px 16px;text-align:center}
.y-fail h2{margin:4px 0 0;font:600 1.375rem/1.75rem var(--font-display);letter-spacing:-.01em}
.y-fail p{margin:0;max-width:52ch;color:var(--text-muted)}
.y-fail .acts{display:flex;gap:8px;margin-top:8px}
.fx-scrim{position:fixed;inset:0;background:var(--scrim);z-index:80}
.fx-dlg{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:81;width:min(440px,calc(100vw - 32px))}
.fx-dlg .sc{display:flex;justify-content:center;margin:-8px 0 0}
.fx-dlg .sm-scene{width:200px;height:125px}
.fx-dlg .foot{display:flex;gap:8px;justify-content:flex-end}
.lock{position:fixed;inset:0;z-index:80;background:color-mix(in srgb,var(--canvas) 72%,transparent);backdrop-filter:blur(6px);display:grid;place-items:center;padding:16px}
.lock .sm-dialog{width:min(420px,100%)}
.fx-toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:70;display:flex;align-items:center;gap:12px;padding:8px 8px 8px 16px;border-radius:var(--radius-md);background:var(--text);color:var(--surface);font-size:.875rem;box-shadow:var(--shadow-l2);max-width:calc(100vw - 32px)}
.fx-toast .sm-btn{color:var(--surface);height:32px}.fx-toast .sm-btn:hover{background:rgba(127,127,135,.25)}
.fx-toast .ti{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:rgba(127,127,135,.25);flex:none}
.fx-toast.danger .ti{background:var(--danger);color:#fff}
.strip{display:flex;align-items:center;gap:12px;margin:24px 0 0;padding:8px 12px 8px 16px;border-radius:var(--radius-md);background:var(--fill);font-size:.875rem}
.strip svg{flex:none;color:var(--text-muted)}.strip span{flex:1}.strip b{font-weight:600}
.strip.warn{background:color-mix(in srgb,var(--warning) 12%,transparent)}.strip.warn svg{color:var(--warning)}
.y-cap{font-size:.75rem;color:var(--text-muted);margin-top:24px;max-width:640px;line-height:1.5}
.y-lp{margin-top:24px;border-radius:var(--radius-lg);overflow:hidden;background:var(--fill)}
.y-lp .bar{height:2px;background:var(--surface-hover)}.y-lp .bar i{display:block;height:100%;width:42%;background:var(--accent);animation:pb 1.6s ease-in-out infinite}
@keyframes pb{0%{width:8%}60%{width:62%}100%{width:84%}}@media (prefers-reduced-motion:reduce){.y-lp .bar i{animation:none}}
.y-lp .hd{display:flex;align-items:center;gap:12px;padding:12px 16px}
.y-lp .bd{padding:24px 32px 40px;display:flex;flex-direction:column;gap:12px;max-width:720px}
'''
def card(a, r, t, d): return f'<article class="sm-card sm-l1"><div class="sm-cover" style="aspect-ratio:{r}">{ART[a]}</div><div class="sm-card-body"><h3 class="sm-card-title">{t}</h3><div class="sm-meta">{fav(d[0].upper())}{d}</div></div></article>'
CARDS = [('video', '16/9', 'Angular 22: Signal Forms in 20 minutes', 'youtube.com'), ('shirt', '4/5', 'Wool overshirt', 'uniqlo.com'), ('bowl', '1/1', 'Rich tonkotsu ramen broth', 'seriouseats.com'), ('jacket', '4/5', 'Nano Puff jacket', 'patagonia.com'), ('pancakes', '1/1', 'Lemon ricotta pancakes', 'smittenkitchen.com'), ('type', '16/9', 'Progressive disclosure', 'nngroup.com')]
FEED = '<div class="y-head"><h1>All links</h1><span class="cnt">58 links</span></div><div class="y-grid">' + ''.join(card(*c) for c in CARDS) + '</div>'
def skcard(h): return f'<div class="y-skc"><span class="sk" style="height:{h}px;border-radius:0"></span><div class="b"><span class="sk" style="height:14px;width:85%"></span><span class="sk" style="height:14px;width:55%"></span><span class="sk" style="height:10px;width:40%"></span></div></div>'
SKFEED = '<div class="y-head"><h1>All links</h1><span class="sk" style="width:64px;height:14px"></span></div><div class="y-grid" aria-busy="true" aria-label="Loading links">' + ''.join(skcard(h) for h in [120, 200, 150, 220, 130, 180, 160, 120]) + '</div>'
LOGO = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="4" fill="var(--accent)"/><path d="M14 4h5v8l-2.5-2-2.5 2z" fill="var(--brand-notch)"/></svg>'
boot = (f'<div class="app" style="position:fixed;inset:0;z-index:60;background:var(--canvas);overflow:hidden"><nav class="side" aria-hidden="true"><div class="logo">{LOGO}<span>Shelfmark</span></div><div class="y-side">'
        + ''.join(f'<span class="sk" style="height:12px;width:{w}%"></span>' for w in [70, 60, 66, 52, 40]) + '<span style="height:16px"></span>' + ''.join(f'<span class="sk" style="height:12px;width:{w}%"></span>' for w in [58, 72, 50, 64])
        + f'</div></nav><main class="main"><div class="top"><span class="sk" style="height:52px;flex:1;max-width:720px;border-radius:16px"></span></div>{SKFEED}</main></div>')
feedload = SKFEED + '<p class="y-cap">First load and a slow refetch: skeletons in the shape of the current view (cards here, rows in List and Headlines), shown only after 300 ms and kept at least 400 ms so a fast answer shows nothing. A refetch with results already on screen keeps them and shows the 2px bar at the top instead.</p>'
failed = ('<div class="y-head"><h1>All links</h1></div>' + f'<div class="y-fail">{SC["error"]}<h2>Couldn’t load your links</h2><p>The server didn’t answer. Your links are safe; this is a connection problem.</p><div class="acts"><button class="sm-btn sm-btn--secondary" type="button">{ic("restore")}Try again</button></div></div>'
          + '<p class="y-cap">A failed first load keeps the page frame and shows one scene, one sentence and Try again. If links were already on screen, they stay, and a toast says the refresh failed.</p>')
linkload = (f'<div class="y-lp" aria-busy="true"><div class="bar"><i></i></div><div class="hd"><button class="sm-ib" type="button" aria-label="Back">{ic("left")}</button>{fav("N")}<span style="flex:1;font-weight:500">Progressive disclosure</span><span class="sm-muted" style="font-size:.75rem">nngroup.com</span></div>'
            '<div class="bd"><span class="sk" style="height:28px;width:70%"></span><span class="sk" style="height:12px;width:30%"></span><span style="height:8px"></span>' + ''.join(f'<span class="sk" style="height:12px;width:{w}%"></span>' for w in [96, 92, 98, 70, 94, 88, 60]) + '</div></div>'
            '<p class="y-cap">Link page while the site or the Reader text loads: the header is real at once (title, site, back), the 2px bar runs, the body is skeleton lines. After 10 s without an answer it shows “Still loading” with Open in browser.</p>')
session = FEED + f'''<div class="fx-scrim"></div><div class="fx-dlg sm-dialog sm-l3" role="alertdialog" aria-labelledby="se-t"><div class="sc">{SC["not-found"].replace("Page not found", "Signed out")}</div><h2 id="se-t">You’ve been signed out</h2><p>Your session ended after 30 days. Sign in again to carry on; everything you saved is still here.</p><div class="foot"><button class="sm-btn sm-btn--primary" type="button">{ic("google")}Sign in again</button></div></div>'''
tablock = FEED + f'''<div class="lock"><div class="sm-dialog sm-l3" role="alertdialog" aria-labelledby="tl-t"><h2 id="tl-t">You signed out in another tab</h2><p>This tab is locked so nothing changes by mistake. Sign in again to keep going here.</p><div class="foot"><button class="sm-btn" type="button">Close tab</button><button class="sm-btn sm-btn--primary" type="button">Sign in again</button></div></div></div>'''
update = FEED + f'<div class="fx-toast" role="status"><span class="ti">{ic("up", 16)}</span><span>A new version of Shelfmark is ready</span><button class="sm-btn sm-btn--sm" type="button">Reload</button><button class="sm-btn sm-btn--sm" type="button" aria-label="Later">Later</button></div>'
demoend = (f'<div class="strip warn" data-q="">{ic("bell")}<span>Demo shelf: <b>8 minutes left</b>. Changes are cleared when it ends.</span><button class="sm-btn sm-btn--sm" type="button">Sign in to keep a shelf</button></div>' + FEED
           + f'''<div class="fx-scrim"></div><div class="fx-dlg sm-dialog sm-l3" role="alertdialog" aria-labelledby="de-t"><div class="sc">{SC["revisit-done"]}</div><h2 id="de-t">The demo has ended</h2><p>The demo shelf has been cleared. Sign in with Google or GitHub to keep your own links, or start a fresh demo.</p><div class="foot"><button class="sm-btn" type="button">Start a new demo</button><button class="sm-btn sm-btn--primary" type="button">Sign in</button></div></div>''')
savefail = (f'<div class="strip">{ic("ext")}<span><b>You’re offline.</b> Links you open from your shelf still work; saving waits for the connection.</span></div>' + FEED
            + f'<div class="fx-toast danger" role="alert"><span class="ti">{ic("x", 16)}</span><span>Couldn’t save “Wool overshirt”. Your text is kept.</span><button class="sm-btn sm-btn--sm" type="button">Try again</button></div>'
            + '<p class="y-cap">A failed save never loses what was typed: the save panel stays open with its fields, the toast stays until handled, Try again repeats the same save (idempotent).</p>')
due = FEED + f'<div class="fx-toast" role="status"><span class="ti">{ic("bell", 16)}</span><span>2 reminders are due: Wool overshirt and 1 more</span><button class="sm-btn sm-btn--sm" type="button">Show</button></div><p class="y-cap">Once per session on opening the app, when reminders came due since the last one announced on this device. Show opens Today.</p>'
extbanner = (f'<div class="strip" style="background:var(--ai-bg)">{LOGO}<span><b>Save pages straight from your browser.</b> The extension saves the page you’re on in one click, with folder and tags.</span><button class="sm-btn sm-btn--sm sm-btn--primary" type="button">Get the extension</button><button class="sm-ib" type="button" aria-label="Dismiss">{ic("x")}</button></div>' + FEED
             + '<p class="y-cap">Desktop Chromium only (Chrome, Edge, Brave, Arc), from 64em, not while side by side or selecting. Dismissed for good; the sidebar footer keeps “Get the extension”.</p>')
openall = FEED + '<div class="fx-scrim"></div><div class="fx-dlg sm-dialog sm-l3" role="alertdialog" aria-labelledby="oa-t"><h2 id="oa-t">Open 24 links?</h2><p>Each link opens in a new tab. Above 10 links Shelfmark asks first.</p><div class="foot"><button class="sm-btn" type="button">Cancel</button><button class="sm-btn sm-btn--primary" type="button">Open all</button></div></div>'
page('system.html', 'System states', Y_CSS, [
 ('boot', 'App opening: skeleton shell', boot), ('feedload', 'Feed loading', feedload), ('failed', 'Feed failed to load', failed), ('linkload', 'Link page loading', linkload),
 ('session', 'Session ended', session), ('tablock', 'Signed out in another tab', tablock), ('update', 'Update ready', update), ('demoend', 'Demo: minutes left and ended', demoend),
 ('savefail', 'Offline and a failed save', savefail), ('due', 'Reminders due on opening', due), ('extbanner', 'Extension offer in the library', extbanner), ('openall', 'Open many links: confirm', openall)], cur='all')
