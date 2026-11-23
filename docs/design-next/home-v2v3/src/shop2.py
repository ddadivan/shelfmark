import json, urllib.request
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
def get(u, binary=False):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25) as r: d = r.read()
    return d if binary else d.decode('utf-8')
d = json.loads(get('https://www.allbirds.com/products.json?limit=250'))
shoes = [p for p in d['products'] if p.get('product_type','').lower() in ('shoes','sneakers','footwear') and p.get('images')]
pick = []
for kw in ['Tree Runner', 'Wool Runner', 'Tree Dasher']:
    m = [p for p in shoes if kw.lower() in p['title'].lower()]
    if m: pick.append(('www.allbirds.com', m[0])); 
print('shoes', len(shoes), [p['title'] for _, p in pick])
ts = json.loads(get('https://www.taylorstitch.com/products.json?limit=12'))['products']
for kw in ['Ojai Jacket', 'Crater Shirt in Denver Plaid', 'Mariner Jean']:
    m = [p for p in ts if kw.lower() in p['title'].lower()]
    if m: pick.append(('www.taylorstitch.com', m[0]))
out = []
for host, p in pick[:5] if len(pick) > 5 else pick:
    src = p['images'][0]['src']; src = src + ('&' if '?' in src else '?') + 'width=900'
    img = get(src, True); fn = 'shop-' + p['handle'][:40] + '.jpg'; open(fn, 'wb').write(img)
    out.append({'kind': 'shop', 'id': p['handle'], 'title': p['title'], 'url': f'https://{host}/products/{p["handle"]}', 'domain': host.replace('www.', ''), 'price': p['variants'][0]['price'], 'img': fn})
    print('ok', host, p['title'], p['variants'][0]['price'], len(img))
json.dump(out, open('shop_pick.json', 'w'), indent=1)
