import json, urllib.request
UA = {'User-Agent': 'Mozilla/5.0 (preview builder)'}
def get(u, binary=False):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20) as r: d = r.read()
    return d if binary else d.decode('utf-8')
out = [x for x in json.load(open('links.json')) if x['kind'] != 'article']
have = {x['id'] for x in out}
for vid in ['aircAruvnKk', 'PkZNo7MFNFg', 'W6NZfCO5SIk']:
    if vid in have: continue
    try:
        d = json.loads(get(f'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json'))
        img = get(f'https://i.ytimg.com/vi/{vid}/hqdefault.jpg', True); open(f'yt-{vid}.jpg', 'wb').write(img)
        out.append({'kind': 'video', 'id': vid, 'title': d['title'], 'author': d['author_name'], 'url': f'https://www.youtube.com/watch?v={vid}', 'domain': 'youtube.com', 'img': f'yt-{vid}.jpg'})
        print('ok', vid, d['title'], '|', d['author_name'])
    except Exception as e: print('fail', vid, e)
json.dump(out, open('links.json', 'w'), indent=1, ensure_ascii=False)
print(len(out)); print([ (x['id'],x['title']) for x in out])
