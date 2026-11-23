import json, re
B='/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad'
src=open(f'{B}/v2f/src.html').read()
m=re.search(r'const L = (\[.*?\]), IC = ', src, re.S); V=json.loads(m.group(1))
FOLD={'Angular':('Angular','clay'),'Інструменти':('Tools','ocean'),'Навчання':('Learning','sage'),'Покупки':('Shopping','rose'),'Подивитися':('Watch later','plum')}
NOTE={'Почати звідси, перш ніж братися за Signal Forms':'Start here before Signal Forms','Розмір 39, на весну':'Size 39, for spring','Чекаю на знижку':'Waiting for the sale','На вихідні, з чаєм':'For the weekend, with tea','Для схем у документації':'For diagrams in the docs','Глави 1–4, по одній на вечір':'Chapters 1–4, one an evening'}
AGO={'сьогодні':'Today','вчора':'Yesterday','3 лист.':'Nov 3','2 лист.':'Nov 2','31 жовт.':'Oct 31','29 жовт.':'Oct 29','28 жовт.':'Oct 28','27 жовт.':'Oct 27','24 жовт.':'Oct 24','22 жовт.':'Oct 22','20 жовт.':'Oct 20','18 жовт.':'Oct 18','15 жовт.':'Oct 15'}
TAGT={'взуття':'shoes','одяг':'clothes'}
TYPE={'video':'videos','repo':'repos','shop':'shops'}
DUR=['2:14','','','','6:20','2:31','','','18:40','15:01','','','48:17','']
SUM={1:'A two-minute tour of Angular: components, signals and the CLI.',9:'What neurons, layers and weights are, drawn step by step.',5:'Why a vast, uncaring universe can still be a reason to enjoy life.'}
out=[]
for i,l in enumerate(V,1):
    f,c=FOLD[l['folder']]
    o=dict(id=i,kind=l['kind'],title=l['title'],domain=l['domain'],sub=l['sub'],img=l['img'],ratio=l['ratio'],folder=f,c=c,tags=[TAGT.get(t,t) for t in l['tags']],date=AGO.get(l['ago'],l['ago']),type=TYPE[l['kind']])
    if l.get('fav'): o['fav']=True
    if l.get('note'): o['note']=NOTE.get(l['note'],l['note'])
    if DUR[i-1]: o['dur']=DUR[i-1]
    if i in SUM: o['summary']=SUM[i]
    if l['kind']=='shop': o['price']=l['sub'].split(' · ')[0]
    out.append(o)
js='['+','.join(json.dumps(o,ensure_ascii=False) for o in out)
p=f'{B}/design4/library.html'; s=open(p).read()
a=s.index('  const L=[\n'); b=s.index('  ];\n',a)+5
old=s[a:b]
keep=[ln for ln in old.split('\n') if re.match(r"\s*\{id:(3|7|8),",ln)]
keep=[k.replace('{id:3,','{id:15,').replace('{id:7,','{id:17,').replace('{id:8,','{id:16,').rstrip(',') for k in keep]
keep=[re.sub(r"folder:'Design',c:'plum'","folder:'Learning',c:'sage'",k) for k in keep]
keep=[re.sub(r"folder:'Angular',c:'clay'","folder:'Angular',c:'clay'",k) for k in keep]
keep=[re.sub(r"folder:'Reading',c:'graphite'","folder:'Learning',c:'sage'",k) for k in keep]
keep=[re.sub(r"date:'[^']*'",d,k) for k,d in zip(keep,["date:'Oct 12'","date:'Oct 14'","date:'Oct 10'"])]
s=s[:a]+'  const L='+js+',\n'+',\n'.join(keep)+'\n  ];\n'+s[b:]
def rep(x,y):
    global s
    assert x in s, x[:60]; s=s.replace(x,y,1)
rep("const FOLDERS=[['Clothes',7,'rose'],['Recipes',7,'amber'],['Design',5,'plum'],['Work',7,'ocean'],['Courses',4,'sage']];","const FOLDERS=[['Angular',2,'clay'],['Tools',4,'ocean'],['Learning',6,'sage'],['Shopping',4,'rose'],['Watch later',1,'plum']];")
rep("const TAGS=[['angular',12],['reading',8],['clothes',7],['design',5]];","const TAGS=[['video',6],['design',2],['angular',1],['clothes',2],['shoes',2]];")
rep("const CHIPS=[['all','All',58],['videos','Videos',8],['articles','Articles',23],['clothes','Clothes',7],['recipes','Recipes',7]];","const CHIPS=[['all','All',17],['videos','Videos',6],['repos','Repositories',4],['shops','Shops',4],['articles','Articles',3]];")
rep("const BACK=[{id:2,why:'You asked to check the sale',k:'due',i:'i-bell'},{id:8,why:'40% read · 4 min left',k:'',i:'i-text',p:40},{id:1,why:'Stopped at 12:40 of 19:42',k:'',i:'i-play',p:64}];",
    "const BACK=[{id:4,why:'You asked to check the sale',k:'due',i:'i-bell'},{id:16,why:'40% read · 4 min left',k:'',i:'i-text',p:40},{id:9,why:'Stopped at 6:20 of 18:40',k:'',i:'i-play',p:34}];")
rep("const WEEK=[{id:4,to:'Recipes',c:'amber',by:'rule'},{id:9,to:'Clothes',c:'rose',by:'AI'},{id:18,to:'Courses',c:'sage',by:''},{id:16,to:'Unsorted',c:'graphite',by:''}];",
    "const WEEK=[{id:1,to:'Angular',c:'clay',by:'rule'},{id:2,to:'Shopping',c:'rose',by:'AI'},{id:3,to:'Tools',c:'ocean',by:''},{id:13,to:'Unsorted',c:'graphite',by:''}];")
rep("const g=byId(10)||L[4];","const g=byId(5)||L[4];")
s=s.replace("You saved it with “for a lazy Sunday”. It’s Sunday in six days.","You saved it “for the weekend, with tea”. It’s Saturday in five days.")
s=s.replace("Saved 5 months ago · never opened","Saved 3 weeks ago · never opened")
s=s.replace("Remind me Sunday","Remind me Saturday").replace("Reminder set for Sunday","Reminder set for Saturday")
s=s.replace("S.sel=new Set(v==='select'?[1,4,10]:[]);","S.sel=new Set(v==='select'?[1,4,7]:[]);")
s=s.replace("if(v==='reader'){S.link=8;S.mode='reader'}else if(v==='site'){S.link=1;S.mode='site'}else if(v==='blocked'){S.link=3;S.mode='site'}","if(v==='reader'){S.link=16;S.mode='reader'}else if(v==='site'){S.link=1;S.mode='site'}else if(v==='blocked'){S.link=15;S.mode='site'}")
s=s.replace("const SUB={Recipes:[['Ramen',3],['Baking',2]],Work:[['Angular',6],['Clients',1]],Clothes:[['Shoes',2]]};","const SUB={Learning:[['Courses',2],['Talks',1]],Shopping:[['Shoes',2]]};")
s=s.replace("let OPEN=new Set(['Recipes'])","let OPEN=new Set(['Learning'])")
# images in art and cover, coloured favicons
rep("  function art(l){switch(l.kind){","  function art(l){if(l.img)return `<img src=\"${l.img}\" alt=\"\" loading=\"lazy\" style=\"width:100%;height:100%;object-fit:${l.kind==='shop'?'contain':'cover'};display:block${l.kind==='repo'?';object-position:left center':''}\">`;switch(l.kind){")
rep("  function coverInner(l){","  function coverInner(l){\n    if(l.img)return art(l)+(l.kind==='video'?`<span class=\"glass gplay\" aria-hidden=\"true\">${ic('i-play',12)}</span>`:'');")
rep("  const letter=l=>l.domain[0].toUpperCase();","  const letter=l=>l.domain[0].toUpperCase();\n  const FAVC={'youtube.com':['#FF0033','#fff'],'github.com':['#1F2328','#fff'],'allbirds.com':['#212A2F','#fff'],'taylorstitch.com':['#8A5A2B','#fff']};\n  const favi=l=>{const f=FAVC[l.domain];return `<span class=\"fav\"${f?` style=\"background:${f[0]};color:${f[1]}\"`:''}>${letter(l)}</span>`};")
open(p,'w').write(s)
print('ok', len(s)//1024,'KB')
