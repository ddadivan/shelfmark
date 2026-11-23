import json, re, sys
sys.path.insert(0, '/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/dsgen')
B = '/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad'
tok = json.load(open(f'{B}/ds4/project/tokens.json'))
def colors(theme): return ';'.join(f"--{c['name']}:{c['value'][theme]}" for c in tok['color']['tokens'])
def shadows(theme): return ';'.join(f"--{s['name']}:{s['value'][theme]}" for s in tok['shadow']['tokens'])
other = []
for fam in ['spacing', 'radius', 'size', 'duration', 'breakpoint']:
    other += [f"--{t['name']}:{t['value']}" for t in tok[fam]['tokens']]
other += [f"--font-{k}:{v}" for k, v in tok['type']['families'].items()]
css = (f":root{{{colors('light')};{shadows('light')};{';'.join(other)}}}\n"
       f"@media (prefers-color-scheme: dark){{:root:not([data-theme=\"light\"]){{{colors('dark')};{shadows('dark')};color-scheme:dark}}}}\n"
       f":root[data-theme=\"dark\"]{{{colors('dark')};{shadows('dark')};color-scheme:dark}}\n")
bundle = open(f'{B}/ds4/project/components/bundle.css').read()
scenes = json.load(open(f'{B}/dsgen4/scenes_v3.json'))
exec(open(f'{B}/dsgen4/gen.py').read().split('# ---------- icons as inline helpers ----------')[1].split('def ic(')[0])  # defines I
I['up'] = '<path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>'
art = {
 'video': '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="180" fill="#1f2433"/><circle cx="230" cy="64" r="52" fill="#3d4f8f"/><path d="M0 132 80 96l70 28 80-40 90 34v62H0z" fill="rgba(0,0,0,.28)"/></svg>',
 'video2': '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="180" fill="#2a2135"/><circle cx="90" cy="64" r="52" fill="#6a4f93"/><path d="M0 132 80 96l70 28 80-40 90 34v62H0z" fill="rgba(0,0,0,.28)"/></svg>',
 'shirt': '<svg viewBox="0 0 200 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="250" fill="#ece7de"/><path d="M62 50 88 38l12 14 12-14 26 12 34 46-17 16-14-12v130H59V100l-14 12-17-16z" fill="#6d5b46"/></svg>',
 'jacket': '<svg viewBox="0 0 200 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="250" fill="#e8ebee"/><path d="M60 48 84 36q16 10 32 0l24 12 32 50-18 14-12-10v128H58V102l-12 10-18-14z" fill="#2f4c6b"/><path d="M58 92h84M58 124h84M58 156h84M58 188h84" stroke="rgba(255,255,255,.18)" stroke-width="3"/></svg>',
 'pancakes': '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="200" fill="#efe4d2"/><circle cx="100" cy="106" r="80" fill="#fbf7ef"/><circle cx="104" cy="100" r="46" fill="#e4b46b"/><circle cx="110" cy="94" r="44" fill="#ecc27c"/><circle cx="110" cy="92" r="16" fill="#fff6dc"/></svg>',
 'bowl': '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="200" fill="#2e2620"/><circle cx="100" cy="104" r="78" fill="#1d1814"/><circle cx="100" cy="104" r="62" fill="#e9d3a8"/><path d="M58 96q20-14 40 0t40 0M56 112q22-14 44 0t44 0" fill="none" stroke="#f1d99a" stroke-width="5" stroke-linecap="round"/><circle cx="122" cy="82" r="14" fill="#fff8ec"/><circle cx="122" cy="82" r="7" fill="#f2a93b"/></svg>',
}
# v4 images
_im = lambda f, fit='cover': f'<img src="img/{f}" alt="" style="display:block;width:100%;height:100%;object-fit:{fit};background:var(--surface-hover)">'
art.update({'bowl': _im('tree-runners.webp', 'contain'), 'pancakes': _im('nihilism.webp'), 'video': _im('angular100.webp'), 'video2': _im('nihilism.webp'), 'shirt': _im('crater-shirt.webp', 'contain'), 'jacket': _im('ojai-jacket.webp', 'contain')})
tpl = open(f'{B}/design4/g2.tpl.html').read()
icon = lambda n, s: f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" aria-hidden="true">{I[n]}</svg>'
for key, (n, s) in {'%bookmark%': ('bookmark', 20), '%inbox%': ('inbox', 20), '%star%': ('star', 20), '%revisit%': ('revisit', 20), '%folder%': ('folder', 14), '%search%': ('search', 16), '%plus%': ('plus', 16),
                    '%bookmark20%': ('bookmark', 20), '%revisit20%': ('revisit', 20), '%plus24%': ('plus', 24), '%search20%': ('search', 20), '%user20%': ('user', 20)}.items():
    tpl = tpl.replace(key, icon(n, s))
out = (tpl.replace('/*BUNDLE*/', bundle).replace('/*TOKENS*/', css)
       .replace('/*ICONS*/', json.dumps(I)).replace('/*SCENES*/', json.dumps({'revisit-done': scenes['revisit-done']})).replace('/*ART*/', json.dumps(art)))
# shared shell from build_pages: v3 sidebar, search with Ask inside, shell CSS
_bp = {}
exec(open(f'{B}/dsgen4/build_pages.py').read().split('def page(')[0], _bp)
side = _bp['sidebar']('').replace('<button class="sm-nav" type="button" title="Today">', '<button class="sm-nav" type="button" data-go="revisit" title="Today">', 1).replace('<button class="sm-nav" type="button" title="All links">', '<button class="sm-nav" type="button" data-go="library" title="All links">', 1)
out = re.sub(r'<nav class="side[^"]*" aria-label="Library">.*?</nav>', lambda m: side, out, count=1, flags=re.S)
srch = _bp['TOP'].split('<div class="right">')[0].replace('<header class="top">', '')
out = re.sub(r'<label class="sm-input sm-search sm-l1">.*?</label><a class="sm-btn sm-btn--secondary" href="ask.html".*?</a>', lambda m: srch, out, count=1, flags=re.S)
out = out.replace('</style>', _bp['SHELL_CSS'] + '</style>', 1)
# v4: right block of the old header goes (Add link and avatar live in the sidebar)
out = re.sub(r'<div class="right">\s*<button class="sm-btn sm-btn--primary add-btn"[^>]*>.*?</button>\s*<button class="avatar"[^>]*>DU</button>\s*</div>', '', out, count=1, flags=re.S)
out = out.replace('<button class="sm-btn sm-btn--primary add-btn" type="button">', '<button class="sm-btn sm-btn--primary add-btn" type="button" id="add" aria-expanded="false" aria-controls="save">', 1)
out = out.replace('</style>', _bp['LC_CSS'] + '</style>', 1)
out = out.replace('</body>', _bp['SEARCH_JS'] + '</body>', 1)
open(f'{B}/design4/save-revisit.html', 'w').write(out)
print('ok', len(out))
