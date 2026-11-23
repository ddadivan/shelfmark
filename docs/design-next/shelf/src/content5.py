exec(open('/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/dsgen4/build_pages.py').read())

N_CSS = r'''
.row2{display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start;margin-top:24px}
.cap2{font-size:.75rem;color:var(--text-muted);margin-top:8px;max-width:420px;line-height:1.5}
.remind-pop{width:300px}
.ask-card{width:380px;max-width:100%;padding:16px;border-radius:var(--radius-md);display:flex;flex-direction:column;gap:12px}
.ask-card .h{display:flex;gap:12px;align-items:flex-start}
.ask-card .ic{display:grid;place-items:center;width:36px;height:36px;border-radius:var(--radius-sm);background:var(--surface-hover);flex:none}
.ask-card b{display:block;font:600 1rem/1.4 var(--font-sans)}
.ask-card p{margin:4px 0 0;font-size:.875rem;color:var(--text-muted)}
.ask-card .a{display:flex;gap:8px;justify-content:flex-end}
.browser{width:520px;max-width:100%;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--line-strong);background:var(--surface)}
.browser .bar{height:40px;background:var(--surface-hover);display:flex;align-items:center;gap:8px;padding:0 12px;font-size:.75rem;color:var(--text-muted)}
.browser .bar .url{flex:1;height:26px;border-radius:13px;background:var(--surface);display:flex;align-items:center;padding:0 12px;gap:6px}
.browser .body{position:relative;height:240px;background:var(--canvas)}
.native{position:absolute;left:12px;top:8px;width:320px;padding:14px 16px;border-radius:10px;background:#fff;color:#1f1f1f;box-shadow:0 8px 28px rgba(0,0,0,.18);font:400 13px/1.45 system-ui,-apple-system,sans-serif}
.native b{display:block;font-weight:600;margin-bottom:10px}
.native .row{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
.native .row span{padding:6px 14px;border-radius:16px;border:1px solid #c7c7c7;font-weight:500}
.native .row span.p{background:#0b57d0;border-color:#0b57d0;color:#fff}
.mac{width:360px;max-width:100%;padding:12px 14px;border-radius:16px;background:rgba(246,246,246,.98);color:#1d1d1f;box-shadow:0 10px 30px rgba(0,0,0,.18);font:400 13px/1.35 -apple-system,system-ui,sans-serif;display:grid;grid-template-columns:36px 1fr;gap:4px 10px}
.mac .mapp{grid-row:span 3;width:36px;height:36px;border-radius:8px;background:#171717;display:grid;place-items:center}
.mac .t{display:flex;justify-content:space-between;font-size:11px;color:#6e6e73;text-transform:uppercase;letter-spacing:.02em}
.mac b{font-weight:600}
.mac .btns{grid-column:2;display:flex;gap:6px;margin-top:6px}
.mac .btns span{flex:1;text-align:center;padding:5px 0;border-radius:7px;background:rgba(0,0,0,.06);font-weight:500}
.android{width:340px;max-width:100%;padding:14px 16px;border-radius:24px;background:#f3f1f6;color:#1c1b1f;box-shadow:0 6px 20px rgba(0,0,0,.14);font:400 14px/1.4 Roboto,system-ui,sans-serif}
.android .t{display:flex;align-items:center;gap:8px;font-size:12px;color:#49454f}
.android .t i{width:18px;height:18px;border-radius:50%;background:#171717;display:inline-block}
.android .m{display:grid;grid-template-columns:1fr 56px;gap:12px;margin-top:8px;align-items:center}
.android .m .th{width:56px;height:56px;border-radius:10px;overflow:hidden}
.android .btns{display:flex;gap:20px;margin-top:10px;font-weight:500;color:#4a4458}
.steps3{margin:12px 0 0;padding-left:20px;font-size:.875rem;line-height:1.7}
.mail{width:600px;max-width:100%;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--line-strong);background:#fff;color:#171717}
.mail .mh{padding:12px 16px;border-bottom:1px solid #eee;font-size:.75rem;color:#5d5d5a;display:grid;gap:2px}
.mail .mh b{color:#171717;font-weight:600;font-size:.875rem}
.mail .mb{padding:24px 28px;font:400 15px/1.55 system-ui,-apple-system,sans-serif}
.mail h2{margin:0 0 4px;font:600 22px/1.25 system-ui,sans-serif}
.mail .sec{margin-top:24px}
.mail .sec b{display:block;font-size:13px;color:#5d5d5a;font-weight:500;margin-bottom:8px}
.mail .li{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid #eee}
.mail .li .th{width:56px;height:42px;border-radius:6px;overflow:hidden;flex:none}
.mail .li .th svg{width:100%;height:100%;display:block}
.mail .li span{font-size:13px;color:#5d5d5a}
.mail .btn{display:inline-block;margin-top:24px;padding:10px 18px;border-radius:8px;background:#171717;color:#fff;font-weight:500;text-decoration:none}
.mail .ft{padding:16px 28px;border-top:1px solid #eee;font-size:12px;color:#8a8a86}
.mail .ft a{color:inherit}
@media (max-width:39.99em){.row2{gap:20px}.native{width:auto;right:12px}}
'''
SP = I['spark']
LOGO = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="4" fill="#fff"/><path d="M14 4h5v8l-2.5-2-2.5 2z" fill="#8DBB86"/></svg>'
REMIND = f'''<div class="sm-menu sm-l2 remind-pop" role="menu" aria-label="Remind me"><div class="sm-mh">Remind me</div>{''.join(f'<button class="sm-mi" role="menuitem" type="button">{a}<span style="margin-left:auto;font-size:.75rem;color:var(--text-muted);font-weight:400">{b}</span></button>' for a, b in [('Later today', '18:00'), ('Tomorrow', '9:00'), ('This weekend', 'Sat 9:00'), ('Next week', 'Mon 9:00')])}<div class="sm-msep"></div><button class="sm-mi" role="menuitem" type="button">Pick a date…</button></div>'''
ASKCARD = f'''<div class="ask-card sm-l2" role="dialog" aria-labelledby="nt1"><div class="h"><span class="ic">{ic("bell", 18)}</span><div><b id="nt1">Reminder set for tomorrow, 9:00</b><p>Want a nudge even when Shelfmark is closed? Your browser will ask once.</p></div></div><div class="a"><button class="sm-btn sm-btn--sm" type="button">Not now</button><button class="sm-btn sm-btn--primary sm-btn--sm" type="button">Turn on notifications</button></div></div>'''
ask = f'''<h1>Asking for notifications</h1><p class="lead">Only at the moment it makes sense: right after the first reminder. Never on the first visit, never twice in a row.</p>
<div class="row2"><div>{REMIND}<p class="cap2">1. The person picks “Tomorrow” in Remind me.</p></div><div>{ASKCARD}<p class="cap2">2. The confirmation becomes a short question in place of the usual toast. “Not now” hides it for 30 days; the reminder still shows in Today.</p></div></div>
<div class="row2"><div><div class="browser"><div class="bar"><span class="url">{ic("browser", 12)}shelfmark.app</span></div><div class="body"><div class="native"><b>shelfmark.app wants to</b>🔔 Show notifications<div class="row"><span>Block</span><span class="p">Allow</span></div></div></div></div><p class="cap2">3. Only then the browser’s own prompt appears (it looks different in every browser). If it is blocked, Shelfmark never asks again on its own.</p></div></div>'''
notif = f'''<h1>How a reminder arrives</h1><p class="lead">The title of the link, the reason you gave, and two actions. Clicking opens the link in Shelfmark.</p>
<div class="row2"><div><div class="mac"><span class="mapp">{LOGO}</span><span class="t"><span>Shelfmark</span><span>now</span></span><b>Wool overshirt</b><span>You asked to check the sale · uniqlo.com</span><span class="btns"><span>Open</span><span>Snooze 1 hour</span></span></div><p class="cap2">Desktop (macOS shown; Windows looks similar). Snooze offers 1 hour; more options are in Shelfmark.</p></div>
<div><div class="android"><div class="t"><i></i>Shelfmark · now</div><div class="m"><div><b style="font-weight:500">Wool overshirt</b><br><span style="color:#49454f">You asked to check the sale</span></div><div class="th">{ART['shirt']}</div></div><div class="btns"><span>Open</span><span>Snooze</span><span>Done</span></div></div><p class="cap2">Android, with the link’s picture and Done. On iPhone it works only after “Add to Home Screen”.</p></div></div>
<div class="row2"><div class="sm-toast sm-l2" role="status" style="max-width:520px">{ic("bell")}<span style="flex:1"><b style="font-weight:500">Wool overshirt</b> is due · You asked to check the sale</span><button class="sm-btn sm-btn--sm" type="button">Open</button><button class="sm-btn sm-btn--sm" type="button">Snooze</button></div></div>
<p class="cap2">If Shelfmark is open in a tab, the reminder shows as this toast instead, so it doesn’t ping twice.</p>'''
blocked = f'''<h1>When notifications are off</h1><p class="lead">Reminders still work: they wait in Today and in Revisit. These screens explain how to get notifications back.</p>
<div class="row2"><div class="sm-panel sm-l1" style="max-width:440px;padding:16px"><div style="display:flex;gap:12px"><span style="color:var(--warning)">{ic("bell", 20)}</span><div><b style="font:600 1rem/1.4 var(--font-sans)">Notifications are blocked in this browser</b><p class="lead" style="margin:4px 0 0">Shelfmark can’t turn them on for you. In Chrome:</p><ol class="steps3"><li>Click the icon left of the address, <b>shelfmark.app</b>.</li><li>Set <b>Notifications</b> to Allow.</li><li>Reload the page.</li></ol></div></div></div>
<div class="sm-panel sm-l1" style="max-width:440px;padding:16px"><div style="display:flex;gap:12px"><span>{ic("browser", 20)}</span><div><b style="font:600 1rem/1.4 var(--font-sans)">On iPhone, add Shelfmark to the Home Screen</b><p class="lead" style="margin:4px 0 0">Safari allows notifications only for apps on the Home Screen.</p><ol class="steps3"><li>Tap <b>Share</b> at the bottom of Safari.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Open Shelfmark from the Home Screen and turn notifications on.</li></ol></div></div></div></div>
<p class="cap2">Shown in Settings › Notifications in place of the switch. Links in the steps never open browser settings directly; browsers don’t allow that.</p>'''
MAILLIST = lambda items: ''.join(f'<div class="li"><span class="th">{ART[a]}</span><div><div style="font-weight:500">{t}</div><span>{d}</span></div></div>' for a, t, d in items)
mail = f'''<h1>From your shelf, weekly email</h1><p class="lead">Sunday 9:00, only if there is something to show. One tap to stop it.</p>
<div class="row2"><div class="mail" role="article" aria-label="Email preview"><div class="mh"><b>Shelfmark</b><span>From your shelf: 2 due, 12 saved, 1 forgotten</span></div><div class="mb">
<h2>Your week on the shelf</h2><div style="color:#5d5d5a">23 November</div>
<div class="sec"><b>Due this week</b>{MAILLIST([('shirt', 'Wool overshirt', 'You asked to check the sale · Mon'), ('video', 'Signal Forms in 20 minutes', 'Stopped at 12:40 · Thu')])}</div>
<div class="sec"><b>You saved 12 links; 9 were filed for you</b>{MAILLIST([('bowl', 'Rich tonkotsu ramen broth', 'Recipes · by rule'), ('jacket', 'Nano Puff jacket', 'Clothes · by AI')])}</div>
<div class="sec"><b>Saved 5 months ago, never opened</b>{MAILLIST([('pancakes', 'Lemon ricotta pancakes', '“For a lazy Sunday”. It’s Sunday.')])}</div>
<a class="btn" href="#">Open Today</a></div><div class="ft">You get this because the weekly email is on. <a href="#">Turn it off</a> · <a href="#">Settings</a></div></div></div>'''
page('notify.html', 'Reminders and notifications', N_CSS, [('ask', 'Asking at the right moment', ask), ('notif', 'A reminder arrives', notif), ('blocked', 'Blocked, and iPhone', blocked), ('mail', 'Weekly email', mail)], cur='revisit')
