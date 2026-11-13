import { asset, readAsset } from './assets.js'
import { enlargePhoto, closeHeritageImage } from './heritage-archive.js'
export const displayName = (f) => (f.getId?.() ?? f.id) === 'world-21' ? '清名桥历史文化街区' : (f.get?.('Heri_CN') ?? f.properties?.Heri_CN)
export async function photoEntry(id) {
  const local = import.meta.env.DEV || import.meta.env.MODE === 'review'
  const data = await readAsset(local ? 'media/review/index.json' : 'data/world-archive.json')
  return data[id]
}
export function createPhotoPopup({ host, project, onRead, onInteract = () => {} }) {
  const box = document.createElement('section'); box.className = 'photo-popup'; box.hidden = true
  box.setAttribute('aria-label', '遗产点位照片')
  box.innerHTML = '<header><strong></strong><button aria-label="关闭照片">×</button></header><button class="photo-open" aria-label="放大照片"><img alt=""></button><div class="photo-pager"><button aria-label="上一张照片">←</button><span></span><button aria-label="下一张照片">→</button></div><small></small><button class="photo-read">查看文字档案</button>'
  host.append(box)
  const [close, open, previous, next, read] = box.querySelectorAll('button')
  const img = box.querySelector('img'); let entry, feature, coordinate, current=0, ticket=0
  const update = () => {
    if (box.hidden || !coordinate) return
    const pixel=project(coordinate); if (!pixel) return
    const [x,y]=pixel; const w=host.clientWidth,h=host.clientHeight
    box.style.visibility=x<0||y<0||x>w||y>h?'hidden':'visible'
    const bw=box.offsetWidth,bh=box.offsetHeight
    let left=x+18; if(left+bw>w-12) left=x-bw-18
    let top=y-bh*.6
    const frame=host.getBoundingClientRect()
    const obstacles=[...document.querySelectorAll('#heritage-sidebar,.story-copy,#atlas-tools,.map-tools,.tour-city-photos')].filter(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect())
    const clashes=(l,t)=>obstacles.some(r=>l+bw>r.left-frame.left&&l<r.right-frame.left&&t+bh>r.top-frame.top&&t<r.bottom-frame.top)
    const choices=[[left,top],[x-bw-18,top],[x+18,y+18],[x-bw/2,y-bh-18],[x-bw/2,60]]
    for(const [l,t] of choices){const cl=Math.max(10,Math.min(w-bw-10,l)),ct=Math.max(56,Math.min(h-bh-45,t));if(!clashes(cl,ct)){left=cl;top=ct;break}}

    left=Math.max(10,Math.min(w-bw-10,left));top=Math.max(56,Math.min(h-bh-45,top))
    box.style.left=left+'px';box.style.top=top+'px'
    box.style.setProperty('--anchor-y',Math.max(16,Math.min(bh-16,y-top))+'px')
    box.classList.toggle('anchor-right',left<x)
  }
  const render=()=> {
    const item=entry.images[current];img.src=asset(item.url);img.alt=entry.name
    box.querySelector('strong').textContent=entry.name
    box.querySelector('.photo-pager span').textContent=`${current+1} / ${entry.images.length}`
    box.querySelector('small').textContent=''
    previous.disabled=next.disabled=entry.images.length<2
    update()
  }
  const hide=()=>{ ticket++;box.hidden=true;closeHeritageImage() }
  close.onclick=hide
  open.onclick=()=>{onInteract();enlargePhoto(img.src,entry.name)}
  previous.onclick=()=>{onInteract();current=(current+entry.images.length-1)%entry.images.length;render()}
  next.onclick=()=>{onInteract();current=(current+1)%entry.images.length;render()}
  read.onclick=()=>{onInteract();onRead(feature)}
  img.onload=update
  img.onerror=()=>{box.querySelector('small').textContent='照片加载失败，可切换下一张或关闭'}
  box.addEventListener('pointerdown',()=>onInteract())
  return { element:box, hide, update, async show(f,point) {
    const request=++ticket; onInteract(); box.hidden=true
    const data=await photoEntry(f.getId?.()??f.id).catch(()=>null)
    if(request!==ticket || !data?.images?.length) return false
    entry=data;feature=f;coordinate=point;current=0;box.hidden=false;render();return true
  } }
}
