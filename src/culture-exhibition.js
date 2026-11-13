import manuscript from '../content/culture-exhibition.md?raw'
import {reducedMotion,readAsset,asset} from './assets.js'
const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n}
const clean=s=>s.replaceAll('**','').replace(/^[-•] /,'').replace(/^---$/gm,'').trim()
function prose(text,target){text.split(/\n\s*\n/).filter(Boolean).forEach(block=>{if(/^\s*---\s*$/.test(block))return;target.append(el(/^#{1,3} /.test(block)?'h3':'p',clean(block.replace(/^#{1,3} /,''))))})}
const parts=manuscript.replaceAll('\r','').split(/^# 两岸人间｜/m).slice(1)
const titles=['因河而兴——城市发展','舟楫往来——漕运与商业','水路交融——文化交流','枕水而居——沿岸生活']
const questions=['一条运河，如何塑造一座城？','运河运输了什么，又如何连接不同地区？','运河如何促进不同地区的文化交流？','运河如何融入沿岸居民的日常生活？']
const dialog=el('dialog','','culture-archive-dialog');dialog.setAttribute('aria-label','历史档案阅读层');document.body.append(dialog)
let opener,scroll,request=0
const close=()=>dialog.close()
dialog.onclick=e=>{if(e.target===dialog)close()}
dialog.addEventListener('close',()=>{request++;document.body.style.overflow='';window.scrollTo(0,scroll);opener?.focus({preventScroll:true})})
function figure(item){const f=el('figure','','culture-figure');const img=el('img','');img.src=asset(item.url);img.alt='档案图片';img.loading='lazy';f.dataset.original=item.original;f.append(img);return f}
function renderArchive(body,content){
 const chunks=body.split(/^### /m),period=clean(chunks.shift().match(/历史时期：([^\n]+)/)?.[1]||'')

 let ending
 for(const chunk of chunks){const lines=chunk.trim().split('\n'),heading=lines.shift(),text=lines.join('\n').split(/\n\s*\n/).filter(t=>clean(t)&&!/^(城市关键词|历史关键词|关键词|资料依据|资料来源)/.test(clean(t)))
  if(heading==='档案结语'){ending=el('footer','','archive-ending');text.forEach(t=>ending.append(el('p',clean(t))));continue}
  const section=el('section','','archive-section');const h=el('h3','');const m=heading.match(/^(\d+) (.+)/);if(m)h.append(el('small',m[1]),el('span',m[2]));else h.textContent=heading;section.append(h)
  if(/^代表性/.test(heading.replace(/^\d+\s*/,''))){const grid=el('div','','relic-grid');let card;for(const t of text){if(/^\*\*[^\n]+\*\*$/.test(t.trim())){card=el('article','','relic-item');card.append(el('h4',clean(t)));grid.append(card)}else if(card)card.append(el('p',clean(t)));else section.append(el('p',clean(t)))}section.append(grid)}else text.forEach(t=>section.append(el('p',clean(t))))
  content.append(section)
 }
 if(ending)content.append(ending)
}
async function addImages(name,content,ticket){
 if(!(import.meta.env.DEV||import.meta.env.MODE==='review'))return
 const data=await readAsset('media/review/culture-index.json').catch(()=>({}));if(ticket!==request||!content.isConnected||!dialog.open)return
 const items=data[name]||[];if(!items.length)return
 content.prepend(figure(items[0]));const sections=[...content.querySelectorAll('.archive-section')]
 items.slice(1).forEach((item,i)=>{const keyword=item.caption.split(' · ')[0].replace(/展示|影像|相关|实景/g,'');const relic=[...content.querySelectorAll('.relic-item')].find(n=>{const title=n.querySelector('h4')?.textContent||'';return title&&(title.includes(keyword)||keyword.includes(title))});const section=sections.find(n=>keyword.length>1&&n.textContent.includes(keyword))||sections[Math.min(sections.length-1,i+1)];(relic||section||content).append(figure(item))})
}
function openArchive(name,title,body,i,button){
 request++;const ticket=request;opener=button;scroll=window.scrollY;dialog.replaceChildren();const head=el('header','','culture-dialog-heading');const exit=el('button','关闭','culture-close');exit.onclick=close
 head.append(el('p','两岸人间 / '+titles[i].split('——')[0]),el('h2',name),el('p',title,'archive-subtitle'),exit)
 const content=el('article','','culture-dialog-content');renderArchive(body,content);dialog.append(head,content);document.body.style.overflow='hidden';dialog.showModal();dialog.scrollTop=0;void addImages(name,content,ticket)
 dialog.getAnimations().forEach(a=>a.cancel());if(!reducedMotion.matches)dialog.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'ease-out'})
}
const intro=document.getElementById('culture-intro');intro.replaceChildren(el('p','河道连接南北，生活在两岸生长。'),el('p','从城市与商贸，到文化与日常。'))
const root=document.getElementById('culture-stories');root.replaceChildren()
export const cultureArchiveCounts=[]
parts.forEach((part,i)=>{
 const main=part.split('## 二、主页面展示文案')[1]?.split(/^# 三、/m)[0]||'',summary=main.split(/^### /m)[1]?.split('\n').slice(1).join('\n')||''
 const archiveText=part.split(/^# 三、[^\n]*\n/m)[1]?.split(/^# 四、/m)[0]||''
 const archives=[...archiveText.matchAll(/^## (?:档案|案档)(\d+)｜([^\n]+)\n([\s\S]*?)(?=^## (?:档案|案档)|$(?![\s\S]))/gm)]
 cultureArchiveCounts.push(archives.length)
 const section=el('section','',`culture-feature feature-${i+1}`);section.id='culture-topic-'+(i+1);section.append(el('p',`0${i+1}`,'culture-number'),el('h3',titles[i]),el('p',questions[i],'culture-question'))
 const copy=el('div','','culture-feature-copy');prose(summary,copy);for(const p of copy.querySelectorAll('p'))if(p.textContent===questions[i]||p.textContent==='一河通南北，舟楫载百货。')p.remove();section.append(copy)
 const entries=el('div','','culture-entries');archives.forEach(([,id,name,body])=>{const b=el('button','','culture-entry');const title=clean(body.match(/档案标题[：:]([^\n]+)/)?.[1]||name);b.setAttribute('aria-label',name+'：'+title);b.classList.toggle('long-title',name.length>5);b.append(el('strong',({'曲艺与民俗':'曲艺民俗','手工艺与商贸文化':'匠艺商贸','饮食与地方生活':'饮食生活'})[name]||name),el('span',title));const ornament=document.createElementNS('http://www.w3.org/2000/svg','svg');ornament.setAttribute('viewBox','0 0 100 28');ornament.setAttribute('aria-hidden','true');ornament.classList.add('book-ornament');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',['M10 22 H90 M20 22 Q50 -8 80 22 M37 22 V15 Q50 0 63 15 V22','M12 17 L25 25 H78 L90 17 Z M49 17 V2 L68 15 H49 M4 27 Q14 23 24 27 T44 27 T64 27 T84 27','M23 23 V7 Q14 0 23 2 H77 Q88 3 77 10 V23 H23 M30 5 H70 M30 18 H67','M5 24 H95 M25 24 V9 H60 V24 M20 9 L43 0 L66 9 M72 24 Q69 5 90 11 Q90 20 72 24'][i]);ornament.append(path);b.append(ornament);b.onclick=()=>openArchive(name,title,body,i,b);entries.append(b)});section.append(entries)
 const conclusion=part.split(/^# 四、[^\n]*\n/m)[1]?.split(/^# 五、/m)[0]||'';const text=conclusion.split(/\n\s*\n/).filter(t=>clean(t)&&!/^#/.test(t.trim()))
 // Keep the complete conclusion as prose, without an extra disclosure interaction.
 const after=el('details','','culture-notes');const noteSummary=el('summary','');noteSummary.append(el('strong','章节札记'),el('span',clean(text[text.length-1]||'')));after.append(noteSummary);const body=el('div','');text.slice(0,-1).forEach(t=>{if(clean(t))body.append(el('p',clean(t)))});after.append(body);section.append(after);root.append(section)
})
root.append(el('p','河水流过千年，两岸的生活仍在继续。','culture-ending'))


const navigation=el('nav','','culture-topic-nav');navigation.setAttribute('aria-label','人文主题导航')
const topicNames=['因河而兴','舟楫往来','水路交融','枕水而居','遗产数据']
const targets=[...root.querySelectorAll('.culture-feature'),document.getElementById('statistics')]
targets.forEach((target,i)=>{const b=el('button',`0${i+1} ${topicNames[i]}`);b.onclick=()=>{target.scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'start'})};navigation.append(b)})
root.before(navigation)
const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const index=targets.indexOf(entry.target);[...navigation.children].forEach((b,i)=>b.setAttribute('aria-current',i===index?'true':'false'))}},{rootMargin:'-10% 0px -65% 0px',threshold:0})
targets.forEach(t=>observer.observe(t))
