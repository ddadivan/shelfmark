import json, html
B = '/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/overview'
meta = json.load(open(f'{B}/meta.json'))
RU = {
 'today-home-variants-b': 'Главная «Today»: к чему вернуться, куда легли новые ссылки, одна забытая ссылка, ниже вся библиотека.',
 'library-library-library': 'Библиотека: лента карточек, сохранённые виды, фильтр и переключатель видов.',
 'library-library-display': '«Show on cards»: что показывать на карточке — картинку, описание, заметку, теги, сайт, дату.',
 'library-library-site': 'Ссылка открывается прямо внутри Shelfmark.',
 'library-library-reader': 'Режим Reader: чистый текст статьи и настройки чтения.',
 'library-library-blocked': 'Если сайт не даёт себя показать: Reader или новая вкладка.',
 'library-library-empty': 'Пустая библиотека.',
 'save-save-revisit-s-ready': 'Сохранение: превью, куда ляжет и почему, детали сразу открыты.',
 'save-save-revisit-s-many': 'Несколько ссылок за раз.',
 'save-save-revisit-s-dup': 'Уже сохранено: видно где.',
 'save-save-revisit-revisit': 'Revisit: напоминания, недочитанное, забытое, недавно открытое.',
 'save-save-revisit-revisit-empty': 'Revisit, когда ничего не ждёт.',
 'search-search-results': 'Поиск: совпадения по словам, похожее по смыслу, папки и теги, вопрос к AI.',
 'search-search-recent': 'До ввода: недавние запросы и подсказки синтаксиса.',
 'search-search-ask': 'Ask: ответ из твоих же ссылок, с источниками.',
 'search-search-nothing': 'Ничего не найдено по словам, но помогают смысл и Ask.',
 'search-search-page': 'Полная страница результатов, её можно сохранить как вид.',
 'organise-organise-folder': 'Страница папки с подпапками.',
 'organise-organise-select': 'Выбор нескольких ссылок и действия над всеми сразу.',
 'organise-organise-menu': 'Меню папки, переименование и новая папка.',
 'organise-organise-colour': 'Цвет и иконка папки.',
 'organise-organise-tags': 'Теги.',
 'organise-organise-tidy': 'Tidy up: подсказки, дубли и похожие теги в одном месте.',
 'organise-organise-rules': 'Правила: ссылки с сайта сами попадают в нужную папку.',
 'organise-organise-trash': 'Корзина и подтверждение с названием того, что удаляется.',
 'more-select-move-move': 'Перенос в папку.',
 'more-select-move-tags': 'Теги сразу для нескольких ссылок.',
 'more-select-move-side': 'Side by side: перетаскивание ссылок между двумя папками.',
 'more-select-move-unsorted': 'Неразобранное с подсказками AI.',
 'more-select-move-rule-offer': 'После трёх переносов с одного сайта предлагает правило.',
 'more-select-move-related': 'Похожие ссылки в конце статьи в Reader.',
 'data-data-import': 'Импорт закладок из браузера.',
 'data-data-check': 'Импорт: что нашлось и как разложить.',
 'data-data-groups': 'Импорт: папки, предложенные AI.',
 'data-data-done': 'Импорт готов, можно отменить.',
 'data-data-export': 'Экспорт.',
 'data-data-share': 'Публичная ссылка на папку.',
 'settings-settings-appearance': 'Настройки внешнего вида с живым превью карточки.',
 'settings-settings-library': 'Настройки библиотеки.',
 'settings-settings-ai': 'Настройки AI и расход лимита.',
 'settings-settings-account': 'Аккаунт.',
 'firstrun-first-run-onboarding': 'Первый запуск: три способа наполнить полку.',
 'firstrun-first-run-shortcuts': 'Горячие клавиши.',
 'firstrun-first-run-help': 'Справка, что нового, отзыв.',
 'firstrun-first-run-ai-intro': 'Включение AI: что делает и что отправляется.',
 'firstrun-first-run-custom': 'Своя тема с проверкой контраста.',
 'firstrun-first-run-landing': 'Лендинг.',
 'public-public-signin': 'Вход, вокруг плавают карточки.',
 'public-public-collection': 'Чужая публичная папка — так её видят другие.',
 'public-public-404': 'Страница не найдена.',
 'extension-extension-save': 'Расширение: сохранить текущую страницу.',
 'extension-extension-tabs': 'Расширение: сохранить все вкладки.',
 'extension-extension-saved': 'Расширение: сохранено, можно поправить.',
 'extension-extension-ctx': 'Правый клик по любой ссылке на любом сайте.',
 'dark-home-variants-b-dark': 'Today в тёмной теме.',
 'dark-library-library-dark': 'Библиотека, тёмная тема.',
 'dark-library-reader-dark': 'Reader, тёмная тема.',
 'dark-search-ask-dark': 'Ask, тёмная тема.',
 'dark-settings-appearance-dark': 'Настройки, тёмная тема.',
 'phone-home-variants-b-phone': 'Today на телефоне.',
 'phone-library-library-phone': 'Библиотека на телефоне, меню внизу.',
 'phone-save-revisit-s-ready-phone': 'Сохранение на телефоне.',
 'phone-save-revisit-revisit-phone': 'Revisit на телефоне.',
 'phone-settings-you-phone': 'Настройки на телефоне.',
 'phone-select-move-phone-phone': 'Вкладка Library и выбор нескольких ссылок.',
}
SECTIONS = [
 ('today', 'Главная', 'Первый экран отвечает на вопрос «к чему вернуться?», а не «что у меня есть».'),
 ('library', 'Библиотека и просмотр ссылки', 'Все ссылки карточками или списком. Клик открывает сайт внутри приложения, есть режим чтения.'),
 ('save', 'Сохранение и Revisit', 'Сохранить можно вставкой, перетаскиванием или расширением. Revisit возвращает то, что пора открыть.'),
 ('search', 'Поиск и Ask', 'Одно поле: поиск по словам и по смыслу, и вопрос к своей полке.'),
 ('organise', 'Организация', 'Папки, теги, правила, Tidy up и корзина.'),
 ('more', 'Выбор, перенос, Side by side', 'Действия над многими ссылками и раскладка перетаскиванием.'),
 ('data', 'Импорт, экспорт, публичные папки', 'Перенос закладок из браузера и обмен папками.'),
 ('settings', 'Настройки', ''),
 ('firstrun', 'Первый запуск и справка', ''),
 ('public', 'Вход и публичные страницы', ''),
 ('extension', 'Расширение браузера', 'Сохранить страницу, все вкладки или любую ссылку правым кликом.'),
 ('phone', 'На телефоне', 'Меню внизу, меню действий выезжают снизу, поиск на весь экран.'),
 ('dark', 'Тёмная тема', ''),
]
by = {}
for g, name, cap, w, h in meta: by.setdefault(g, []).append((name, w, h))
items = []
def fig(name, w, h, cls=''):
    i = len(items); items.append((name, RU.get(name, '')))
    cap = html.escape(RU.get(name, ''))
    return f'<figure class="shot {cls}"><button type="button" class="open" data-i="{i}" aria-label="Open larger: {cap}"><img src="img/{name}.webp" width="{w}" height="{h}" alt="{cap}" loading="lazy" decoding="async"></button><figcaption>{cap}</figcaption></figure>'
secs = ''
for key, title, desc in SECTIONS:
    lst = by.get(key, [])
    phone = key == 'phone'
    figs = ''.join(fig(n, w, h, 'wide' if (key == 'today') else '') for n, w, h in lst)
    secs += f'<section class="sec" id="{key}"><div class="sec-h"><h2>{title}</h2>{f"<p>{desc}</p>" if desc else ""}<span class="cnt">{len(lst)}</span></div><div class="grid{" phones" if phone else ""}">{figs}</div></section>'
nav = ''.join(f'<a href="#{k}">{t}</a>' for k, t, _ in SECTIONS)
caps = json.dumps([[f'img/{n}.webp', c] for n, c in items], ensure_ascii=False)
page = f'''<title>Shelfmark Next</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600&display=swap">
<style>
/* Layout: one long column of sections, screenshots in a 2-up grid, phones 3-up; Shelfmark's own Graphite tokens */
:root{{--canvas:#F5F5F4;--surface:#FFFFFF;--hover:#EFEFED;--text:#171717;--muted:#5D5D5A;--line:rgba(20,20,22,.08);--line-strong:rgba(20,20,22,.14);--accent:#171717;--on-accent:#fff;--notch:#8DBB86;--focus:#2563EB;--scrim:rgba(20,20,22,.72);--font:"Onest",system-ui,-apple-system,"Segoe UI",sans-serif}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--canvas:#0F0F0F;--surface:#181818;--hover:#222;--text:#EDEDED;--muted:#A1A1A1;--line:rgba(255,255,255,.12);--line-strong:rgba(255,255,255,.2);--accent:#EDEDED;--on-accent:#111;--scrim:rgba(0,0,0,.85);color-scheme:dark}}}}
:root[data-theme="dark"]{{--canvas:#0F0F0F;--surface:#181818;--hover:#222;--text:#EDEDED;--muted:#A1A1A1;--line:rgba(255,255,255,.12);--line-strong:rgba(255,255,255,.2);--accent:#EDEDED;--on-accent:#111;--scrim:rgba(0,0,0,.85);color-scheme:dark}}
*{{box-sizing:border-box}}
body{{background:var(--canvas);color:var(--text);font:400 16px/1.5 var(--font);-webkit-font-smoothing:antialiased}}
.wrap{{max-width:1180px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:40px 80px}}
.brand{{display:flex;align-items:center;gap:10px;font:600 1.13rem/1 var(--font)}}
.hero{{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:40px;margin-top:32px;align-items:start}}
h1{{margin:0;font:600 2.57rem/1.1 var(--font);letter-spacing:-.01em;text-wrap:balance}}
.lead{{margin:16px 0 0;font-size:1.13rem;color:var(--muted);max-width:56ch}}
.note{{margin:16px 0 0;font-size:.875rem;color:var(--muted)}}
.jobs{{display:grid;gap:12px}}
.job{{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px}}
.job b{{display:block;font-weight:600}}
.job span{{font-size:.875rem;color:var(--muted)}}
.diff{{margin-top:40px;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:24px}}
.diff h2{{margin:0 0 12px;font:600 1.27rem/1.25 var(--font)}}
.diff ul{{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px 24px}}
.diff li{{font-size:.9375rem}}
.diff li b{{display:block;font-weight:600}}
.diff li span{{color:var(--muted);font-size:.875rem}}
.nav{{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;margin:24px calc(-1 * max(16px,env(safe-area-inset-left,0px))) 0;padding:10px max(16px,env(safe-area-inset-left,0px));background:color-mix(in srgb,var(--canvas) 94%,transparent);border-bottom:1px solid var(--line);display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}}
body::before{{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:21;background:var(--canvas)}}
.nav a{{flex:none;display:inline-flex;align-items:center;height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--text);text-decoration:none;font-size:.875rem;font-weight:500}}
.nav a:hover{{background:var(--hover)}}
.nav a:focus-visible,.open:focus-visible,button:focus-visible{{outline:2px solid var(--focus);outline-offset:2px}}
.sec{{margin-top:56px;scroll-margin-top:72px}}
.sec-h{{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}}
.sec-h h2{{margin:0;font:600 1.6rem/1.2 var(--font);text-wrap:balance}}
.sec-h p{{margin:0;color:var(--muted);font-size:.9375rem;flex:1 1 320px;min-width:0}}
.sec-h .cnt{{font-size:.75rem;color:var(--muted)}}
.grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:20px;align-items:start}}
.grid.phones{{grid-template-columns:repeat(3,minmax(0,1fr))}}
.shot{{margin:0;min-width:0}}
.shot.wide{{grid-column:1/-1}}
.open{{display:block;width:100%;padding:0;border:1px solid var(--line-strong);border-radius:12px;overflow:hidden;background:var(--surface);cursor:zoom-in}}
.shot:not(.wide) .open{{max-height:520px}}
.grid.phones .open{{max-height:none;border-radius:20px}}
.open img{{display:block;width:100%;height:auto;max-width:100%}}
figcaption{{margin-top:8px;font-size:.875rem;color:var(--muted);line-height:1.45}}
.foot{{margin-top:64px;padding-top:24px;border-top:1px solid var(--line);font-size:.8125rem;color:var(--muted)}}
dialog{{border:0;padding:0;background:transparent;max-width:none;max-height:none;width:100vw;height:100vh;color:#fff}}
dialog::backdrop{{background:var(--scrim)}}
.lb{{height:100%;display:flex;flex-direction:column;padding:calc(12px + env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-left,0px));gap:10px}}
.lb-top{{display:flex;align-items:center;gap:8px}}
.lb-top p{{margin:0;flex:1;min-width:0;font-size:.9375rem}}
.lb-top button{{height:36px;min-width:36px;padding:0 12px;border:1px solid rgba(255,255,255,.25);border-radius:8px;background:rgba(0,0,0,.4);color:#fff;font:500 .875rem/1 var(--font)}}
.lb-img{{flex:1;min-height:0;overflow:auto;border-radius:12px;-webkit-overflow-scrolling:touch}}
.lb-img img{{display:block;width:100%;max-width:1280px;height:auto;margin:0 auto}}
.lb-img.ph img{{max-width:420px}}
@media (max-width:52em){{.hero{{grid-template-columns:1fr;gap:24px}}h1{{font-size:2.03rem}}}}
@media (max-width:40em){{.grid{{grid-template-columns:1fr;gap:20px}}.grid.phones{{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}}.wrap{{padding-block:24px 64px}}}}
</style>
<div class="wrap">
<div class="brand"><svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="4" fill="var(--accent)"/><path d="M14 4h5v8l-2.5-2-2.5 2z" fill="var(--notch)"/></svg>Shelfmark</div>
<nav class="nav" aria-label="Разделы">{nav}</nav>
{secs}
<p class="foot">Shelfmark Next — дизайн-концепт. Интерфейс на английском, переводы приходят через ключи. Тексты, ссылки и цифры на скриншотах — примеры.</p>
</div>
<dialog id="lb" aria-label="Скриншот"><div class="lb"><div class="lb-top"><button type="button" id="lb-prev" aria-label="Предыдущий">←</button><button type="button" id="lb-next" aria-label="Следующий">→</button><p id="lb-cap"></p><button type="button" id="lb-close">Закрыть</button></div><div class="lb-img" id="lb-box"><img id="lb-img" alt=""></div></div></dialog>
<script>
(function(){{const C={caps};const d=document.getElementById('lb'),img=document.getElementById('lb-img'),cap=document.getElementById('lb-cap'),box=document.getElementById('lb-box');let i=0;
function show(n){{i=(n+C.length)%C.length;img.src=C[i][0];img.alt=C[i][1];cap.textContent=C[i][1];box.classList.toggle('ph',C[i][0].includes('-phone'));box.scrollTop=0}}
document.addEventListener('click',e=>{{const b=e.target.closest('.open');if(!b)return;show(+b.dataset.i);if(d.showModal)d.showModal();else d.setAttribute('open','')}});
document.getElementById('lb-close').onclick=()=>d.close();document.getElementById('lb-prev').onclick=()=>show(i-1);document.getElementById('lb-next').onclick=()=>show(i+1);
d.addEventListener('keydown',e=>{{if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)}});
d.addEventListener('click',e=>{{if(e.target===d||e.target.classList.contains('lb'))d.close()}});}})();
</script>
'''
open(f'{B}/index.html', 'w').write(page)
print('ok', len(page), len(items))
