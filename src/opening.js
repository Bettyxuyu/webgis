import { asset, readAsset, reducedMotion } from './assets.js'

const duration = 5200
const mercator = ([lon, lat]) => [
  lon * 20037508.342789244 / 180,
  6378137 * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)),
]
const [west, south] = mercator([108.2, 28])
const [east, north] = mercator([124.2, 42])
const project = ([x, y]) => [(x - west) / (east - west) * 940, (north - y) / (north - south) * 760]
const position = (coordinate) => project(mercator(coordinate))

function svg(tag, attrs) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
  return node
}

async function drawOpening(target) {
  const [terrain, route, sites] = await Promise.allSettled([
    readAsset('terrain/relief.json'), readAsset('data/canal.geojson'), readAsset('data/heritage.geojson'),
  ])
  if (target.closest('#opening').hidden) return
  if (terrain.status === 'fulfilled') {
    const [left, bottom, right, top] = terrain.value.extent
    const [x, y] = project([left, top])
    const [rightPx, bottomPx] = project([right, bottom])
    target.append(svg('image', { x, y, width: rightPx - x, height: bottomPx - y,
      href: asset('terrain/relief.webp'), class: 'opening-relief', preserveAspectRatio: 'none' }))
  }
  if (route.status === 'fulfilled') {
    const defs = svg('defs', {})
    const clip = svg('clipPath', { id: 'opening-line-clip' })
    clip.append(svg('rect', { width: 940, height: 760, class: 'opening-sweep' }))
    defs.append(clip)
    const lines = svg('g', { 'clip-path': 'url(#opening-line-clip)', class: 'opening-lines' })
    for (const { geometry } of route.value.features) {
      const parts = geometry.type === 'MultiLineString' ? geometry.coordinates : [geometry.coordinates]
      for (const part of parts) {
        const points = part.map(position).map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`)
        lines.append(svg('path', { d: 'M' + points.join('L') }))
      }
    }
    target.append(defs, lines)
  }
  if (sites.status === 'fulfilled') {
    const keys = ['provincial-388', 'world-29', 'world-40', 'world-12', 'world-25', 'world-50']
    const selected = sites.value.features.filter(({ id }) => keys.includes(id))
      .sort((a, b) => b.geometry.coordinates[1] - a.geometry.coordinates[1])
    selected.forEach(({ geometry }, index) => {
      const [cx, cy] = position(geometry.coordinates)
      target.append(svg('circle', { cx, cy, r: 4.2, class: 'opening-point',
        style: `--point-delay:${2100 + index * 330}ms` }))
    })
  }
}

export function startOpening() {
  if (location.hash && location.hash !== '#prologue' || reducedMotion.matches) return
  try {
    if (sessionStorage.getItem('canal-opening-seen')) return
    sessionStorage.setItem('canal-opening-seen', '1')
  } catch { /* Storage may be unavailable on some hosts. */ }
  const opening = document.getElementById('opening')
  const skip = document.getElementById('skip-opening')
  const underlying = [document.querySelector('.masthead'), document.querySelector('main')]
  let timer
  let ending
  function finish() {
    clearTimeout(timer)
    clearTimeout(ending)
    opening.hidden = true
    underlying.forEach((node) => { node.inert = false })
    window.removeEventListener('hashchange', finish)
    reducedMotion.removeEventListener('change', motionChanged)
    if (!location.hash || location.hash === '#prologue') document.getElementById('prologue-title').focus({ preventScroll: true })
  }
  function motionChanged() { if (reducedMotion.matches) finish() }
  opening.hidden = false
  underlying.forEach((node) => { node.inert = true })
  skip.focus()
  skip.addEventListener('click', finish, { once: true })
  window.addEventListener('hashchange', finish)
  reducedMotion.addEventListener('change', motionChanged)
  void drawOpening(document.getElementById('opening-map'))
  timer = setTimeout(() => {
    opening.classList.add('opening-out')
    ending = setTimeout(finish, 450)
  }, duration)
}
