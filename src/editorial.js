import tourText from '../content/route-tour.md?raw'
import cultureText from '../content/culture.md?raw'
import statisticsText from '../content/statistics.md?raw'
import { asset, readAsset, reducedMotion } from './assets.js'

const el = (id) => document.getElementById(id)
const sections = (source) => [...source.replaceAll('\r', '').matchAll(/^## (.+)\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)]
  .map(([, title, body]) => ({ title, paragraphs: body.trim().split(/\n\s*\n/)
    .map((paragraph) => paragraph.replaceAll('**', '').trim()).filter((paragraph) => paragraph && paragraph !== '---') }))

function element(tag, text, className) {
  const node = document.createElement(tag)
  if (text) node.textContent = text
  if (className) node.className = className
  return node
}

const paragraphs = (texts) => texts.map((text) => element('p', text))
const button = (label, action) => {
  const control = element('button', label, 'editorial-button')
  control.type = 'button'
  control.addEventListener('click', action)
  return control
}
const city = (name) => ({ city: name, label: name })
const site = (id, label) => ({ heritage: id, label })
const tianjin = {
  label: '三岔河口',
  coordinates: [117.1842, 39.14907],
  source: 'https://www.tjl.tj.cn/ArticleContent.aspx?ChannelId=241&ID=27727',
  positionSource: 'https://zh.wikipedia.org/wiki/三岔河口',
}
const stops = [
  site('provincial-388', '燃灯塔'), tianjin, site('world-29', '临清运河钞关'),
  site('world-40', '汶上南旺枢纽'), site('world-12', '清口枢纽'), site('world-11', '淮扬运河扬州段'),
  site('world-25', '宝带桥'), site('world-50', '杭州拱宸桥'),
].map((stop) => ({ image: null, audio: null, ...stop }))
const tourChapters = sections(tourText)
const tourStops = tourChapters.filter(({ title }) => /^第.+站/.test(title))
let stopIndex = 0
let tourMap

export async function showTour(index, map, returnHash='#atlas') {
  if (!Number.isInteger(index) || index < 0 || index >= stops.length) return
  const { enterStory } = await import('./story-tour.js')

  await enterStory(index, map.storyBridge, stops.map((stop,i)=>({...stop,...tourStops[i]})), returnHash)
}
el('tour-start').addEventListener('click', () => { location.hash='atlas?tour=1' })
el('enter-story').addEventListener('click', () => { location.hash='atlas?tour=1' })

export { showHistory } from './history-page.js'

const cultureChapters = sections(cultureText)
const cultureTitles = ['因河而兴：城市发展', '舟楫往来：漕运与商业', '因水制宜：水利工程',
  '南北交融：文化交流', '古河新生：当代保护与利用']
const culturePlaces = [
  [stops[1], stops[2], stops[4], stops[5], stops[6], stops[7]],
  [stops[2], stops[4], site('world-9', '盐宗庙')],
  [stops[3], stops[4], stops[6]],
  [city('苏州市'), city('扬州市'), city('北京市')],
  [stops[7], site('world-48', '杭州桥西历史文化街区'), stops[0]],
]
const mapPlaces = new Map()

function placeLink(place, id) {
  mapPlaces.set(id, place)
  const link = element('a', place.label, 'text-link')
  link.href = `#atlas?place=${id}`
  return link
}

export const getMapPlace = (id) => mapPlaces.get(id)

import './culture-exhibition.js'

export {loadStatistics} from './statistics-dashboard.js'
