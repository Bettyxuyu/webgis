import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerURL from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
maplibregl.setWorkerUrl(workerURL)
maplibregl.setWorkerCount(2)
import { resolutionAtGLZoom, tierVisible, intersectsBounds } from './water-policy.js'
import { toLonLat } from 'ol/proj.js'
import { readAsset, asset, reducedMotion } from './assets.js'
import { createPhotoPopup, displayName } from './photo-popup.js'
export async function createTiltedTour(host, bridge, interact, read, fallback) {
  const container=document.createElement('div');container.className='tilted-map';host.append(container)
  let gl,closed=false,flight=0
  try {
    gl=new maplibregl.Map({container,center:[116.7,39.9],zoom:10,pitch:50,maxPitch:55,minZoom:3,maxZoom:17,
      attributionControl:false,renderWorldCopies:false,style:{version:8,sources:{},layers:[{id:'paper',type:'background',paint:{'background-color':'#e9eadd'}}]}})
    await Promise.race([new Promise((resolve,reject)=>{gl.once('load',resolve);gl.once('error',e=>reject(e.error))}),new Promise((_,reject)=>setTimeout(()=>reject(Error('WebGL初始化超时')),12000))])
    const [terrain,canal,sui,yuan,heritage,admin,cities,water]=await Promise.all([
      readAsset('terrain/relief.json'),...['canal','sui-tang','yuan','heritage','administration','cities'].map(name=>readAsset(`data/${name}.geojson`)),readAsset('data/hydrology/index.json')])
    const [w,s,e,n]=terrain.bounds
    gl.addSource('terrain',{type:'image',url:asset('terrain/relief.webp'),coordinates:[[w,n],[e,n],[e,s],[w,s]]})
    gl.addLayer({id:'terrain',type:'raster',source:'terrain',paint:{'raster-opacity':.96,'raster-fade-duration':0}})
    const visible=key=>bridge.layers[key].layer.getVisible()?'visible':'none'
    gl.setLayoutProperty('terrain','visibility',visible('terrain'))
    const source=(id,data)=>gl.addSource(id,{type:'geojson',data})
    const empty={type:'FeatureCollection',features:[]}
    source('admin',admin);gl.addLayer({id:'admin',type:'line',source:'admin',layout:{visibility:visible('administration')},paint:{'line-color':'#a7a28d','line-width':.6,'line-dasharray':[4,4]}})
    source('water-surfaces',empty);gl.addLayer({id:'water-surfaces',type:'fill',source:'water-surfaces',layout:{visibility:visible('lakes')},paint:{'fill-color':'#9dbdc1','fill-opacity':.6}})
    for(let i=1;i<=5;i++){source('water-'+i,empty);gl.addLayer({id:'water-'+i,type:'line',source:'water-'+i,layout:{visibility:visible('rivers')},paint:{'line-color':'#7899a2','line-width':[1.4,1.1,.9,.7,.6][i-1],'line-opacity':.8}})}
    for(const [id,data,color,width,dash] of [['canal',canal,'#45492f',4,null],['sui-tang',sui,'#a36149',2,[6,3]],['yuan',yuan,'#3d6c72',1.8,[2,3]]]){
      source(id,data)
      if(id==='canal')gl.addLayer({id:'halo',type:'line',source:id,layout:{visibility:visible(id)},paint:{'line-color':'#f8f4df','line-width':6}})
      gl.addLayer({id,type:'line',source:id,layout:{visibility:visible(id)},paint:{'line-color':color,'line-width':width,...(dash?{'line-dasharray':dash}:{})}})
    }
    source('heritage',heritage)
    for(const [level,color,radius] of [['provincial','#5f6039',3],['national','#9b702d',4],['world','#9a503d',5]])gl.addLayer({id:level,type:'circle',source:'heritage',filter:['==',['get','source_level'],level],layout:{visibility:visible(level)},paint:{'circle-radius':radius,'circle-color':color,'circle-stroke-color':'#faf6e9','circle-stroke-width':1.2}})
    const photo=createPhotoPopup({host:container,project:coord=>{const p=gl.project(coord);return[p.x,p.y]},onRead:read,onInteract:interact})
    gl.on('render',photo.update)
    gl.on('click',event=>{
      const f=gl.queryRenderedFeatures(event.point,{layers:['world','national','provincial']})[0]
      if(f){interact();const original=bridge.heritage.find(item=>item.getId()===f.id || (item.get('source_level')===f.properties.source_level && item.get('ID')===f.properties.ID));if(original)void photo.show(original,f.geometry.coordinates).then(found=>{if(!found)read(original)})}
      else photo.hide()
    })
    gl.on('dragstart',interact);gl.on('zoomstart',e=>{if(e.originalEvent)interact()})
    const contextLost=()=>{if(!closed)fallback()}
    gl.getCanvas().addEventListener('webglcontextlost',contextLost)
    gl.on('error',()=>{if(!closed)fallback()})
    let labels=[]
    function labelPlaces() {
      labels.forEach(marker=>marker.remove());labels=[]
      const bounds=gl.getBounds(),zoom=gl.getZoom(),occupied=[]
      const add=(coord,text,kind)=>{const p=gl.project(coord);if(p.x<30||p.x>container.clientWidth-40||p.y<70||p.y>container.clientHeight-110)return
        if(occupied.some(v=>Math.abs(v.x-p.x)<110&&Math.abs(v.y-p.y)<30))return
        occupied.push(p);const el=document.createElement('span');el.className='tilt-label '+kind;el.textContent=text
        labels.push(new maplibregl.Marker({element:el,offset:[0,-18]}).setLngLat(coord).addTo(gl))}
      for(const f of bridge.nodes.getSource().getFeatures()) add(toLonLat(f.getGeometry().getCoordinates()),f.get('label'),'station-label')
      for(const f of heritage.features.filter(f=>f.properties.source_level==='world'&&bounds.contains(f.geometry.coordinates)).slice(0,12))if(zoom>=9&&visible('world')==='visible')add(f.geometry.coordinates,displayName(f),'heritage-label')
      for(const f of cities.features.filter(f=>bounds.contains(f.geometry.coordinates)).slice(0,10))if(visible('cities')==='visible')add(f.geometry.coordinates,f.properties.name,'city-label')
    }
    let waterTicket=0
    const waterCache=new Map()
    const waterStatus=document.createElement('button');waterStatus.className='tilt-water-status';waterStatus.hidden=true
    waterStatus.textContent='部分水系分块未加载 · 点击重试';waterStatus.onclick=()=>{interact();void loadWater()};container.append(waterStatus)
    async function loadWater(){
      const ticket=++waterTicket,b=gl.getBounds(),zoom=gl.getZoom()
      const bounds=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()]
      const intersects=c=>intersectsBounds(bounds,c.bounds)
      const failures=await Promise.all([...water.rivers.map(t=>({id:'water-'+t.level,chunks:t.chunks,maxResolution:t.maxResolution})),{id:'water-surfaces',chunks:water.surfaces.chunks,maxResolution:null}].map(async tier=>{
        const chunks=tierVisible(tier,resolutionAtGLZoom(zoom))?tier.chunks.filter(intersects):[]
        const results=await Promise.allSettled(chunks.map(async c=>{
          const data=await readAsset('data/hydrology/'+c.file);waterCache.set(c.file,data);return data
        }))
        if(closed||ticket!==waterTicket)return false
        const features=[...new Map(chunks.flatMap(c=>waterCache.get(c.file)?.features||[]).map(f=>[f.id,f])).values()]
        gl.getSource(tier.id).setData({type:'FeatureCollection',features})
        return results.some(r=>r.status==='rejected')
      }))
      if(!closed&&ticket===waterTicket)waterStatus.hidden=!failures.some(Boolean)
    }
    let waterTimer
    gl.on('move',()=>{if(!waterTimer)waterTimer=setTimeout(()=>{waterTimer=undefined;if(!closed)void loadWater()},180)})
    gl.on('moveend',()=>{clearTimeout(waterTimer);waterTimer=undefined;labelPlaces();void loadWater()})
    const stop=()=>{flight++;gl.stop()}
    return {
      refreshLabels:labelPlaces,
      center:()=>gl.getCenter().toArray(),zoom:()=>gl.getZoom()+1,
      show(center,zoom){container.hidden=false;gl.resize();gl.jumpTo({center,zoom:zoom-1,pitch:50,bearing:0});labelPlaces();void loadWater()},
      hide(){stop();photo.hide();container.hidden=true},closePhoto:photo.hide,
      jump(center,zoom){stop();gl.jumpTo({center,zoom:zoom-1})},stop,
      travel(middle,end,travelZoom,zoom,done){
        stop();const ticket=flight
        const steps=[{zoom:Math.min(gl.getZoom(),travelZoom-1),duration:500},{center:middle,duration:800},{center:end,duration:850},{zoom:zoom-1,duration:500}]
        const next=()=>{if(ticket!==flight||closed)return;const step=steps.shift();if(!step){done();return}gl.once('moveend',next);gl.easeTo({...step,essential:!reducedMotion.matches})};next()
      },
      destroy(){closed=true;gl.getCanvas().removeEventListener('webglcontextlost',contextLost);clearTimeout(waterTimer);stop();photo.hide();labels.forEach(m=>m.remove());gl.remove();container.remove()},
    }
  } catch(error){closed=true;gl?.remove();container.remove();throw error}
}

