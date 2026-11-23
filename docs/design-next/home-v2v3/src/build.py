import json
D = json.load(open('/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/real/ten.json'))
META = {
 'Ata9cSC2WpM': dict(folder='Angular', tags=['video', 'angular'], note='Почати звідси, перш ніж братися за Signal Forms', ago='сьогодні', month='Листопад', fav=True),
 'microsoft/playwright': dict(folder='Інструменти', tags=['testing'], note='', ago='вчора', month='Листопад', fav=False),
 'MBRqu0YOH14': dict(folder='Подивитися', tags=['video'], note='На вихідні, з чаєм', ago='2 лист.', month='Листопад', fav=False),
 'zQnBQ4tB3ZA': dict(folder='Angular', tags=['video', 'typescript'], note='', ago='31 жовт.', month='Жовтень', fav=False),
 'excalidraw/excalidraw': dict(folder='Інструменти', tags=['design'], note='Для схем у документації', ago='29 жовт.', month='Жовтень', fav=True),
 'aircAruvnKk': dict(folder='Навчання', tags=['ml'], note='Глави 1–4, по одній на вечір', ago='27 жовт.', month='Жовтень', fav=False),
 'rv4LlmLmVWk': dict(folder='Навчання', tags=['architecture'], note='', ago='24 жовт.', month='Жовтень', fav=False),
 'nrwl/nx': dict(folder='Інструменти', tags=['monorepo'], note='', ago='20 жовт.', month='Жовтень', fav=False),
 'W6NZfCO5SIk': dict(folder='Навчання', tags=['javascript'], note='', ago='18 жовт.', month='Жовтень', fav=False),
 'tldraw/tldraw': dict(folder='Інструменти', tags=['design'], note='', ago='15 жовт.', month='Жовтень', fav=False),
 'womens-tree-runners-thunder-green': dict(folder='Покупки', tags=['взуття'], note='Розмір 39, на весну', ago='сьогодні', month='Листопад', fav=True),
 'ojai-jacket-in-topsoil-donegal-moon-wool-2610': dict(folder='Покупки', tags=['одяг'], note='Чекаю на знижку', ago='3 лист.', month='Листопад', fav=False),
 'crater-shirt-in-denver-plaid-2611': dict(folder='Покупки', tags=['одяг'], note='', ago='28 жовт.', month='Жовтень', fav=False),
}
links = []
for x in D:
    m = META.get(x['id']) or dict(folder='Покупки', tags=['взуття'], note='', ago='22 жовт.', month='Жовтень', fav=False)
    m = dict(m)
    if x['kind'] == 'shop':
        title = x['title'].replace("Women's ", ''); sub = '$' + x['price'].replace('.00', '') + ' · ' + x['domain']
    else:
        title = x['title'] if x['kind'] == 'video' else x['id'].split('/')[1].capitalize()
        sub = x.get('author', '') if x['kind'] == 'video' else x['id']
    links.append(dict(id=x['id'], kind=x['kind'], title=title, sub=sub, url=x['url'], domain=x['domain'], img=x['data'], ratio=x['ratio'], **m))
ORD = {'сьогодні': 100, 'вчора': 99}
def key(l):
    a = l['ago']
    if a in ORD: return ORD[a]
    n, mon = a.split(' '); return (50 if mon.startswith('лист') else 0) + int(n)
links.sort(key=key, reverse=True)
DATA = json.dumps(links, ensure_ascii=False)

ICON = {
 'all': '<path d="M6 3h12v18l-6-4-6 4z"/>', 'inbox': '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
 'star': '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', 'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'bell': '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>', 'folder': '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 'chev': '<path d="M6 9l6 6 6-6"/>', 'plus': '<path d="M12 5v14M5 12h14"/>', 'search': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 'spark': '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>', 'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/>',
 'grid': '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
 'list': '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
 'masonry': '<rect x="4" y="4" width="7" height="9" rx="1.5"/><rect x="13" y="4" width="7" height="5" rx="1.5"/><rect x="4" y="15" width="7" height="5" rx="1.5"/><rect x="13" y="11" width="7" height="9" rx="1.5"/>', 'more': '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 'down': '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', 'trash': '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', 'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 'pen': '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13 7l4 4"/>', 'tag': '<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>', 'ext': '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
}
def ic(n, s=16, sw=1.75): return f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON[n]}</svg>'
LOGO = lambda fg, notch: f'<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4" fill="{fg}"/><path d="M14 4v7l2.5-1.8L19 11V4z" fill="{notch}"/></svg>'
ICJS = json.dumps({k: ic(k, 12, 2) for k in ['folder', 'star', 'pen', 'ext']})

COMMON_JS = r'''
const L = __DATA__, IC = __ICJS__;
const S = {scope: 'all', tab: 'all', q: '', view: 'cards'};
try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); if (v.view) S.view = v.view; if (v.theme) document.documentElement.dataset.theme = v.theme; } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({view: S.view, theme: document.documentElement.dataset.theme || ''})) } catch (e) {} };
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const FAVC = {'youtube.com': ['#FF0033', '#fff', 'Y'], 'github.com': ['#1F2328', '#fff', 'G'], 'allbirds.com': ['#212A2F', '#fff', 'A'], 'taylorstitch.com': ['#8A5A2B', '#fff', 'T']};
const fav = (d, s) => { const f = FAVC[d]; return `<span class="fav" style="width:${s}px;height:${s}px;background:${f[0]};color:${f[1]}" aria-hidden="true">${f[2]}</span>`; };
function visible() {
  const q = S.q.trim().toLowerCase();
  return L.filter(l => (S.scope === 'all' || (S.scope === 'fav' && l.fav) || (S.scope === 'unsorted' && false) || S.scope === 'f:' + l.folder)
    && (S.tab === 'all' || (S.tab === 'video' && l.kind === 'video') || (S.tab === 'repo' && l.kind === 'repo') || (S.tab === 'shop' && l.kind === 'shop'))
    && (!q || (l.title + ' ' + l.sub + ' ' + l.folder + ' ' + l.tags.join(' ') + ' ' + l.note).toLowerCase().includes(q)));
}
function scopeTitle() { return S.scope === 'all' ? 'Усі посилання' : S.scope === 'fav' ? 'Обране' : S.scope === 'unsorted' ? 'Несортовані' : S.scope.slice(2); }
function counts() { const c = {all: L.length, fav: L.filter(l => l.fav).length}; L.forEach(l => { c['f:' + l.folder] = (c['f:' + l.folder] || 0) + 1 }); return c; }
function rowHTML(l) {
  return `<a class="row" href="${l.url}" target="_blank" rel="noopener"><span class="rthumb"><img src="${l.img}" alt=""></span><span class="rtx"><span class="rtt">${esc(l.title)}</span><span class="meta">${fav(l.domain, 16)}<span>${esc(l.sub)}</span><span class="dotsep">·</span><span>${esc(l.folder)}</span>${l.note ? `<span class="dotsep">·</span><span class="rnote">${esc(l.note)}</span>` : ''}</span></span><span class="rago">${esc(l.ago)}</span>${l.fav ? `<span class="rstar" aria-label="В обраному">${IC.star}</span>` : ''}</a>`;
}
function renderAll() {
  const items = visible(), c = counts();
  document.querySelectorAll('[data-scope]').forEach(b => { b.toggleAttribute('aria-current', b.dataset.scope === S.scope); const n = b.querySelector('.n'); if (n && c[b.dataset.scope] != null) n.textContent = c[b.dataset.scope]; });
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === S.tab));
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === S.view));
  document.getElementById('h1t').textContent = scopeTitle();
  document.getElementById('h1n').textContent = items.length + ' ' + (items.length === 1 ? 'посилання' : items.length < 5 && items.length > 0 ? 'посилання' : 'посилань');
  const feed = document.getElementById('feed');
  if (!items.length) { feed.innerHTML = `<div class="empty"><b>Нічого не знайдено</b><span>Спробуйте інше слово або запитайте свою полицю.</span></div>`; return; }
  feed.innerHTML = S.view === 'list' ? `<div class="list">${items.map(rowHTML).join('')}</div>` : cardsHTML(items);
}
document.addEventListener('click', e => {
  const sc = e.target.closest('[data-scope]'); if (sc) { e.preventDefault(); S.scope = sc.dataset.scope; renderAll(); return; }
  const tb = e.target.closest('[data-tab]'); if (tb) { S.tab = tb.dataset.tab; renderAll(); return; }
  const vw = e.target.closest('[data-view]'); if (vw) { S.view = vw.dataset.view; save(); renderAll(); return; }
  const fd = e.target.closest('[data-fold]'); if (fd) { const open = fd.getAttribute('aria-expanded') !== 'true'; fd.setAttribute('aria-expanded', open); document.getElementById(fd.dataset.fold).hidden = !open; return; }
  if (e.target.closest('[data-theme-toggle]')) { const r = document.documentElement; const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; r.dataset.theme = dark ? 'light' : 'dark'; save(); return; }
  if (e.target.closest('[data-dismiss]')) { e.target.closest('[data-dismiss]').closest('aside').remove(); return; }
  if (e.target.closest('[data-soon]')) { e.preventDefault(); toast(e.target.closest('[data-soon]').dataset.soon); }
});
const q = document.getElementById('q'); q.addEventListener('input', () => { S.q = q.value; renderAll(); });
document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); q.focus(); } if (e.key === 'Escape' && document.activeElement === q) { q.value = ''; S.q = ''; renderAll(); q.blur(); } });
let tt; function toast(m) { const t = document.getElementById('toast'); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 2600); }
renderAll();
'''

def sidebar(cls):
    nav = lambda key, icon, label, n=True: f'<a href="#" class="nv" data-scope="{key}">{ic(icon)}<span class="lbl">{label}</span>{"<span class=n></span>" if n else ""}</a>'
    folders = ''.join(f'<a href="#" class="nv sub" data-scope="f:{f}">{ic("folder")}<span class="lbl">{f}</span><span class="n"></span></a>' for f in ['Angular', 'Інструменти', 'Навчання', 'Покупки', 'Подивитися'])
    tags = ''.join(f'<a href="#" class="nv sub" data-soon="Тег #{t}">{ic("tag")}<span class="lbl">{t}</span></a>' for t in ['video', 'design', 'angular'])
    return f'''<nav class="{cls}" aria-label="Бібліотека">
<a href="#" class="brand" data-scope="all">__LOGO__<span>Shelfmark</span></a>
<div class="grp">{nav('all', 'all', 'Усі посилання')}<a href="#" class="nv" data-scope="unsorted">{ic('inbox')}<span class="lbl">Несортовані</span><span class="n">0</span></a>{nav('fav', 'star', 'Обране')}<a href="#" class="nv" data-soon="Нещодавно відкриті">{ic('clock')}<span class="lbl">Нещодавно відкриті</span></a><a href="#" class="nv" data-soon="Нагадування">{ic('bell')}<span class="lbl">Нагадування</span></a></div>
<div class="grp"><div class="sech"><button type="button" class="secb" data-fold="fold-f" aria-expanded="true">Папки{ic('chev', 14)}</button><button type="button" class="ib sm" aria-label="Нова папка" data-soon="Нова папка">{ic('plus', 14)}</button></div><div id="fold-f">{folders}</div></div>
<div class="grp"><div class="sech"><button type="button" class="secb" data-fold="fold-t" aria-expanded="false">Теги{ic('chev', 14)}</button><button type="button" class="ib sm" aria-label="Новий тег" data-soon="Новий тег">{ic('plus', 14)}</button></div><div id="fold-t" hidden>{tags}</div></div>
<div class="foot"><aside class="intro"><span class="ii">{ic('clock', 18)}</span><a href="#" data-soon="Відео: як це працює">Ви тут уперше? Подивіться, як це працює</a><span class="muted s">3 хвилини</span><button type="button" class="ib sm x" aria-label="Сховати" data-dismiss>{ic('plus', 14).replace('M12 5v14M5 12h14', 'M6 6l12 12M18 6L6 18')}</button></aside>
<a href="#" class="nv" data-soon="Розширення">{ic('down')}<span class="lbl">Отримати розширення</span></a><a href="#" class="nv" data-soon="Дані й допомога">{ic('more')}<span class="lbl">Дані й допомога</span></a><a href="#" class="nv" data-soon="Кошик">{ic('trash')}<span class="lbl">Кошик</span></a></div></nav>'''
TABBAR = f'''<nav class="tabbar" aria-label="Розділи"><a href="#" class="tb" data-scope="all">{ic('all', 20)}Полиця</a><a href="#" class="tb" onclick="document.getElementById('q').focus();return false">{ic('search', 20)}Пошук</a><button type="button" class="tbadd" aria-label="Додати посилання" data-soon="Додати посилання">{ic('plus', 22, 2)}</button><a href="#" class="tb" data-soon="Спитати полицю">{ic('spark', 20)}Спитати</a><a href="#" class="tb" data-soon="Профіль">{ic('user', 20)}Ви</a></nav>'''
TABS = '<div class="tabs" role="tablist" aria-label="Добірки"><button type="button" role="tab" data-tab="all">Усі <span>14</span></button><button type="button" role="tab" data-tab="video">Відео <span>6</span></button><button type="button" role="tab" data-tab="repo">Репозиторії <span>4</span></button><button type="button" role="tab" data-tab="shop">Магазини <span>4</span></button></div>'
VIEW = f'<div class="viewsw" role="group" aria-label="Вигляд"><button type="button" data-view="cards" aria-label="Картки">{ic("grid")}</button><button type="button" data-view="list" aria-label="Список">{ic("list")}</button></div>'

# ================= V2 =================
V2_CSS = r'''
:root{--bg:#F6F6F4;--side:#EFEFEC;--surface:#FFFFFF;--fill:#EBEBE7;--sel:#E4E4DF;--hover:rgba(24,24,28,.05);--text:#1C1C1F;--muted:#5D5D64;--sage:#4E7A52;--scrim:rgba(20,20,22,.4)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#19191C;--side:#151518;--surface:#212125;--fill:#26262B;--sel:#2F2F35;--hover:rgba(255,255,255,.06);--text:#ECECEE;--muted:#A3A3AA;--sage:#8FBF93;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#19191C;--side:#151518;--surface:#212125;--fill:#26262B;--sel:#2F2F35;--hover:rgba(255,255,255,.06);--text:#ECECEE;--muted:#A3A3AA;--sage:#8FBF93;color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--text);font:400 16px/24px "Hanken Grotesk",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0}
:focus-visible{outline:2px solid var(--sage);outline-offset:2px}
.app{display:flex;min-height:100vh}
.side{flex:0 0 240px;background:var(--side);padding:16px 12px;display:flex;flex-direction:column;gap:24px;position:sticky;top:0;height:100vh;overflow:auto}
.brand{display:flex;align-items:center;gap:8px;height:32px;padding:0 8px;font-weight:600}
.grp{display:flex;flex-direction:column;gap:2px}
.nv{display:flex;align-items:center;gap:12px;height:36px;padding:0 8px;border-radius:8px;font-size:14px;line-height:22px;color:var(--text)}
.nv svg{color:var(--muted);flex:none}.nv .lbl{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nv .n{color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
.nv:hover{background:var(--hover)}.nv[aria-current]{background:var(--sel);font-weight:500}
.nv.sub{padding-left:12px}
.sech{display:flex;align-items:center;height:32px;padding-left:4px}
.secb{display:flex;align-items:center;gap:4px;height:28px;padding:0 8px 0 4px;border-radius:8px;color:var(--muted);font-size:12px}
.secb svg{transition:transform 150ms}.secb[aria-expanded="false"] svg{transform:rotate(-90deg)}.secb:hover{color:var(--text)}
.ib{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;color:var(--muted)}.ib.sm{width:28px;height:28px;margin-left:auto}.ib:hover{background:var(--hover);color:var(--text)}
.foot{margin-top:auto;display:flex;flex-direction:column;gap:2px}
.intro{position:relative;display:grid;grid-template-columns:20px 1fr;gap:4px 12px;margin-bottom:8px;padding:12px 36px 12px 12px;border-radius:12px;background:var(--fill);font-size:14px;line-height:22px}
.intro .ii{grid-row:span 2;color:var(--muted)}.intro a{font-weight:500}.intro .x{position:absolute;top:8px;right:8px}
.muted{color:var(--muted)}.s{font-size:12px;line-height:16px}
main{flex:1;min-width:0;padding:16px 32px 48px}
.top{display:flex;align-items:center;gap:8px;min-height:48px;flex-wrap:wrap}
.search{flex:0 1 440px;min-width:200px;display:flex;align-items:center;gap:8px;height:40px;padding:0 12px;border-radius:8px;background:var(--fill);color:var(--muted)}
.search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:14px;color:var(--text)}
.search input::placeholder{color:var(--muted)}
.search:focus-within{box-shadow:0 0 0 2px var(--sage)}
kbd{font:inherit;font-size:12px}
.btn{display:flex;align-items:center;gap:8px;height:40px;padding:0 12px;border-radius:8px;font-size:14px}.btn:hover{background:var(--hover)}.btn svg{color:var(--muted)}
.add{background:var(--text);color:var(--bg);font-weight:500;padding:0 16px 0 12px}.add svg{color:inherit}.add:hover{background:var(--text);opacity:.9}
.av{width:32px;height:32px;margin-left:8px;border-radius:50%;background:var(--sel);font-size:12px;font-weight:500}
.sp{flex:1}
.head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;margin-top:32px}
.head .t{flex:1;min-width:240px;display:flex;align-items:baseline;gap:12px}
h1{margin:0;font-size:24px;line-height:30px;font-weight:600;letter-spacing:-.01em}
.sort{display:flex;align-items:center;gap:4px;height:32px;padding:0 8px 0 12px;border-radius:8px;font-size:14px;color:var(--muted)}.sort:hover{background:var(--hover)}
.viewsw{display:flex;gap:2px;padding:2px;border-radius:10px;background:var(--fill)}
.viewsw button{width:32px;height:28px;border-radius:8px;display:grid;place-items:center;color:var(--muted)}
.viewsw button[aria-pressed="true"]{background:var(--surface);color:var(--text)}
.tabs{display:flex;flex-wrap:wrap;gap:4px;margin-top:16px}
.tabs button{height:32px;padding:0 12px;border-radius:8px;font-size:14px;color:var(--muted);white-space:nowrap}.tabs button span{margin-left:4px;opacity:.8}
.tabs button:hover{background:var(--hover)}.tabs button[aria-selected="true"]{background:var(--sel);color:var(--text);font-weight:500}
#feed{margin-top:24px}
.cols{columns:4 220px;column-gap:24px}
.card{display:flex;flex-direction:column;gap:12px;break-inside:avoid;margin-bottom:32px}
.tile{position:relative;border-radius:12px;overflow:hidden;background:var(--fill);transition:transform 240ms cubic-bezier(.2,.7,.2,1)}
.tile img{display:block;width:100%;height:100%;object-fit:cover}
.tile.shop{background:#F3F3F1}
.card:hover .tile{transform:translateY(-2px)}.card:hover .ttl{text-decoration:underline;text-underline-offset:3px}
.play{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--surface);color:var(--text)}
.body{display:flex;flex-direction:column;gap:4px;padding:0 4px}
.meta{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12px;line-height:16px;min-width:0}
.meta>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.meta .ago{margin-left:auto;flex:none}
.fav{flex:none;border-radius:4px;display:grid;place-items:center;font-size:10px;font-weight:700}
.ttl{font-weight:500;font-size:16px;line-height:24px}
.note{font-family:Newsreader,Georgia,serif;font-style:italic;font-size:18px;line-height:26px}
.foot2{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;color:var(--muted);font-size:12px;line-height:16px}
.foot2 .f{display:inline-flex;align-items:center;gap:4px}.foot2 .st{margin-left:auto;color:var(--sage);display:grid}.foot2 .st svg{fill:currentColor}
.list{display:flex;flex-direction:column}
.row{display:flex;align-items:center;gap:16px;padding:8px;border-radius:10px}.row:hover{background:var(--hover)}
.rthumb{flex:none;width:112px;aspect-ratio:16/9;border-radius:8px;overflow:hidden;background:var(--fill)}.rthumb img{width:100%;height:100%;object-fit:cover;display:block}
.rtx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.rtt{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rnote{font-family:Newsreader,Georgia,serif;font-style:italic;font-size:14px}.dotsep{opacity:.6}
.rago{flex:none;color:var(--muted);font-size:12px}.rstar{flex:none;color:var(--sage);display:grid}.rstar svg{fill:currentColor}
.empty{padding:64px 0;display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--muted)}.empty b{color:var(--text);font-weight:600}
.tabbar{display:none}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);padding:10px 16px;border-radius:10px;background:var(--text);color:var(--bg);font-size:14px;z-index:50}
@media (max-width:760px){.side,.desk{display:none!important}main{padding:16px 16px 104px}.cols{columns:2;column-gap:12px}.card{margin-bottom:20px}
 .tabbar{display:flex;position:fixed;left:8px;right:8px;bottom:8px;height:64px;padding:0 8px;border-radius:12px;background:var(--surface);justify-content:space-around;align-items:center;z-index:30}
 .tb{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:64px;height:48px;border-radius:8px;color:var(--muted);font-size:12px;line-height:16px}.tb[aria-current]{background:var(--sel);color:var(--text);font-weight:500}
 .tbadd{width:48px;height:48px;border-radius:12px;display:grid;place-items:center;background:var(--text);color:var(--bg)}.toast{bottom:84px}.rthumb{width:88px}.rnote,.dotsep{display:none}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
'''
V2_CARDS = r'''function cardsHTML(items){const cols=4;return `<div class="cols">${items.map(l=>`<a class="card" href="${l.url}" target="_blank" rel="noopener"><span class="tile ${l.kind}" style="aspect-ratio:${l.ratio}"><img src="${l.img}" alt="">${l.kind==='video'?`<span class="play" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>`:''}</span><span class="body"><span class="meta">${fav(l.domain,16)}<span>${esc(l.sub)}</span><span class="ago">${esc(l.ago)}</span></span><span class="ttl">${esc(l.title)}</span>${l.note?`<span class="note">${esc(l.note)}</span>`:''}<span class="foot2"><span class="f">${IC.folder}${esc(l.folder)}</span>${l.tags.map(t=>`<span>#${esc(t)}</span>`).join('')}${l.fav?`<span class="st" aria-label="В обраному">${IC.star}</span>`:''}</span></span></a>`).join('')}</div>`}'''
v2_body = f'''<div class="app">{sidebar('side').replace('__LOGO__', LOGO('currentColor', 'var(--side)'))}
<main><header class="top"><label class="search">{ic('search')}<input id="q" type="search" placeholder="Пошук посилань, папок і тегів" aria-label="Пошук"><kbd class="desk">⌘K</kbd></label>
<button type="button" class="btn" data-soon="Спитати полицю">{ic('spark')}Запитати</button><span class="sp"></span>
<button type="button" class="ib desk" aria-label="Тема" data-theme-toggle>{ic('sun', 18)}</button>
<button type="button" class="btn add desk" data-soon="Додати посилання">{ic('plus', 16, 2)}Додати посилання</button><button type="button" class="av" aria-label="Акаунт">AL</button></header>
<div class="head"><div class="t"><h1 id="h1t">Усі посилання</h1><span class="muted" id="h1n" style="font-size:14px"></span></div><button type="button" class="sort" data-soon="Сортування">Спершу нові{ic('chev', 14)}</button>{VIEW}</div>
{TABS}<section id="feed" aria-label="Посилання"></section></main></div>{TABBAR}<div class="toast" id="toast" role="status" hidden></div>'''
v2 = f'''<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shelfmark — варіант v2</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Newsreader:ital,opsz,wght@1,6..72,400&display=swap" rel="stylesheet">
<style>{V2_CSS}</style></head><body>{v2_body}<script>const KEY='sm-v2';{V2_CARDS}{COMMON_JS.replace('__DATA__', DATA).replace('__ICJS__', ICJS)}</script></body></html>'''

# ================= V3 =================
VIEW3 = f'<div class="viewsw" role="group" aria-label="Вигляд"><button type="button" data-view="masonry" aria-label="Masonry" title="Masonry">{ic("masonry")}</button><button type="button" data-view="cards" aria-label="Картки" title="Картки">{ic("grid")}</button><button type="button" data-view="list" aria-label="Список" title="Список">{ic("list")}</button></div>'
V3_CSS = r'''
:root{--bg:#ECECE9;--panel:#FBFBFA;--panel2:#F2F2EF;--sel:#E6E6E1;--hover:rgba(20,20,24,.05);--text:#18181B;--muted:#5C5D64;--sage:#4E7A52;--tile:#EDEDEA}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141518;--panel:#1B1C20;--panel2:#232429;--sel:#2C2D33;--hover:rgba(255,255,255,.06);--text:#EEEEF0;--muted:#A4A5AD;--sage:#9CCB9F;--tile:#24252A;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#141518;--panel:#1B1C20;--panel2:#232429;--sel:#2C2D33;--hover:rgba(255,255,255,.06);--text:#EEEEF0;--muted:#A4A5AD;--sage:#9CCB9F;--tile:#24252A;color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--text);font:400 16px/24px "Funnel Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0}
:focus-visible{outline:2px solid var(--sage);outline-offset:2px}
.disp{font-family:"Funnel Display","Funnel Sans",system-ui,sans-serif}
.app{display:flex;min-height:100vh}
.side{flex:0 0 232px;padding:16px 8px 16px 16px;display:flex;flex-direction:column;gap:24px;position:sticky;top:0;height:100vh;overflow:auto}
.brand{display:flex;align-items:center;gap:8px;height:40px;padding:0 12px;font-family:"Funnel Display","Funnel Sans",system-ui,sans-serif;font-weight:600}
.grp{display:flex;flex-direction:column;gap:2px}
.nv{display:flex;align-items:center;gap:12px;height:36px;padding:0 12px;border-radius:10px;font-size:14px;line-height:22px;color:var(--muted)}
.nv svg{flex:none}.nv .lbl{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nv .n{font-size:12px;font-variant-numeric:tabular-nums}
.nv:hover{background:var(--hover);color:var(--text)}.nv[aria-current]{background:var(--panel);color:var(--text);font-weight:500}
.nv.sub{padding-left:16px}
.sech{display:flex;align-items:center;height:32px;padding-left:4px}
.secb{display:flex;align-items:center;gap:4px;height:28px;padding:0 8px;border-radius:8px;color:var(--muted);font-size:12px}
.secb svg{transition:transform 150ms}.secb[aria-expanded="false"] svg{transform:rotate(-90deg)}.secb:hover{color:var(--text)}
.ib{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;color:var(--muted)}.ib.sm{width:28px;height:28px;margin-left:auto;border-radius:8px}.ib:hover{background:var(--hover);color:var(--text)}
.foot{margin-top:auto;display:flex;flex-direction:column;gap:2px}
.intro{position:relative;display:flex;flex-direction:column;gap:8px;margin-bottom:8px;padding:16px;border-radius:16px;background:var(--panel);font-size:14px;line-height:22px}
.intro .ii{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:var(--sel)}.intro a{font-weight:500;padding-right:24px}.intro .x{position:absolute;top:8px;right:8px}
.muted{color:var(--muted)}.s{font-size:12px;line-height:16px}
main{flex:1;min-width:0;margin:8px 8px 8px 0;padding:24px 40px 56px;border-radius:20px;background:var(--panel)}
.top{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.cmd{flex:1 1 420px;max-width:720px;display:flex;align-items:center;gap:12px;height:52px;padding:0 8px 0 16px;border-radius:16px;background:var(--panel2);color:var(--muted)}
.cmd:focus-within{box-shadow:0 0 0 2px var(--sage)}
.cmd input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;color:var(--text)}.cmd input::placeholder{color:var(--muted)}
kbd{font:inherit;font-size:12px;line-height:16px;padding:4px 8px;border-radius:6px;background:var(--sel)}
.ask{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px 0 8px;border-radius:10px;color:var(--text);font-size:14px;font-weight:500}.ask svg{color:var(--sage)}.ask:hover{background:var(--hover)}
.av{width:36px;height:36px;border-radius:50%;background:var(--sel);font-size:12px;font-weight:600}
.sp{flex:1}
.head{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px;margin-top:40px}
h1{flex:1;min-width:240px;margin:0;display:flex;align-items:baseline;gap:16px;font-family:"Funnel Display","Funnel Sans",system-ui,sans-serif;font-size:32px;line-height:40px;font-weight:600;letter-spacing:-.02em}
h1 .muted{font-family:"Funnel Sans",system-ui,sans-serif;font-size:16px;line-height:24px;font-weight:400;letter-spacing:0}
.tabs{display:flex;gap:2px;padding:4px;border-radius:12px;background:var(--panel2);max-width:100%;overflow-x:auto;scrollbar-width:none}
.tabs button{height:32px;padding:0 12px;border-radius:8px;color:var(--muted);font-size:14px;white-space:nowrap;flex:none}.tabs button span{margin-left:4px;opacity:.8}
.tabs button:hover{color:var(--text)}.tabs button[aria-selected="true"]{background:var(--panel);color:var(--text);font-weight:500}
.tools{display:flex;gap:4px;align-items:center}
.sort{display:flex;align-items:center;gap:4px;height:40px;padding:0 8px 0 12px;border-radius:10px;color:var(--muted);font-size:14px}.sort:hover{background:var(--hover)}
.viewsw{display:flex;gap:2px}.viewsw button{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;color:var(--muted)}.viewsw button:hover{background:var(--hover)}.viewsw button[aria-pressed="true"]{background:var(--panel2);color:var(--text)}
.sec{margin-top:40px}
.sec h2{margin:0 0 16px;display:flex;align-items:baseline;gap:12px;font-family:"Funnel Display","Funnel Sans",system-ui,sans-serif;font-size:16px;line-height:24px;font-weight:600}
.sec h2 span{font-family:"Funnel Sans",system-ui,sans-serif;color:var(--muted);font-size:14px;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(208px,1fr));gap:32px 20px}
.card{display:flex;flex-direction:column;gap:12px;min-width:0}
.card.feat{grid-column:span 2}
.mcols{columns:4 220px;column-gap:20px}.mcols .card{break-inside:avoid;margin-bottom:28px}
@media (max-width:760px){.mcols{columns:2 auto;column-gap:10px}.mcols .card{margin-bottom:18px}}
.tile{position:relative;aspect-ratio:4/3;border-radius:16px;overflow:hidden;background:var(--tile);transition:transform 240ms cubic-bezier(.2,.7,.2,1)}
.card.feat .tile{aspect-ratio:auto;height:100%;min-height:0}
.tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.tile.repo img{object-fit:cover;object-position:left center}
.tile.shop{background:#F3F3F1}.tile.shop img{object-fit:contain;padding:8%}
.card:hover .tile{transform:translateY(-2px)}.card:hover .ttl{text-decoration:underline;text-underline-offset:3px}
.vid{position:absolute;left:12px;bottom:12px;display:flex;align-items:center;gap:6px;height:28px;padding:0 10px 0 8px;border-radius:8px;background:var(--panel);color:var(--text);font-size:12px;font-weight:500}
.body{display:flex;flex-direction:column;gap:4px;padding:0 4px}
.ttl{font-weight:500;font-size:16px;line-height:24px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card.feat .ttl{font-family:"Funnel Display","Funnel Sans",system-ui,sans-serif;font-size:22px;line-height:28px;font-weight:600;letter-spacing:-.01em}
.cap{color:var(--muted);font-size:14px;line-height:22px}
.meta,.foot2{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;color:var(--muted);font-size:12px;line-height:16px;min-width:0}
.meta>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dm{display:inline-flex;align-items:center;gap:8px;min-width:0}
.fav{flex:none;border-radius:4px;display:grid;place-items:center;font-size:10px;font-weight:700}
.f{display:inline-flex;align-items:center;gap:4px}.st{margin-left:auto;color:var(--sage);display:grid}.st svg{fill:currentColor}
.list{display:flex;flex-direction:column;margin-top:24px}
.row{display:flex;align-items:center;gap:16px;padding:10px;border-radius:12px}.row:hover{background:var(--hover)}
.rthumb{flex:none;width:120px;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:var(--tile)}.rthumb img{width:100%;height:100%;object-fit:cover;display:block}
.rtx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.rtt{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dotsep{opacity:.6}.rnote{font-size:13px}
.rago{flex:none;color:var(--muted);font-size:12px}.rstar{flex:none;color:var(--sage);display:grid}.rstar svg{fill:currentColor}
.empty{padding:64px 0;display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--muted)}.empty b{color:var(--text);font-weight:600}
.tabbar{display:none}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);padding:10px 16px;border-radius:12px;background:var(--text);color:var(--panel);font-size:14px;z-index:50}
@media (max-width:760px){.side,.desk{display:none!important}main{margin:0;border-radius:0;padding:16px 16px 104px}.mcols{columns:2;column-gap:10px}.mcols .card{margin-bottom:18px}.card.feat{grid-column:span 2}
.mcols{columns:4 220px;column-gap:20px}.mcols .card{break-inside:avoid;margin-bottom:28px}
@media (max-width:760px){.mcols{columns:2 auto;column-gap:10px}.mcols .card{margin-bottom:18px}}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 10px}
 .tabbar{display:flex;position:fixed;left:8px;right:8px;bottom:8px;height:64px;padding:0 8px;border-radius:20px;background:var(--panel2);justify-content:space-around;align-items:center;z-index:30}
 .tb{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:64px;height:48px;border-radius:12px;color:var(--muted);font-size:12px;line-height:16px}.tb[aria-current]{background:var(--sel);color:var(--text);font-weight:500}
 .tbadd{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:var(--text);color:var(--panel)}.toast{bottom:84px}.rthumb{width:88px}.rnote,.dotsep{display:none}.head{margin-top:24px}h1{font-size:26px;line-height:32px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
'''
V3_CARDS = r'''function cardHTML(l,feat,mas){return `<a class="card${feat?' feat':''}" href="${l.url}" target="_blank" rel="noopener"><span class="tile ${l.kind}"${feat?` style="aspect-ratio:16/7"`:mas?` style="aspect-ratio:${l.ratio}"`:''}><img src="${l.img}" alt="">${l.kind==='video'?`<span class="vid" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24"><path d="M7 5v14l12-7z" fill="currentColor"/></svg>Відео</span>`:''}</span><span class="body"><span class="ttl">${esc(l.title)}</span>${l.note?`<span class="cap">${esc(l.note)}</span>`:''}<span class="foot2"><span class="dm">${fav(l.domain,16)}<span>${esc(l.sub)}</span></span><span class="f">${IC.folder}${esc(l.folder)}</span>${l.fav?`<span class="st" aria-label="В обраному">${IC.star}</span>`:''}</span></span></a>`}
function cardsHTML(items){const g={};items.forEach(l=>{(g[l.month]=g[l.month]||[]).push(l)});const mas=S.view==='masonry';return Object.keys(g).map((m,mi)=>`<section class="sec"><h2>${m}<span>${g[m].length}</span></h2><div class="${mas?'mcols':'grid'}">${g[m].map((l,i)=>cardHTML(l,!mas&&mi===0&&i===0&&S.tab==='all'&&!S.q&&S.scope==='all',mas)).join('')}</div></section>`).join('')}'''
v3_body = f'''<div class="app">{sidebar('side').replace('__LOGO__', LOGO('currentColor', 'var(--bg)'))}
<main><header class="top"><label class="cmd">{ic('search', 18)}<input id="q" type="search" placeholder="Шукайте або вставте посилання, щоб зберегти" aria-label="Пошук або нове посилання"><kbd class="desk">⌘K</kbd><button type="button" class="ask" data-soon="Спитати полицю">{ic('spark')}Запитати</button></label><span class="sp"></span>
<button type="button" class="ib desk" aria-label="Тема" data-theme-toggle>{ic('sun', 18)}</button><button type="button" class="av" aria-label="Акаунт">AL</button></header>
<div class="head"><h1><span id="h1t">Усі посилання</span><span class="muted" id="h1n"></span></h1>{TABS}<div class="tools"><button type="button" class="sort desk" data-soon="Сортування">Спершу нові{ic('chev', 14)}</button>{VIEW3}</div></div>
<div id="feed"></div></main></div>{TABBAR}<div class="toast" id="toast" role="status" hidden></div>'''
v3 = f'''<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shelfmark — варіант v3</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@500;600&family=Funnel+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>{V3_CSS}</style></head><body>{v3_body}<script>const KEY='sm-v3';{V3_CARDS}{COMMON_JS.replace('__DATA__', DATA).replace('__ICJS__', ICJS)}</script></body></html>'''
B = '/home/user/shelfmark/docs/design-next/home-v2v3'
import os; os.makedirs(B, exist_ok=True)
open(f'{B}/shelfmark-home-v2.html', 'w').write(v2); open(f'{B}/shelfmark-home-v3.html', 'w').write(v3)
print(len(v2) // 1024, len(v3) // 1024)
