import { createTourPhotos } from './tour-photos.js'
import { reducedMotion } from './assets.js'
import { fromLonLat, toLonLat } from 'ol/proj.js'
let active
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e}
export async function enterStory(index, bridge, stops, returnHash='#atlas') {
  active?.exit(false)
  const root=node('section',null,'story-shell');root.setAttribute('aria-label','沿河而行全屏故事地图')
  root.innerHTML='<div id="story-map-host"></div><div class="story-top"><span>沿河而行 · 八站巡游</span><div><button id="story-tilt">倾斜视角</button><button id="story-exit">退出巡游</button></div></div><article class="story-copy" aria-live="polite"><small id="story-count"></small><h2 id="story-city"></h2><h3 id="story-title"></h3><p id="story-summary"></p><details id="story-more"><summary>展开故事</summary><div></div></details><span id="story-photo-note"></span></article><div class="story-bottom"><div class="story-controls"><button id="story-prev">上一站</button><button id="story-play">开始旅程</button><button id="story-next">下一站</button><button id="story-skip" hidden>跳过镜头</button></div><nav id="story-progress" aria-label="八站进度"></nav><small id="story-status"></small></div>'
  document.body.append(root);document.body.classList.add('story-active')
  const inertTargets=[...document.querySelectorAll('main,.masthead')].map(e=>[e,e.inert])
  inertTargets.forEach(([e])=>{e.inert=true})
  const q=id=>root.querySelector('#'+id)
  const {map,view,photo}=bridge;const mapElement=map.getTargetElement();const parent=mapElement.parentElement
  const detail=document.getElementById('heritage-sidebar'), detailParent=detail.parentElement
  const state={selection:bridge.getSelection(),center:view.getCenter().slice(),zoom:view.getZoom(),rotation:view.getRotation(),
    layers:Object.values(bridge.layers).map(({layer})=>[layer,layer.getVisible(),layer.getOpacity()]),
    nodes:bridge.nodes.getSource().getFeatures(),detail:!document.getElementById('page-atlas').classList.contains('detail-collapsed')}
  let current=index,playing=false,timer,token=0,exited=false,transition=false,tilted,tiltOn=false,tiltLoading=false,resumeCamera=false
  const host=q('story-map-host');host.append(mapElement);root.append(detail);bridge.hideDetails();detail.hidden=true
  bridge.restoreSelection(undefined);bridge.hideDetails();photo.hide();map.updateSize()
  const coordinates=stops.map(stop=>bridge.resolveNode(stop))
  const raw=bridge.coordinates().features.flatMap(f=>f.geometry.type==='MultiLineString'?f.geometry.coordinates:f.geometry.type==='LineString'?[f.geometry.coordinates]:[]).flat()
  const route=raw.map(point=>fromLonLat(point))
  const pause=()=>{root.classList.remove('story-autoplay');playing=false;clearTimeout(timer);q('story-play').textContent='继续旅程';if(transition){token++;view.cancelAnimations();tilted?.stop();resumeCamera=true;showCopy()}}
  const schedule=()=>{clearTimeout(timer);if(playing)timer=setTimeout(()=>{if(current<7)go(current+1);else{pause();q('story-play').textContent='重新开始';q('story-status').textContent='八站旅程已完成，可返回任意站点。'}},3000)}
  const cityPhotos=createTourPhotos(root,()=>pause())
  const interact=()=>{pause();if(!document.getElementById('page-atlas').classList.contains('detail-collapsed'))detail.hidden=false}
  const oldShow=bridge.showDetail
  document.addEventListener('story-interact',interact)
  const detailObserver=new MutationObserver(()=>{detail.hidden=document.getElementById('page-atlas').classList.contains('detail-collapsed')})
  detailObserver.observe(document.getElementById('page-atlas'),{attributes:true,attributeFilter:['class']})
  map.getViewport().addEventListener('pointerdown',pause)
  map.getViewport().addEventListener('wheel',pause,{passive:true})
  const progress=stops.map((stop,i)=>{const b=node('button',`${i+1} ${stop.title.replace(/^第.+?站 /,'').split('｜')[0].replace(/山东|江苏|浙江/,'')}`);b.onclick=()=>{pause();go(i)};q('story-progress').append(b);return b})
  function showCopy() {
    const stop=stops[current], [city,title]=stop.title.replace(/^第.+?站 /,'').split('｜')
    q('story-count').textContent=`第 ${current+1} 站 / 共 8 站`
    q('story-city').textContent=city;q('story-title').textContent=title
    const body=stop.paragraphs.filter(p=>!p.startsWith('代表')&&!p.startsWith('导览'))
    q('story-summary').textContent=body[0].length<80 ? body[0]+(stop.paragraphs.find(p=>p.startsWith('导览主题'))||'').replace('导览主题：','') : body[0]
    q('story-more').open=false
    q('story-more').querySelector('div').replaceChildren(...stop.paragraphs.map(p=>node('p',p)))
    q('story-photo-note').textContent='';void cityPhotos.show(current,city)
    bridge.showNodes([stop]);tilted?.refreshLabels();root.classList.remove('moving');transition=false;q('story-skip').hidden=true
    q('story-prev').disabled=current===0;q('story-next').disabled=current===7
    progress.forEach((b,i)=>b.setAttribute('aria-current',i===current?'step':'false'))
    schedule()
  }
  function midpoint(a,b) {
    const desired=[(a[0]+b[0])/2,(a[1]+b[1])/2]
    return route.reduce((best,p)=>Math.hypot(p[0]-desired[0],p[1]-desired[1])<Math.hypot(best[0]-desired[0],best[1]-desired[1])?p:best,route[0]||desired)
  }
  function go(i,instant=false) {
    if(exited||i<0||i>7)return
    clearTimeout(timer);token++;const request=token
    current=i;resumeCamera=false;photo.hide();tilted?.closePhoto();bridge.hideDetails();view.cancelAnimations();tilted?.stop()
    root.classList.add('moving');transition=true;q('story-skip').hidden=false
    const end=coordinates[i],start=tiltOn?fromLonLat(tilted.center()):view.getCenter().slice()
    const distance=Math.hypot(end[0]-start[0],end[1]-start[1]);const zoom=11.5
    const settled=()=>{if(request===token&&!exited)showCopy()}
    if(instant||reducedMotion.matches){view.setCenter(end);view.setZoom(zoom);if(tiltOn)tilted.jump(toLonLat(end),zoom);settled();return}
    const middle=midpoint(start,end)
    const travelZoom=Math.min(10,Math.max(6,Math.log2(40075016/(Math.max(distance,12000)/Math.max(host.clientWidth*.55,200)*256))))
    if(tiltOn) tilted.travel(toLonLat(middle),toLonLat(end),travelZoom,zoom,settled)
    else view.animate({zoom:Math.min(view.getZoom(),travelZoom),duration:500},
      {center:middle,duration:800},{center:end,duration:850},{zoom,duration:500},settled)
  }
  q('story-play').onclick=()=>{
    if(playing){pause();return}
    playing=true;root.classList.add('story-autoplay');q('story-play').textContent='暂停'
    if(resumeCamera)go(current);else if(current===7)go(0);else if(!transition)schedule()
  }
  q('story-prev').onclick=()=>{pause();go(current-1)}
  q('story-next').onclick=()=>{pause();go(current+1)}
  q('story-skip').onclick=()=>go(current,true)
  q('story-more').querySelector('summary').addEventListener('click',pause)
  q('story-more').addEventListener('toggle',()=>{if(q('story-more').open)pause()})
  q('story-tilt').onclick=async()=>{
    if(tiltLoading)return
    pause();go(current,true);photo.hide()
    if(tiltOn){view.setCenter(fromLonLat(tilted.center()));view.setZoom(tilted.zoom());tilted.hide();mapElement.hidden=false;tiltOn=false;q('story-tilt').textContent='倾斜视角';q('story-status').textContent='';map.updateSize();return}
    tiltLoading=true;q('story-tilt').disabled=true;q('story-status').textContent='正在检查倾斜地图…'
    try {
      if(!tilted){const {createTiltedTour}=await import('./tilted-tour.js');if(exited)return
        tilted=await createTiltedTour(host,bridge,()=>{pause()},feature=>{pause();oldShow(feature);detail.hidden=false},()=>{if(!exited&&tiltOn){view.setCenter(fromLonLat(tilted.center()));view.setZoom(tilted.zoom());tiltOn=false;tilted.destroy();tilted=undefined;mapElement.hidden=false;map.updateSize();pause();go(current,true);q('story-tilt').textContent='倾斜视角';q('story-status').textContent='倾斜视角不可用，已恢复二维地图。'}})}
      if(exited){tilted.destroy();return}
      tilted.show(toLonLat(view.getCenter()),view.getZoom());mapElement.hidden=true;tiltOn=true
      q('story-tilt').textContent='2D 俯视';q('story-status').textContent=''
    }catch(error){q('story-status').textContent='倾斜视角不可用，继续使用二维巡游。';console.warn(error)}
    finally{tiltLoading=false;q('story-tilt').disabled=false}
  }
  function exit(changeHash=true) {
    if(exited)return;exited=true;token++;clearTimeout(timer);view.cancelAnimations();photo.hide();tiltOn=false;tilted?.destroy()
    document.removeEventListener('story-interact',interact);document.removeEventListener('leave-story',leave);document.removeEventListener('keydown',key)
    map.getViewport().removeEventListener('pointerdown',pause);map.getViewport().removeEventListener('wheel',pause);detailObserver.disconnect()
    parent.append(mapElement);mapElement.hidden=false;detailParent.append(detail);detail.hidden=false
    bridge.restoreSelection(state.selection)
    document.getElementById('page-atlas').classList.toggle('detail-collapsed',!state.detail)
    document.getElementById('toggle-detail').setAttribute('aria-expanded',String(state.detail))
    state.layers.forEach(([layer,visible,opacity])=>{layer.setVisible(visible);layer.setOpacity(opacity)})
    bridge.nodes.getSource().clear();bridge.nodes.getSource().addFeatures(state.nodes)
    view.setCenter(state.center);view.setZoom(state.zoom);view.setRotation(state.rotation)
    root.remove();inertTargets.forEach(([e,value])=>{e.inert=value});document.body.classList.remove('story-active');map.updateSize();active=null
    if(changeHash)location.hash=returnHash
    document.getElementById('enter-story').focus({preventScroll:true})
  }
  const leave=()=>exit(false);const key=e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]'))exit()}
  document.addEventListener('leave-story',leave);document.addEventListener('keydown',key)
  q('story-exit').onclick=()=>exit();active={exit};go(index,true)
  root.classList.add('story-loading')
  q('story-status').textContent='正在开启八埠寻踪…'
  try { await q('story-tilt').onclick() } finally { root.classList.remove('story-loading') }
  if(!exited) {q('story-play').textContent='开始旅程';q('story-exit').focus({preventScroll:true})}
}
