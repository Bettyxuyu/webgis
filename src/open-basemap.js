import TileLayer from 'ol/layer/Tile.js'
import XYZ from 'ol/source/XYZ.js'
export function installOpenBasemap(map,terrain){
 const publicFrance=import.meta.env.VITE_OSMFR_PUBLIC==='true'&&!['localhost','127.0.0.1',''].includes(location.hostname)
 const sources={
  osm:new XYZ({url:'https://tile.openmaps.fr/opentopomap/{z}/{x}/{y}.png',maxZoom:17,crossOrigin:'anonymous',attributionsCollapsible:false,attributions:'<a href="https://github.com/sletuffe/OpenTopoMap">© OpenTopoMap-R</a> · <a href="https://openmaps.fr/donate">支持服务</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>'}),
  france:new XYZ({url:'https://{a-c}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',maxZoom:20,crossOrigin:'anonymous',attributionsCollapsible:false,attributions:'<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors · ODbL</a> · <a href="https://www.openstreetmap.fr/">OSM-France · CC BY-SA</a>'})
 }
 const layer=new TileLayer({source:sources.osm,visible:false,preload:0});map.getLayers().insertAt(0,layer)
 const details=document.createElement('details');details.className='layer-group open-basemap';details.innerHTML='<summary>开源底图</summary><label><input type="radio" name="basemap" value="local" checked>专题地形</label><label><input type="radio" name="basemap" value="osm">OpenStreetMap 全球底图</label><label><input type="radio" name="basemap" value="france">OSM-France</label><p class="hint basemap-message" role="status"></p>'
 document.getElementById('layers').append(details);details.querySelector('[value=france]').disabled=!publicFrance
 const message=details.querySelector('p');let mode='local',saved=true,allowed=true,failed=0,changing=false
 const notice=()=>{message.textContent=publicFrance?'':'OSM-France仅供符合条件的公开站点使用；课堂版可选择全球底图。'};notice()
 function choose(value){if(value==='france'&&!publicFrance)return;changing=true;if(mode==='local'&&value!=='local')saved=terrain.getVisible();mode=value;failed=0;if(value!=='local'){terrain.setVisible(false);layer.setSource(sources[value]);layer.setVisible(allowed);message.textContent='在线底图需要互联网连接。'}else{layer.setVisible(false);terrain.setVisible(saved);notice()}details.querySelectorAll('input').forEach(i=>i.checked=i.value===mode);changing=false}
 terrain.on('change:visible',()=>{if(!changing&&allowed&&mode!=='local'&&terrain.getVisible()){saved=true;choose('local')}})
 details.addEventListener('change',e=>choose(e.target.value))
 for(const[key,source]of Object.entries(sources))source.on('tileloaderror',()=>{if(mode!==key)return;failed++;message.textContent='底图暂时无法加载，可切换回专题地形。';if(failed>=3){choose('local');message.textContent='底图暂不可用，已恢复专题地形。'}})
 return {layer,select:choose,allow(value){changing=true;allowed=value;layer.setVisible(value&&mode!=='local');if(!value)terrain.setVisible(true);else if(mode!=='local')terrain.setVisible(false);changing=false}}
}
