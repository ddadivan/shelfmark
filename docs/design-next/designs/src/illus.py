# Ports the shipped Shelfmark illustration scenes (libs/ui illustration component) into the
# design system: same drawings and play-once moves, v3 colours (sage key parts, graphite ink),
# on a soft sage disc. Writes dsgen/illus.json (name -> svg) and dsgen/illus.css.
import re, json
SRC = '/home/user/shelfmark/libs/ui/src/lib/components/illustration/illustration.component.html'
OUT = '/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad/dsgen'
t = open(SRC).read()
LABEL = {'welcome-collect': 'Links gathering on your shelf', 'welcome-save': 'A link being saved', 'welcome-find': 'Finding a saved link',
 'empty-feed': 'Nothing here yet', 'empty-folder': 'This folder is empty', 'not-found': 'Nothing found', 'page-not-found': 'Page not found',
 'offline': 'You are offline', 'empty-trash': 'Trash is empty', 'empty-recent': 'Nothing opened recently', 'empty-favorites': 'No favorites yet',
 'empty-unsorted': 'Everything is sorted', 'empty-tags': 'No tags yet', 'empty-filter': 'Nothing matches these filters'}
scenes = {}
for m in re.finditer(r"@case \('([a-z-]+)'\) \{(.*?)\n    \}", t, re.S):
    name, body = m.group(1), m.group(2)
    body = re.sub(r'\s+', ' ', body).strip()
    body = re.sub(r'\s*/>', '/>', body)
    body = body.replace('ui-illustration__', 'il-')
    body = re.sub(r'<(\w+) ', r'<\1 ', body)
    scenes[name] = (f'<svg class="sm-scene sm-scene--il" viewBox="0 0 240 150" role="img" aria-label="{LABEL.get(name, name)}">'
                    f'<circle class="il-disc" cx="120" cy="75" r="70"/>{body}</svg>')
assert len(scenes) == 14, scenes.keys()
json.dump(scenes, open(f'{OUT}/illus.json', 'w'), ensure_ascii=False, indent=0)
CSS = r'''
/* Illustrations: the shipped Shelfmark scenes in the v3 look. Sage key parts on a soft sage disc,
   graphite ink, white cards with a faint edge. They play once (1.8 s) and hold the last frame;
   reduced motion shows the last frame. */
.sm-scene--il .il-disc{fill:var(--ai-bg);opacity:.75}
.il-surface{fill:var(--surface);stroke:var(--control);stroke-opacity:.45;stroke-width:1}
.il-surface--accent{stroke:var(--ai);stroke-opacity:1}
.il-ink{fill:var(--text)}
.il-accent{fill:var(--ai)}
.il-tint{fill:var(--ai-bg)}
.il-tint--key{fill:color-mix(in srgb,var(--ai) 22%,var(--surface));stroke:var(--ai);stroke-opacity:.55;stroke-width:1.5}
.il-line,.il-line--ground{fill:var(--surface-pressed)}
.il-mark{fill:var(--brand-notch)}
.il-plus{fill:var(--surface)}
.il-dash{stroke:var(--control)}
.il-search{stroke:var(--text-muted)}
.il-halo{fill:var(--ai-bg);opacity:.9}
.il-lens{fill:var(--surface);stroke:var(--text)}
.sm-scene--il *{transform-box:view-box;transform-origin:0 0}
.sm-scene--il .il-fly,.sm-scene--il .il-grow,.sm-scene--il .il-type,.sm-scene--il .il-dim,.sm-scene--il .il-pick,.sm-scene--il .il-shift,.sm-scene--il .il-disc{transform-box:fill-box;transform-origin:center}
.sm-scene--il .il-type{transform-origin:left center}
.il-fly--1{--ill-x:-129%;--ill-y:-83%;--ill-r:-14deg}
.il-fly--2{--ill-x:-167%;--ill-y:94%;--ill-r:12deg;--ill-delay:.08s}
.il-fly--3{--ill-x:-63%;--ill-y:133%;--ill-r:-8deg;--ill-delay:.16s}
.il-fly--4{--ill-x:-200%;--ill-y:-17%;--ill-r:18deg;--ill-delay:.24s}
.il-fly--sweep{--ill-x:0%;--ill-y:0%;--ill-r:-140deg}
.il-dim{--ill-from:1;--ill-to:.35;opacity:.35}
.il-dim--soft{--ill-to:.55;opacity:.55}
.il-pick{--ill-from:.35;--ill-to:1}
.il-shift--bob{--ill-dy:-23%}.il-shift--lift{--ill-dy:-45%}.il-shift--dip{--ill-dy:30%}.il-shift--scan{--ill-dx:45%}
.il-shift--nudge{--ill-dy:14%}.il-shift--toward{--ill-dx:9%}.il-shift--away{--ill-dx:-9%}
.sm-scene--il .il-disc{animation:il-disc 600ms cubic-bezier(.34,1.56,.64,1) both}
.sm-scene--il .il-fly{animation:il-fly 1.8s cubic-bezier(.2,.8,.2,1) var(--ill-delay,0s) 1 both}
.sm-scene--il .il-grow{animation:il-grow 1.8s cubic-bezier(.2,.8,.2,1) var(--ill-delay,0s) 1 both}
.sm-scene--il .il-type{animation:il-type 1.8s cubic-bezier(.2,.8,.2,1) var(--ill-delay,0s) 1 both}
.sm-scene--il .il-dim,.sm-scene--il .il-pick{animation:il-fade 1.8s ease-in-out var(--ill-delay,0s) 1 both}
.sm-scene--il .il-shift{animation:il-shift 1.8s ease-in-out var(--ill-delay,0s) 1 both}
@keyframes il-disc{from{opacity:0;transform:scale(.6)}to{opacity:.75;transform:none}}
@keyframes il-fly{0%,10%{transform:translate(var(--ill-x),var(--ill-y)) rotate(var(--ill-r))}45%,100%{transform:none}}
@keyframes il-grow{0%,20%{opacity:0;transform:translateY(-47%) scale(.3)}50%,100%{opacity:1;transform:none}}
@keyframes il-type{0%,10%{transform:scaleX(0)}35%,100%{transform:scaleX(1)}}
@keyframes il-fade{0%,30%{opacity:var(--ill-from)}50%,100%{opacity:var(--ill-to)}}
@keyframes il-shift{0%,100%{transform:none}50%{transform:translate(var(--ill-dx,0),var(--ill-dy,0))}}
@media (prefers-reduced-motion:reduce){.sm-scene--il *{animation:none!important}}
'''
open(f'{OUT}/illus.css', 'w').write(CSS)
print(sorted(scenes))
