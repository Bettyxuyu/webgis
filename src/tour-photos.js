import {readAsset,asset} from './assets.js'
import {enlargePhoto} from './heritage-archive.js'
const codes=['bj','tj','lq','jn','ha','yz','sz','hz']
export function createTourPhotos(root,pause){
 const box=document.createElement('figure');box.className='tour-city-photos';box.innerHTML='<figcaption></figcaption><button class="city-photo-open" aria-label="放大城市照片"><img alt=""></button><div><button aria-label="上一张城市照片">←</button><span></span><button aria-label="下一张城市照片">→</button></div><p></p>';root.append(box)
 const image=box.querySelector('img'),buttons=box.querySelectorAll('button');let images=[],index=0,ticket=0,title=''
 const render=()=>{image.src=asset(images[index].url);image.alt=title;box.querySelector('span').textContent=`${index+1} / ${images.length}`}
 buttons[0].onclick=()=>{pause();enlargePhoto(image.src,title)}
 for(const [button,delta]of[[buttons[1],-1],[buttons[2],1]])button.onclick=()=>{pause();index=(index+delta+images.length)%images.length;render()}
 image.onerror=()=>{box.querySelector('p').textContent='照片暂未加载，请切换或重试'}
 return {async show(station,name){const request=++ticket;title=name;box.querySelector('figcaption').textContent=name;box.querySelector('p').textContent='';
  const local=import.meta.env.DEV||import.meta.env.MODE==='review';const data=local?await readAsset('media/review/tour-index.json').catch(()=>({})):{}
  if(request!==ticket||!box.isConnected)return;images=data[codes[station]]||[];index=0
  box.querySelector('.city-photo-open').hidden=!images.length;box.querySelector('div').hidden=!images.length
  if(images.length)render();else box.querySelector('p').textContent='城市影像待补充'
 }}
}
