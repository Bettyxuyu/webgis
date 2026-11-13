import { manuscript, references } from './history-manuscript.js'
import historyText from '../content/history.md?raw'
import { historyScenes } from './history-scenes.js'
const el=id=>document.getElementById(id)
const node=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n}
const originalChapters=[...historyText.replaceAll('\r','').matchAll(/^## 第.+?章 (.+)\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)]
let api,index=0,playing=false,request=0
const controls=historyScenes.map((scene,i)=>{const b=node('button',scene.label);b.type='button';b.title=manuscript[i].keyword;b.onclick=()=>select(i,false);el('period-buttons').append(b);return b})
function updateCopy(){
 const s={...historyScenes[index],...manuscript[index]};controls.forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===index));b.classList.toggle('past',i<index)})
 const article=el('period-article');article.replaceChildren(node('p',s.label+' · '+s.keyword,'history-keyword'),node('h3',s.title))
 s.copy.forEach((text,i)=>{const p=node('p',text);p.dataset.perspective=['概述','空间变化','历史原因','影响意义'][i];article.append(p)})
 const places=node('div','','history-node-links')
 s.nodes.forEach((place,i)=>{const b=node(place.role?'button':'span',place.label);b.dataset.nodeIndex=String(i);b.disabled=true;b.title='位置数据加载后可查看；缺失时不会生成替代坐标';if(place.role)b.onclick=()=>{pause();const f=api?.getState().nodes.find(f=>f.get('node')===place);if(f)api.openNode(f)};places.append(b)})
 article.append(places)
 const legend=el('history-legend-content');legend.replaceChildren()
 const names=s.id==='song'?['广济河','汴河','蔡河']:[s.id==='ming'?'明代线路（明清专题参照）':s.label+(s.id==='canal'?'参照线路':'概化线路')]
 names.forEach((name,i)=>{const row=node('div',name,'history-legend-row');row.style.setProperty('--route-color',s.id==='song'?['#777846','#975d46','#477a80'][i]:s.color);row.classList.toggle('modern',s.id==='canal');legend.append(row)})
 legend.append(node('p',s.id==='canal'?'当代参照线':'历史概化线','hint'))
 el('history-period-note').textContent=''
 el('history-reading-title').textContent=s.label+' · 运河往事'
 const reading=el('history-reading-content');reading.replaceChildren()
 const body=manuscript[index].body
 const parts=body.split(/^### /m).filter(Boolean)
 let ending
 parts.forEach(part=>{const lines=part.trim().split('\n');const chapter=document.createElement('section');chapter.className='history-reading-chapter';chapter.append(node('h3',lines.shift().replace(/^\d+ /,'')));lines.join('\n').split(/\n\s*\n/).filter(Boolean).filter(t=>!/^参考资料/.test(t.trim())).forEach(t=>{const text=t.replaceAll('**','').trim();if(text.startsWith('本章结语：'))ending=text.slice('本章结语：'.length);else if(text!=='---')chapter.append(node('p',text))});reading.append(chapter)})
 if(ending)reading.append(node('p',ending,'history-reading-ending'))

 const notes=el('history-data-notes');notes.replaceChildren(node('p','依据历史参考地图人工数字化的概化线路，不代表精确历史测绘。'),node('p',s.note.replaceAll('识读点','参考位置')),node('p','现代水系、地形、省界与行政面文字锚点仅为地理参照；节点不表示古城精确坐标。'),node('p','历史内容依据专题文稿整理；照片来源与使用许可保留在项目素材记录中。'))

}
async function select(i,auto){
 if(i<0||i>=historyScenes.length)return
 const ticket=++request;index=i;playing=auto;el('page-history').classList.toggle('auto-playing',playing);updateButtons();updateCopy()
 if(!api)return
 try{await api.select(historyScenes[i],auto,()=>{if(!playing)return;if(index<5)void select(index+1,true);else{playing=false;updateButtons();el('history-play-status').textContent='六期巡演已结束'}})}
 catch(error){if(ticket===request){playing=false;updateButtons();el('history-play-status').textContent='历史数据加载失败，请重选本期重试';console.error(error)}}
}
function updateButtons(){el('page-history').classList.toggle('auto-playing',playing);el('history-play').textContent=playing?'暂停':'继续';el('history-play').setAttribute('aria-pressed',String(playing))}
function pause(){playing=false;api?.pause();updateButtons()}
el('history-play').onclick=()=>{if(playing)pause();else{playing=true;updateButtons();if(api?.getState().readiness==='error')void select(index,true);else if(api?.getState().elapsed>=4100)void select(index===5?0:index,true);else api?.resume(true)}}
el('history-replay').onclick=()=>void select(0,true)
document.addEventListener('history-interact',pause)
document.addEventListener('history-frame',event=>{const s=event.detail;if(s.period!==historyScenes[index].id)return;el('history-play-status').textContent=`${historyScenes[index].label} · ${s.phase}${s.paused?' · 已暂停':''}`;el('history-progress').value=s.elapsed/4100;el('page-history').dataset.phase=s.phase;el('page-history').dataset.period=s.period;document.querySelectorAll('.history-node-links button').forEach(b=>{b.disabled=!api?.getState().nodes.some(f=>f.get('node')===historyScenes[index].nodes[Number(b.dataset.nodeIndex)])})})
export function showHistory(map){api=map.historyController;return select(index,false)}
export function leaveHistory(){request++;playing=false;api?.stop();updateButtons()}
