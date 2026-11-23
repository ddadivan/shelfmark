import re
B='/tmp/claude-0/-home-user-shelfmark/ebcb0130-eb79-5d11-ad3d-48330e17911a/scratchpad'
p=f'{B}/design4/library.html'; s=open(p).read()
def rep(a,b,cnt=1):
    global s
    assert a in s, 'MISSING: '+a[:90]; s=s.replace(a,b,cnt)
U=lambda i,n=16: f'<svg width="{n}" height="{n}" aria-hidden="true"><use href="#{i}"/></svg>'
SUN='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/></svg>'
DOWN='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>'
CLOCK='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
LOGO='<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4" fill="currentColor"/><path d="M14 4v7l2.5-1.8L19 11V4z" fill="var(--side-bg)"/></svg>'
# ---- sidebar
a=s.index('<nav class="side l1" aria-label="Library">'); b=s.index('</nav>',a)+6
old=s[a:b]
pinned=old[old.index('<div class="sec"><button class="sec-t" type="button" aria-expanded="true" data-sec="pinned">'):old.index('<div class="side-foot">')]
pinned=pinned.replace('<span class="lbl">Angular</span><span class="n">6</span>','<span class="lbl">Angular</span><span class="n">2</span>').replace('Neon free plan limits','Excalidraw')
side=f'''<nav class="side l1" aria-label="Library">
    <div class="brandrow"><div class="logo">{LOGO}<span>Shelfmark</span></div><button class="avatar" type="button" id="avatar" data-pop="account" aria-haspopup="menu" aria-label="Account, theme, shortcuts and help">DU</button></div>
    <div class="sbtop"><button class="btn add-btn" type="button" id="add">{U('i-plus')}<span>Add link</span></button></div>
    <div class="grp">
    <button class="nav" type="button" data-scope="all" title="All links">{U('i-bookmark')}<span class="lbl">All links</span><span class="n">17</span></button>
    <button class="nav" type="button" data-scope="unsorted" title="Unsorted">{U('i-inbox')}<span class="lbl">Unsorted</span><span class="n">3</span></button>
    <button class="nav" type="button" data-scope="favorites" title="Favorites">{U('i-star')}<span class="lbl">Favorites</span><span class="n">3</span></button>
    <button class="nav" type="button" data-scope="today" title="Today: 3 to come back to">{U('i-revisit')}<span class="lbl">Today</span><span class="dot">3</span><span class="dot-rail rail-only" aria-hidden="true"></span></button>
    <a class="nav" href="tools.html" title="Recently opened">{CLOCK}<span class="lbl">Recently opened</span></a>
    </div>
    <div class="grp">{pinned}</div>
    <div class="side-foot">
      <aside class="intro"><a href="tools.html">New here? See how it works</a><span class="t">{U('i-play',12)}3 minutes</span><button class="ib x" type="button" aria-label="Hide" data-hide-intro>{U('i-x',14)}</button></aside>
      <button class="nav" type="button" data-theme-toggle title="Theme">{SUN}<span class="lbl">Theme</span></button>
      <button class="nav" type="button" title="Get the extension">{DOWN}<span class="lbl">Get the extension</span></button>
      <button class="nav" type="button" data-pop="help" title="Data and help">{U('i-more')}<span class="lbl">Data and help</span></button>
      <button class="nav" type="button" title="Trash">{U('i-trash')}<span class="lbl">Trash</span></button>
    </div>
  </nav>'''
s=s[:a]+side+s[b:]
# the pinned/folders/tags block contains three sections; wrap folders and tags in their own .grp for dividers
s=s.replace('<div class="sec"><button class="sec-t" type="button" aria-expanded="true" data-sec="folders">','</div><div class="grp"><div class="sec"><button class="sec-t" type="button" aria-expanded="true" data-sec="folders">',1)
s=s.replace('<div class="sec"><button class="sec-t" type="button" aria-expanded="true" data-sec="tags">','</div><div class="grp"><div class="sec"><button class="sec-t" type="button" aria-expanded="true" data-sec="tags">',1)
# ---- header
a=s.index('<header class="top">'); b=s.index('</header>',a)+9
hdr=s[a:b]
srch=hdr[hdr.index('<div class="search l1"'):hdr.index('<a class="ask-in"')]
srch=srch.replace('placeholder="Search your links" aria-label="Search your links"','placeholder="Search links, folders and tags" aria-label="Search links, folders and tags"')
s=s[:a]+f'''<header class="top">
      {srch}</div>
      <a class="btn ask-top" href="ask.html" title="Ask your shelf (Ctrl J)">{U('i-spark')}<span>Ask</span></a>
    </header>'''+s[b:]
# ---- toolbar in libraryHTML
a=s.index('<div class="tools"><button class="btn sm" type="button" data-pop="filter"'); b=s.index('</div></div>\n      <div class="views"',a)
s=s[:a]+'''<div class="tools"><button class="cfgbtn" type="button" data-pop="cfg" aria-haspopup="dialog" aria-label="Card display">View</button>
      <div class="viewsw" role="group" aria-label="View">${VIEWS.slice(0,3).map(([id,lab,i])=>`<button type="button" data-view="${id}" aria-pressed="${S.view===id}" aria-label="${lab}" title="${lab}">${ic(i,16)}</button>`).join('')}</div>
      <button class="ib" type="button" data-pop="more" aria-haspopup="menu" aria-label="Sort, filter, select, side by side, export" title="More">${ic('i-more',16)}</button>'''+s[b:]
rep('<h1>${qq?\'Search\':scopeTitle()}</h1><span class="count">${qq?','<h1>${qq?\'Search\':scopeTitle()}</h1><span class="count"${qq?\'\':\' hidden\'}>${qq?')
# masonry/grid with --cw
rep("feed=`<div class=\"${g?'grid':'masonry'} sz-${S.size}\">","feed=`<div class=\"${g?'grid':'masonry'}\" style=\"--cw:${CW[S.step]}px\">")
rep("const nearHTML=near.length?`<section class=\"q-near\" aria-label=\"Close in meaning\"><h2>${ic('i-spark',16)}Close in meaning <span class=\"count\">${near.length}</span></h2><div class=\"${S.view==='grid'?'grid':'masonry'} sz-${S.size}\">",
    "const nearHTML=near.length?`<section class=\"q-near\" aria-label=\"Close in meaning\"><h2>${ic('i-spark',16)}Close in meaning <span class=\"count\">${near.length}</span></h2><div class=\"${S.view==='grid'?'grid':'masonry'}\" style=\"--cw:${CW[S.step]}px\">")
# state: step + show
rep("const SHOW_DEF={image:true,desc:true,note:true,tags:false,site:true,date:false};","const SHOW_DEF={image:true,desc:false,note:true,tags:true,site:true,date:true,folder:true};const CW=[130,160,190,220,260,300];")
rep("const S={size:'m',","const S={step:3,size:'m',")
rep("if(v.size)S.size=v.size;","if(v.size)S.size=v.size;if(typeof v.step==='number')S.step=v.step;")
rep("JSON.stringify({size:S.size,view:S.view,","JSON.stringify({step:S.step,size:S.size,view:S.view,")
rep("scope:'today',view:'masonry'","scope:'all',view:'masonry'")
# ---- card
a=s.index('  function card(l,grid){'); b=s.index('  function thumb(l){',a)
s=s[:a]+'''  function card(l,grid){
    const on=S.sel.has(l.id);const fic=`<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" style="color:var(--fc-${l.c})"><path fill="currentColor" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;
    return `<article class="card${S.select?' selecting':''}${S.link===l.id?' open':''}" style="view-transition-name:l${l.id}" data-id="${l.id}" draggable-card aria-selected="${on}"><button class="open" type="button" data-open="${l.id}" aria-label="Open ${esc(l.title)}"></button>
      ${S.show.image?`<div class="cover tile" style="aspect-ratio:${grid?'4 / 3':l.ratio}"><div class="cover-in">${coverInner(l)}</div><span class="selbox"><span class="sm-check" role="checkbox" aria-checked="${on}" aria-label="Select ${esc(l.title)}" tabindex="0">${on?ic('i-check',14):''}</span></span>
      <span class="acts"><button class="glass act" type="button" data-menu="${l.id}" aria-haspopup="menu" aria-label="More actions for ${esc(l.title)}">${ic('i-more',14)}</button><button class="glass act fstar${l.fav?' on':''}" type="button" data-fav="${l.id}" aria-pressed="${!!l.fav}" aria-label="${l.fav?'Remove from favorites':'Add to favorites'}">${ic(l.fav?'i-star-f':'i-star',14)}</button></span></div>`:''}
      <div class="body">${(S.show.folder||S.show.date)?`<div class="meta">${S.show.folder?`<span class="f">${fic}${esc(l.folder)}</span>`:''}${S.show.date?`<span class="ago">${esc(l.date)}</span>`:''}</div>`:''}
      <h2 class="title">${esc(l.title)}</h2>
      ${S.show.site?`<div class="src">${favi(l)}<span>${esc(l.sub||l.domain)}</span></div>`:''}
      ${S.show.tags&&l.tags.length?`<div class="ftags">${l.tags.slice(0,3).map(t=>`<span>#${esc(t)}</span>`).join('')}</div>`:''}
      ${S.show.note&&l.note?`<span class="secnote">${ic('i-edit',12)}<span>${esc(l.note)}</span></span>`:''}
      </div></article>`;
  }
'''+s[b:]
# ---- popovers: cfg and more
rep("    else if(kind==='view'){","""    else if(kind==='cfg'){pop.setAttribute('role','dialog');pop.setAttribute('aria-label','Card display');const sz=S.view!=='list';h=`<div class="cfgsl${sz?'':' off'}"><div class="cfgsl-h"><span>Grid size</span><span id="cfgn">${S.step+1} / 6</span></div><input type="range" min="0" max="5" step="1" value="${S.step}" data-cfg-step aria-label="Grid size"${sz?'':' disabled'}><div class="cfgsl-t"><span>Small</span><span>Large</span></div></div>`+[['note','Note'],['tags','Hashtags'],['folder','Folder'],['date','Date']].map(([k,t])=>`<label class="cfgrow"><span>${t}</span><button class="sw" type="button" role="switch" aria-checked="${!!S.show[k]}" data-show-k="${k}" aria-label="${t}"></button></label>`).join('')}
    else if(kind==='help')h=`<a class="mi" href="data.html">${ic('i-upload',16)}Import bookmarks</a><a class="mi" href="data.html">${ic('i-upload',16)}Export</a><div class="msep"></div><a class="mi" href="views.html">Keyboard shortcuts<span class="kbd">?</span></a><a class="mi" href="first-run.html">What’s new<span class="newb">new</span></a><a class="mi" href="tools.html">Send feedback</a><a class="mi" href="tools.html">How it works</a>`;
    else if(kind==='view'){""")
rep("    else if(kind==='more')h=`<button class=\"mi\" type=\"button\" data-select-on>Select links<span class=\"kbd\">X</span></button><button class=\"mi\" type=\"button\">${ic('i-upload',16)}Export this view…</button>`;",
    "    else if(kind==='more')h=`<div class=\"mh\">Sort by</div>${['Newest first','Oldest first','Title A–Z'].map((t,i)=>`<button class=\"mi\" type=\"button\" role=\"menuitemradio\" aria-checked=\"${i===0}\">${t}</button>`).join('')}<div class=\"msep\"></div><button class=\"mi\" type=\"button\" data-pop=\"filter\">${ic('i-filter',16)}Filter…</button><button class=\"mi\" type=\"button\" data-select-on>${ic('i-check',16)}Select links<span class=\"kbd\">X</span></button><a class=\"mi\" href=\"select-move.html\">${ic('i-split',16)}Side by side</a><button class=\"mi\" type=\"button\">${ic('i-upload',16)}Export this view…</button>`;")
# handlers: slider, switches, theme toggle, hide intro
rep("    const zs=t.closest('[data-size]');","    const sk=t.closest('[data-show-k]');if(sk){const k=sk.dataset.showK;S.show[k]=!S.show[k];sk.setAttribute('aria-checked',S.show[k]);save();render();return}\n    if(t.closest('[data-theme-toggle]')){const r=document.documentElement;const dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark';return}\n    if(t.closest('[data-hide-intro]')){t.closest('.intro').remove();return}\n    const zs=t.closest('[data-size]');")
s=s.replace("  render();\n})();","  document.addEventListener('input',e=>{const r=e.target.closest('[data-cfg-step]');if(!r)return;S.step=+r.value;const n=document.getElementById('cfgn');if(n)n.textContent=(S.step+1)+' / 6';save();render()});\n  render();\n})();",1)
s=s.replace("{menu:l&&l.title,view:'View',","{menu:l&&l.title,view:'View',cfg:'View',help:'Data and help',",1)
open(p,'w').write(s)
print('ok')
