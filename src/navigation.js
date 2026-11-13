import './style.css'
import { leaveHistory } from './history-page.js'
import { getMapPlace, loadStatistics, showHistory, showTour } from './editorial.js'
import { startOpening } from './opening.js'

const pages = [...document.querySelectorAll('[data-page]')]
const links = document.querySelectorAll('.chapters a')
let atlasModule
let navigationId = 0
let previousHash='#prologue'
let savedHistory

async function showPage(focusHeading = false) {
  if(location.hash==='#tour'){
    const ticket=++navigationId;atlasModule ??= import('./main.js');const map=await atlasModule;await map.mapReady;if(ticket!==navigationId||location.hash!=='#tour')return;if(previousHash==='#history'){savedHistory={elapsed:map.historyController.getState().elapsed,center:map.storyBridge.view.getCenter().slice(),zoom:map.storyBridge.view.getZoom()};leaveHistory()}map.mountMap(document.getElementById('atlas-map-host'),'atlas');
    for(const link of links){if(link.hash==='#tour')link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')}
    showTour(0,map,previousHash);return
  }
  const returnHash=previousHash
  if(!location.hash.includes('tour='))previousHash=location.hash||'#prologue'
  document.dispatchEvent(new Event('leave-story'))
  leaveHistory()
  const request = ++navigationId
  const [requested, query] = location.hash.slice(1).split('?')
  const params = new URLSearchParams(query)
  const current = pages.find((page) => page.dataset.page === requested) ?? pages[0]
  for (const page of pages) page.hidden = page !== current
  for (const link of links) {
    if (link.hash === '#' + current.dataset.page) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
  if (focusHeading) {
    window.scrollTo(0, 0)
    current.querySelector('h1, h2').focus({ preventScroll: true })
  }
  if (current.dataset.page === 'culture') {
    void loadStatistics()
    if (params.get('section') === 'stats') {
      document.getElementById('statistics-title').focus({ preventScroll: true })
      document.getElementById('statistics').scrollIntoView()
    }
  }
  if (['atlas', 'history'].includes(current.dataset.page)) {
    try {
      atlasModule ??= import('./main.js')
      const map = await atlasModule
      if (request !== navigationId) return
      const mode = current.dataset.page
      map.mountMap(document.getElementById(`${mode}-map-host`), mode)
      await map.mapReady
      if (request !== navigationId) return
      if (mode === 'history') {await showHistory(map);if(savedHistory){map.historyController.restoreReading(savedHistory);savedHistory=undefined}}
      else if (params.has('tour')) showTour(Number(params.get('tour')) - 1, map, returnHash)
      else if (params.has('place')) {
        const place = getMapPlace(params.get('place'))
        if (place) map.locatePlace(place)
      }
    } catch (error) {
      document.getElementById('map-status').textContent = '地图初始化失败，请刷新页面重试'
      console.error(error)
    }
  }
}

window.addEventListener('hashchange', () => { void showPage(true) })
void showPage()
startOpening()
