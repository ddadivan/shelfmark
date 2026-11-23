exec(open('/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/dsgen4/build_pages.py').read())

V_CSS = r'''
.overlay{position:relative;min-height:600px;margin-top:24px;border-radius:var(--radius-lg);overflow:hidden}
.overlay .scrim2{position:absolute;inset:0;background:var(--scrim)}
.overlay .sm-dialog{position:absolute;left:50%;top:24px;transform:translateX(-50%);max-width:calc(100% - 32px)}
.cap2{font-size:.75rem;color:var(--text-muted);margin-top:8px;max-width:640px;line-height:1.5}
.vd{width:560px}
.phrase{display:flex;gap:8px;align-items:center;padding:8px 8px 8px 12px;border:1px solid var(--line-strong);border-radius:var(--radius-sm);background:var(--surface)}
.phrase svg{color:var(--ai);flex:none}
.phrase input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--text);font:400 1rem/1.5 var(--font-sans)}
.vrows{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:var(--radius-md)}
.vrow{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;align-items:center;padding:10px 12px;font-size:.875rem}
.vrow+.vrow{border-top:1px solid var(--line)}
.vrow .k{color:var(--text-muted);font-size:.75rem;font-weight:500}
.vrow .v{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-width:0}
.vrow .sm-chip{height:28px;font-size:.75rem;padding:0 10px}
.vrow .ai-fill{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ai) 45%,transparent);background:var(--ai-bg)}
.note2{display:flex;gap:8px;align-items:flex-start;font-size:.75rem;color:var(--text-muted)}
.note2 svg{color:var(--ai);flex:none;margin-top:2px}
.iconpick{display:flex;gap:4px;flex-wrap:wrap}
.iconpick button{width:32px;height:32px;border:0;border-radius:var(--radius-sm);background:transparent;color:var(--text-muted);display:grid;place-items:center}
.iconpick button[aria-checked="true"]{background:var(--accent-bg);color:var(--text)}
.views-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:24px;position:relative}
.views-bar .sm-chip b{font-weight:400;color:var(--text-muted)}
.anch{position:relative;display:inline-block}
.anch .sm-menu{position:absolute;top:40px;left:0;z-index:5;width:240px}
.dp{width:560px}
.dp .grid2{display:grid;grid-template-columns:200px minmax(0,1fr);gap:20px}
.quick{display:flex;flex-direction:column;gap:2px}
.quick button{display:flex;justify-content:space-between;gap:8px;height:36px;padding:0 10px;border:0;border-radius:var(--radius-sm);background:transparent;color:var(--text);font:500 .875rem/1 var(--font-sans);align-items:center;text-align:left}
.quick button span{font-weight:400;font-size:.75rem;color:var(--text-muted)}
.quick button[aria-pressed="true"]{background:var(--accent-bg)}
.cal-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font:600 1rem/1 var(--font-sans)}
.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;font-size:.75rem;font-variant-numeric:tabular-nums}
.cal .dw{font-size:.75rem;color:var(--text-muted);padding:4px 0}
.cal button{height:34px;border:0;border-radius:var(--radius-sm);background:transparent;color:var(--text);font:inherit}
.cal button:hover{background:var(--surface-hover)}
.cal button.out{color:var(--text-muted);opacity:.5}
.cal button.today{box-shadow:inset 0 0 0 1px var(--line-strong)}
.cal button[aria-selected="true"]{background:var(--accent);color:var(--on-accent)}
.times{display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap}
.times .sm-chip{height:30px;font-size:.75rem}
.sumline{display:flex;gap:8px;align-items:center;padding:10px 12px;border-radius:var(--radius-sm);background:var(--surface-hover);font-size:.875rem}
.kbd-ov{width:720px}
.kcols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.kcols h3{margin:0 0 8px;font:600 .75rem/1.4 var(--font-sans);color:var(--text-muted)}
.kr{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:5px 0;font-size:.75rem}
.kr .sm-kbd+.sm-kbd{margin-left:3px}
.phones{display:flex;gap:32px;flex-wrap:wrap;margin-top:24px;align-items:flex-start}
.phone{position:relative;width:360px;height:780px;border-radius:28px;overflow:hidden;border:1px solid var(--line-strong);background:var(--canvas);flex:none}
.phone .pc{padding:16px}
.phone .scrim2{position:absolute;inset:0;background:var(--scrim)}
.sheet{position:absolute;left:0;right:0;bottom:0;border-radius:20px 20px 0 0;padding:8px 16px 16px;display:flex;flex-direction:column;gap:12px}
.sheet .grab{width:36px;height:4px;border-radius:2px;background:var(--line-strong);align-self:center}
.sheet h2{margin:0;font:600 1.125rem/1.25 var(--font-sans)}
@media (max-width:52em){.dp .grid2{grid-template-columns:1fr}.kcols{grid-template-columns:1fr}}
'''
SP = I['spark']
def chip(t, on=False, ai=False): return f'<button class="sm-chip{" ai-fill" if ai else ""}" type="button" aria-pressed="{str(on).lower()}">{t}{" ×" if on else ""}</button>'
def vrows(ai=False):
    a = ai
    return f'''<div class="vrows">
<div class="vrow"><span class="k">Type</span><span class="v">{chip("Videos", True, a)}{chip("Articles")}{chip("Learning")}{chip("+ More")}</span></div>
<div class="vrow"><span class="k">Folder</span><span class="v">{chip(tile("clay", 12) + " Angular", True, a)}{chip("Any folder")}</span></div>
<div class="vrow"><span class="k">Tags</span><span class="v">{chip("#signals", True, a)}{chip("+ Tag")}</span></div>
<div class="vrow"><span class="k">Words</span><span class="v"><span class="sm-input" style="height:30px;flex:1;min-width:120px"><input value="{"forms" if a else ""}" placeholder="In title, note or page" aria-label="Words"></span></span></div>
<div class="vrow"><span class="k">Saved</span><span class="v"><div class="sm-seg" role="radiogroup" aria-label="Saved"><button role="radio" aria-checked="false">Any time</button><button role="radio" aria-checked="{str(a).lower()}">Last month</button><button role="radio" aria-checked="false">Last week</button></div></span></div>
<div class="vrow"><span class="k">Only</span><span class="v">{chip("Favorites")}{chip("Unread", a, a)}{chip("With a reminder")}</span></div></div>'''
ICONS = ''.join(f'<button type="button" role="radio" aria-checked="{str(i == 2).lower()}" aria-label="{n}">{ic(n, 18)}</button>' for i, n in enumerate(['bookmark', 'star', 'play', 'text', 'hash', 'bell', 'search', 'grid']))
def vdialog(ai=False, title='New view'):
    phrase = f'''<div class="phrase">{ic("spark", 18)}<input value="{'Angular videos about forms from last month I haven’t watched' if ai else ''}" placeholder="Describe the view, e.g. “recipes under an hour”" aria-label="Describe the view"><button class="sm-btn sm-btn--secondary sm-btn--sm" type="button">{'Done' if ai else 'Fill in'}</button></div>'''
    note = f'<div class="note2">{ic("spark", 12)}<span>{"Filled in from your words; check the rows. Used 1 of 47 Ask questions." if ai else "Optional: describe it and AI fills the rows below. Counts as one Ask question."}</span></div>'
    return f'''<form class="sm-dialog sm-l3 vd" role="dialog" aria-labelledby="vdt"><h2 id="vdt">{title}</h2>{phrase}{note}
<div class="sm-field" style="min-width:0"><label for="vn">Name</label><div class="sm-input"><input id="vn" value="{'Angular videos to watch' if ai else ''}" placeholder="For example, Learning to try"></div></div>
<div class="grp" style="display:flex;flex-direction:column;gap:8px"><span class="lbl-s">Show links where</span>{vrows(ai)}</div>
<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span class="lbl-s">Icon</span><div class="iconpick" role="radiogroup" aria-label="Icon">{ICONS}</div><span class="lbl-s" style="margin-left:auto">{'4 links match' if ai else '17 links match'}</span></div>
<div class="foot"><button class="sm-btn sm-btn--secondary" type="button">Cancel</button><button class="sm-btn sm-btn--primary" type="button">Save view</button></div></form>'''
new_view = f'''<div class="overlay sm-l1" style="min-height:760px"><div class="scrim2"></div>{vdialog(False)}</div><p class="cap2">From “+ Save view” in the library or “Save as view” on search results: the rows start from the current filters. Works fully without AI.</p>'''
new_view_ai = f'''<div class="overlay sm-l1" style="min-height:780px"><div class="scrim2"></div>{vdialog(True)}</div><p class="cap2">With AI on, a phrase fills the same rows (highlighted until you touch them) and suggests a name. Unknown folder or tag names become search words.</p>'''
VCH = [('All', 58), ('Videos', 8), ('Articles', 23), ('Shopping', 7), ('Learning', 7), ('Angular videos to watch', 4)]
views_menu = f'''<h1>All links</h1><div class="views-bar" role="toolbar" aria-label="Saved views">{''.join(f'<button class="sm-chip" type="button" aria-pressed="{str(t == "Angular videos to watch").lower()}"{" aria-expanded=%strue%s" % (chr(34), chr(34)) if t == "Angular videos to watch" else ""}>{t} <b>{n}</b></button>' for t, n in VCH)}<button class="sm-chip sm-chip--dashed" type="button">{ic("plus")}Save view</button></div>
<div class="anch" style="margin-left:420px"><div class="sm-menu sm-l2" role="menu" aria-label="Actions for Angular videos to watch"><button class="sm-mi" role="menuitem">{ic("filter")}Edit view…</button><button class="sm-mi" role="menuitem">{ic("edit")}Rename</button><button class="sm-mi" role="menuitem">{ic("pin")}Pin to sidebar</button><button class="sm-mi" role="menuitem">{ic("move")}Reorder views…</button><div class="sm-msep"></div><button class="sm-mi sm-mi--danger" role="menuitem">{ic("trash")}Delete view</button></div></div>
<p class="cap2" style="margin-top:260px">Right-click or long-press a view, or its ⋯ on hover. Drag chips to reorder. Deleting a view never deletes links.</p>'''
DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
def cal(sel=28):
    cells = ''.join(f'<span class="dw">{d}</span>' for d in DAYS)
    nums = [26, 27, 28, 29, 30, 31] + list(range(1, 31)) + list(range(1, 7))
    for i, n in enumerate(nums):
        out = i < 6 or i >= 36
        cls = 'out' if out else ''
        if not out and n == 23: cls += ' today'
        cells += f'<button type="button" class="{cls.strip()}" aria-selected="{str((not out) and n == sel).lower()}">{n}</button>'
    return f'<div><div class="cal-h"><button class="sm-ib" type="button" aria-label="Previous month">{ic("left")}</button>November 2026<button class="sm-ib" type="button" aria-label="Next month">{ic("right")}</button></div><div class="cal" role="grid" aria-label="November 2026">{cells}</div></div>'
datepick = f'''<div class="overlay sm-l1" style="min-height:720px"><div class="scrim2"></div><form class="sm-dialog sm-l3 dp" role="dialog" aria-labelledby="dpt"><h2 id="dpt">Remind me about “The Ojai Jacket”</h2>
<div class="grid2"><div class="quick">{''.join(f'<button type="button" aria-pressed="{str(a == "Saturday").lower()}">{a}<span>{b}</span></button>' for a, b in [('Later today', '18:00'), ('Tomorrow', '9:00'), ('Saturday', 'Sat 28, 9:00'), ('Next week', 'Mon 30, 9:00'), ('In a month', '23 Dec, 9:00')])}</div>
<div>{cal(28)}<div class="times"><span class="lbl-s">Time</span>{''.join(f'<button class="sm-chip" type="button" aria-pressed="{str(t == "9:00").lower()}">{t}</button>' for t in ['9:00', '13:00', '18:00', '21:00'])}<span class="sm-input" style="height:30px;width:88px"><input value="9:00" aria-label="Exact time"></span></div></div></div>
<div class="sm-field" style="min-width:0"><label for="rw">Why <span style="font-weight:400;color:var(--text-muted)">(optional, shown with the reminder)</span></label><div class="sm-input"><input id="rw" value="Check the sale"></div></div>
<div class="sumline">{ic("bell")}<span>Saturday 28 November, 9:00 · in 5 days</span></div>
<div class="foot"><button class="sm-btn sm-btn--secondary" type="button">Cancel</button><button class="sm-btn sm-btn--primary" type="button">Set reminder</button></div></form></div>
<p class="cap2">Opened from “Pick a date…” in Remind me. Quick picks on the left set the calendar; the reason is what the notification and Today show.</p>'''
PHONE_DP = f'''<div class="phone"><div class="pc"><h1 style="margin:8px 0 0;font-size:2rem">Today</h1></div><div class="scrim2"></div><div class="sheet sm-l3" role="dialog" aria-labelledby="pdp"><span class="grab"></span><h2 id="pdp">Remind me</h2>
<div class="quick">{''.join(f'<button type="button" style="height:44px" aria-pressed="{str(a == "Saturday").lower()}">{a}<span>{b}</span></button>' for a, b in [('Later today', '18:00'), ('Tomorrow', '9:00'), ('Saturday', '9:00'), ('Next week', 'Mon 9:00')])}</div>
<div class="sm-msep" style="margin:0"></div>{cal(28)}<div class="times">{''.join(f'<button class="sm-chip" type="button" aria-pressed="{str(t == "9:00").lower()}">{t}</button>' for t in ['9:00', '13:00', '18:00'])}</div>
<button class="sm-btn sm-btn--primary" type="button" style="height:48px">Set for Sat 28, 9:00</button></div></div>'''
phone_dp = f'<div class="phones"><div>{PHONE_DP}<p class="cap2">Phone: a tall sheet; quick picks first, the calendar under them.</p></div></div>'
SHORT = [('Everywhere', [('Search', ['Ctrl', 'K']), ('Ask your shelf', ['Ctrl', 'J']), ('Add a link', ['N']), ('Paste to save', ['Ctrl', 'V']), ('Undo', ['Ctrl', 'Z']), ('This list', ['?'])]),
         ('Library', [('Move', ['↑', '↓']), ('Open preview', ['Enter']), ('Open in browser', ['Ctrl', 'Enter']), ('Select', ['X']), ('Favorite', ['F']), ('Move to folder', ['M']), ('Remind me', ['R']), ('Rename', ['F2']), ('Delete', ['⌫'])]),
         ('Link page', [('Next, previous', ['J', 'K']), ('Site or Reader', ['V']), ('Details', ['I']), ('Back', ['Esc'])])]
kbd = f'''<div class="overlay sm-l1" style="min-height:520px"><div class="scrim2"></div><div class="sm-dialog sm-l3 kbd-ov" role="dialog" aria-labelledby="kt"><div style="display:flex;align-items:center;gap:12px"><h2 id="kt" style="flex:1">Keyboard shortcuts</h2><button class="sm-ib" type="button" aria-label="Close">{ic("x")}</button></div>
<div class="kcols">{''.join(f'<div><h3>{g}</h3>' + ''.join(f'<div class="kr"><span>{t}</span><span>' + ''.join(f'<span class="sm-kbd">{k}</span>' for k in ks) + '</span></div>' for t, ks in rows) + '</div>' for g, rows in SHORT)}</div>
<p class="lbl-s" style="margin:0">Single-key shortcuts can be turned off in Settings › Keyboard shortcuts.</p></div></div>
<p class="cap2">Press ? anywhere. Esc closes; the full page with the switch is in Settings.</p>'''
page('views.html', 'Views, dates, shortcuts', V_CSS, [('new-view', 'New view', new_view), ('new-view-ai', 'New view from a phrase (AI)', new_view_ai), ('view-menu', 'View menu', views_menu), ('date', 'Pick a date for a reminder', datepick), ('date-phone', 'Pick a date on the phone', phone_dp), ('keys', 'Shortcuts overlay (?)', kbd)], cur='all')
