import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import LineString from 'ol/geom/LineString.js'
import MultiLineString from 'ol/geom/MultiLineString.js'
import Overlay from 'ol/Overlay.js'
import { Style, Stroke, Fill, Circle, Text } from 'ol/style.js'
import { createEmpty, extend } from 'ol/extent.js'
import { reducedMotion, readAsset } from './assets.js'

// Only the render copy is truncated; complete source geometries remain unchanged.
export function partialLine(coordinates, fraction) {
  if(fraction>=1)return coordinates
  const lengths=coordinates.slice(1).map((p,i)=>Math.hypot(p[0]-coordinates[i][0],p[1]-coordinates[i][1]))
  let remaining=lengths.reduce((a,b)=>a+b,0)*fraction
  const result=[coordinates[0]]
  for(let i=0;i<lengths.length;i++){
    if(remaining>=lengths[i]){result.push(coordinates[i+1]);remaining-=lengths[i]}
    else {const t=lengths[i]?remaining/lengths[i]:0;result.push(coordinates[i].map((v,k)=>v+(coordinates[i+1][k]-v)*t));break}
  }
  if(result.length===1)result.push(result[0]);return result
}
export function createHistoryMap({map,view,resolveNode,heritage,photo,baseLayers,nodes:ordinaryNodes}) {
  const routeSource=new VectorSource(),nodeSource=new VectorSource()
  const routeLayer=new VectorLayer({source:routeSource,zIndex:30,updateWhileAnimating:true,updateWhileInteracting:true,declutter:'history-lines'})
  const nodeLayer=new VectorLayer({source:nodeSource,zIndex:31,updateWhileAnimating:true,updateWhileInteracting:true,declutter:'history-nodes'})
  map.addLayer(routeLayer);map.addLayer(nodeLayer)
  const format=new GeoJSON();let scene,originals=[],rendered=[],selectedNodes=[],token=0,frame,elapsed=0,last=0,paused=false,active=false,autoplay=false,onEnd=()=>{},camera,phase='idle',readiness='idle'
  const card=document.createElement('section');card.className='history-node-card';card.hidden=true
  const overlay=new Overlay({element:card,positioning:'bottom-center',offset:[0,-16],autoPan:{margin:24,duration:reducedMotion.matches?0:220}})
  map.addOverlay(overlay)
  function hideCard(){card.hidden=true;overlay.setPosition(undefined)}
  function openNode(feature){
    const node=feature.get('node');if(!node.role)return
    pause();document.dispatchEvent(new Event('history-interact'))
    card.replaceChildren();const close=document.createElement('button');close.textContent='关闭';close.onclick=hideCard
    const title=document.createElement('h4');title.textContent=node.label
    const text=document.createElement('p');text.textContent=node.role
    const note=document.createElement('small');note.textContent=scene.label
    card.append(close,title,text,note)
    if(node.heritage){const b=document.createElement('button');b.textContent='查看遗产照片';b.onclick=()=>{const f=heritage.find(f=>f.getId()===node.heritage);if(f)void photo.show(f,f.getGeometry().getCoordinates())};card.append(b)}
    card.hidden=false;overlay.setPosition(feature.getGeometry().getCoordinates())
  }
  map.on('singleclick',event=>{if(!active)return;const f=map.forEachFeatureAtPixel(event.pixel,f=>f,{layerFilter:l=>l===nodeLayer,hitTolerance:7});if(f)openNode(f);else hideCard()})
  function announce(){document.dispatchEvent(new CustomEvent('history-frame',{detail:{period:scene?.id,phase,elapsed,paused,autoplay}}))}
  function draw(time){
    elapsed=Math.min(time,4100)
    const move=reducedMotion.matches?1:Math.min(1,time/650)
    if(move<1){const t=move*move*(3-2*move);view.setCenter(camera.from.map((v,i)=>v+(camera.to[i]-v)*t));view.setResolution(camera.fromRes+(camera.toRes-camera.fromRes)*t)}
    else if(!camera.arrived){view.setCenter(camera.to);view.setResolution(camera.toRes);camera.arrived=true}
    const reveal=reducedMotion.matches?1:Math.max(0,Math.min(1,(time-500)/850))
    routeLayer.setVisible(reveal>0)
    if(reveal!==camera.reveal){camera.reveal=reveal;rendered.forEach((feature,i)=>{
      const geometry=originals[i].getGeometry(),coords=geometry.getCoordinates()
      feature.setGeometry(geometry.getType()==='LineString'?new LineString(partialLine(coords,reveal)):new MultiLineString(coords.map(part=>partialLine(part,reveal))))
      feature.set('ready',reveal===1)
    })}
    const opacity=reducedMotion.matches?1:Math.max(0,Math.min(1,(time-1000)/300))
    nodeLayer.setVisible(opacity>0);nodeLayer.setOpacity(opacity)
    phase=move<1?'镜头移动':reveal<1?'河道绘制':opacity<1?'节点出现':'阅读停留'
    announce()
  }
  function tick(time){if(!active||paused||readiness!=='ready')return;const next=elapsed+(last?time-last:0);last=time;draw(next)
    if(elapsed>=4100){frame=undefined;if(autoplay)onEnd();return}
    if(!autoplay&&elapsed>=1400){last=0;frame=undefined;return}
    frame=requestAnimationFrame(tick)
  }
  function pause(){paused=true;cancelAnimationFrame(frame);frame=undefined;last=0;announce()}
  function resume(auto=true){if(!active)return;autoplay=auto;paused=false;last=0;cancelAnimationFrame(frame);if(readiness==='ready')frame=requestAnimationFrame(tick);announce()}
  async function select(next,auto=false,complete=()=>{}){
    const request=++token;cancelAnimationFrame(frame);view.cancelAnimations();hideCard();photo.hide()
    document.getElementById('map-caption').textContent=next.label+' · '+next.title
    document.getElementById('map-scene').textContent=next.id==='canal'?'当代线路参照':next.id==='ming'?'明代概化示意':'历史概化示意'
    scene=next;active=true;autoplay=auto;onEnd=complete;paused=false;elapsed=0;last=0;phase='数据加载';readiness='loading';camera=undefined;originals=[];rendered=[];selectedNodes=[]
    routeSource.clear();nodeSource.clear();routeLayer.setVisible(false);nodeLayer.setVisible(false);ordinaryNodes.getSource().clear()
    for(const layer of baseLayers.routes)layer.setVisible(false)
    for(const layer of baseLayers.heritage)layer.setVisible(false)
    baseLayers.cities.setVisible(false);baseLayers.rivers.setOpacity(.38);baseLayers.lakes.setOpacity(.4);baseLayers.provinces.setOpacity(.48);baseLayers.terrain.setOpacity(.58)
    announce()
    let data
    try {data=await readAsset(next.id==='canal'?'data/canal.geojson':`data/history/${next.id}.geojson`)}
    catch(error){if(request===token&&active){readiness='error';phase='数据加载失败';paused=true;announce()}throw error}
    if(request!==token||!active)return
    originals=format.readFeatures(data,{dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'}).filter(f=>f.get('_display')!==false)
    rendered=originals.map(f=>f.clone());routeSource.addFeatures(rendered)
    routeLayer.setStyle(f=>{
      const name=f.get('NAME')||'';const color=scene.id==='song'?({'广济河':'#777846','汴河':'#975d46','蔡河':'#477a80'}[name]||scene.color):scene.color
      return [new Style({stroke:new Stroke({color:'#f4f0df',width:5.6})}),new Style({stroke:new Stroke({color,width:3,lineDash:scene.id==='canal'?undefined:[10,5]}),text:f.get('ready')&&name?new Text({text:name,placement:'line',repeat:220,font:'14px Microsoft YaHei',fill:new Fill({color}),stroke:new Stroke({color:'#f5f0df',width:3})}):undefined})]
    })
    selectedNodes=next.nodes.flatMap(node=>{
      let coordinate
      if(node.river){const f=originals.find(f=>f.get('NAME')===node.river);const g=f?.getGeometry();coordinate=g?.getType()==='LineString'?g.getCoordinateAt(.5):g?.getLineString(0).getCoordinateAt(.5)}else coordinate=resolveNode(node)
      return coordinate?[new Feature({geometry:new Point(coordinate),node})]:[]
    })
    nodeSource.addFeatures(selectedNodes)
    nodeLayer.setStyle(f=>new Style({image:new Circle({radius:4.5,fill:new Fill({color:scene.color}),stroke:new Stroke({color:'#f8f4e6',width:2})}),text:new Text({text:f.get('node').label,offsetY:-15,font:'12px Microsoft YaHei',fill:new Fill({color:'#454735'}),stroke:new Stroke({color:'#f5f0df',width:3})})}))
    const extent=createEmpty();originals.forEach(f=>extend(extent,f.getGeometry().getExtent()));selectedNodes.forEach(f=>extend(extent,f.getGeometry().getExtent()))
    if(next.centerCity){const center=resolveNode({city:next.centerCity});if(center){const dx=Math.max(Math.abs(extent[0]-center[0]),Math.abs(extent[2]-center[0])),dy=Math.max(Math.abs(extent[1]-center[1]),Math.abs(extent[3]-center[1]));extent.splice(0,4,center[0]-dx,center[1]-dy,center[0]+dx,center[1]+dy)}}
    const size=map.getSize();const toRes=Math.max(view.getResolutionForExtent(extent,[Math.max(100,size[0]-130),Math.max(100,size[1]-130)]),view.getResolutionForZoom(next.maxZoom))
    camera={from:view.getCenter().slice(),fromRes:view.getResolution(),to:[(extent[0]+extent[2])/2,(extent[1]+extent[3])/2],toRes,extent,arrived:false,reveal:-1}
    readiness='ready'
    cancelAnimationFrame(frame)
    if(!paused){if(reducedMotion.matches){draw(1400);elapsed=1400}frame=requestAnimationFrame(tick)}
    announce()
  }
  function stop(){token++;active=false;readiness='idle';cancelAnimationFrame(frame);hideCard();routeLayer.setVisible(false);nodeLayer.setVisible(false);phase='idle'}
  function fitResolution(){const size=map.getSize();return Math.max(view.getResolutionForExtent(camera.extent,[Math.max(100,size[0]-130),Math.max(100,size[1]-130)]),view.getResolutionForZoom(scene.maxZoom))}
  map.on('change:size',()=>{if(!active||!camera||readiness!=='ready')return;camera.toRes=fitResolution();if(elapsed>=650){view.setCenter(camera.to);view.setResolution(camera.toRes)}})
  function reset(){if(!camera)return;pause();camera.toRes=fitResolution();view.setCenter(camera.to);view.setResolution(camera.toRes);draw(1400)}
  return {select,pause,resume,stop,reset,openNode,restoreReading(saved){pause();draw(saved.elapsed);view.setCenter(saved.center);view.setZoom(saved.zoom)},getState:()=>({active,readiness,period:scene?.id,phase,elapsed,paused,autoplay,features:routeSource.getFeatures(),nodes:selectedNodes}),routeLayer,nodeLayer}
}
