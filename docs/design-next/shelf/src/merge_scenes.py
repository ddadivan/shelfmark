import json, re
B = '/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad'
old = json.load(open(f'{B}/dsgen4/scenes.json')); il = json.load(open(f'{B}/dsgen4/illus.json'))
DISC = '<circle class="il-disc" cx="120" cy="75" r="70"/>'
def withdisc(svg): return re.sub(r'^<svg class="sm-scene"([^>]*)>', lambda m: f'<svg class="sm-scene sm-scene--il"{m.group(1)}>' + DISC, svg, count=1)
M = {'empty-library': 'welcome-collect', 'nothing-found': 'not-found', 'offline': 'offline', 'empty-trash': 'empty-trash', 'not-found': 'page-not-found'}
out = {}
for k, v in old.items(): out[k] = il[M[k]] if k in M else withdisc(v)
for k in ['empty-folder', 'empty-favorites', 'empty-unsorted', 'empty-tags', 'empty-filter', 'empty-recent', 'empty-feed', 'welcome-save', 'welcome-find']: out[k] = il[k]
json.dump(out, open(f'{B}/dsgen4/scenes_v3.json', 'w'), ensure_ascii=False)
USE = [('empty-library', 'The empty library (first run): links fly onto the shelf'), ('empty-feed', 'An empty view or saved view'), ('empty-folder', 'A folder with nothing in it'),
 ('nothing-found', 'Search with no results'), ('empty-filter', 'Filters that match nothing'), ('empty-favorites', 'No favorites yet'), ('empty-unsorted', 'Unsorted is empty: everything is filed'),
 ('empty-tags', 'No tags yet'), ('empty-recent', 'Nothing opened recently'), ('empty-trash', 'Trash is empty: the lid lifts'), ('revisit-done', 'Revisit and Today with nothing waiting'),
 ('offline', 'No connection'), ('error', 'A load or save failed'), ('site-blocked', 'Link page when the site refuses framing'), ('reader-unavailable', 'Reader can’t extract the text'),
 ('not-found', 'Unknown address (404)'), ('saved', 'The saved-link moment'), ('welcome-save', 'Onboarding: saving a link'), ('welcome-find', 'Onboarding: finding it again')]
cards = ''.join(f'<div class="sm-scene-card"><div class="host">{out[k]}</div><b>{k}</b><span>{u}</span></div>' for k, u in USE)
preview = f'''<!-- @dsCard group="Feedback" height=900 subtitle="{len(USE)} scenes on a sage disc; play once, hold" -->
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>StateScene</title></head><body>
<div class="sm-root" style="flex-direction:column;align-items:stretch">
<button class="sm-btn sm-btn--secondary sm-btn--sm" type="button" id="replay" style="align-self:flex-start">Replay</button>
<div class="sm-scenes">{cards}</div></div>
<script>document.getElementById('replay').addEventListener('click',()=>document.querySelectorAll('.host').forEach(h=>{{h.innerHTML=h.innerHTML}}))</script>
</body></html>'''
open(f'{B}/ds4/project/components/StateScene/preview.html', 'w').write(preview)
rows = '\n'.join(f'| `{k}` | {u} |' for k, u in USE)
readme = f'''# StateScene
An animated scene that shows what a state means: an empty space, nothing found, offline, an error, a site that can't be shown, a finished queue.

**Source:** the scenes of the shipped Shelfmark (`ui-illustration` in `libs/ui`), redrawn in the v3 look: white cards with a faint edge, sage key parts (`ai`, `ai-bg`), graphite ink, the brand notch. The site, reader, error, revisit and saved scenes are Shelfmark Next additions in the same style.
**Stand out, softly:** every scene sits on a sage disc (`ai-bg` at 75%) that pops in first, so an empty page reads as a deliberate state and not a blank.
**Sizes:** 240×150 on pages and empty states, 160×100 (`sm-scene--sm`) inside panels and the Link page.
**Motion:** plays once when the state appears: the disc pops (600 ms spring), then the scene's move runs (1.8 s: cards fly in, the trash lid lifts, the lens scans, a card bobs) and holds the last frame. No loops. Reduced motion shows the last frame.

## Scenes
| Scene | Use |
| --- | --- |
{rows}

## Rules
- Always with a heading and one sentence that say the same in words; the scene is `role="img"` with that heading as its name.
- One scene per state; never decoration on a normal screen.
- Colours only from tokens, so both themes work.

## In code
`ui-illustration` (`name`, `motion="once"`): restyle its token classes to these values and add the disc; the new scenes are added to `ILLUSTRATION_NAMES`.
'''
open(f'{B}/ds4/project/components/StateScene/README.md', 'w').write(readme)
print(len(out))
