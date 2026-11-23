import json, urllib.request, urllib.parse, os
def get(u, binary=False):
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (preview builder)'})
    with urllib.request.urlopen(req, timeout=20) as r:
        d = r.read()
    return d if binary else d.decode('utf-8')
out = []
for vid in ['Ata9cSC2WpM', 'zQnBQ4tB3ZA', 'MBRqu0YOH14', 'OkRrUdxW4wQ', 'rv4LlmLmVWk', 'jNQXAC9IVRw']:
    try:
        d = json.loads(get(f'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json'))
        img = get(f'https://i.ytimg.com/vi/{vid}/hqdefault.jpg', True)
        open(f'yt-{vid}.jpg', 'wb').write(img)
        out.append({'kind': 'video', 'id': vid, 'title': d['title'], 'author': d['author_name'], 'url': f'https://www.youtube.com/watch?v={vid}', 'domain': 'youtube.com', 'img': f'yt-{vid}.jpg'})
        print('ok', vid, d['title'])
    except Exception as e: print('fail', vid, e)
for repo in ['microsoft/playwright', 'excalidraw/excalidraw', 'nrwl/nx', 'tldraw/tldraw']:
    try:
        img = get(f'https://opengraph.githubassets.com/1/{repo}', True)
        fn = 'gh-' + repo.replace('/', '-') + '.png'; open(fn, 'wb').write(img)
        out.append({'kind': 'repo', 'id': repo, 'title': repo, 'url': f'https://github.com/{repo}', 'domain': 'github.com', 'img': fn})
        print('ok', repo, len(img))
    except Exception as e: print('fail', repo, e)
for page in ['Ramen', 'Bauhaus', 'Pancake', 'Dieter_Rams']:
    try:
        d = json.loads(get(f'https://en.wikipedia.org/api/rest_v1/page/summary/{page}'))
        src = (d.get('thumbnail') or {}).get('source') or (d.get('originalimage') or {}).get('source')
        src = src.replace('/320px-', '/800px-') if src and '/320px-' in src else src
        img = get(src, True); ext = src.split('.')[-1].split('?')[0].lower()
        fn = f'wp-{page}.{ext}'; open(fn, 'wb').write(img)
        out.append({'kind': 'article', 'id': page, 'title': d['title'], 'desc': d.get('description', ''), 'extract': d.get('extract', '')[:200], 'url': d['content_urls']['desktop']['page'], 'domain': 'en.wikipedia.org', 'img': fn})
        print('ok', page, d['title'], src)
    except Exception as e: print('fail', page, e)
json.dump(out, open('links.json', 'w'), indent=1, ensure_ascii=False)
