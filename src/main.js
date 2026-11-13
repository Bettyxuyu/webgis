import 'ol/ol.css'
import { installOpenBasemap } from './open-basemap.js'
import { createHistoryMap } from './history-map.js'
import { createPhotoPopup, displayName } from './photo-popup.js'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import Graticule from 'ol/layer/Graticule.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import ScaleLine from 'ol/control/ScaleLine.js'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js'
import { createEmpty, extend, isEmpty } from 'ol/extent.js'
import { fromLonLat, toLonLat } from 'ol/proj.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { Circle, Fill, Stroke, Style, Text } from 'ol/style.js'
import { cities, lakes, loadTerrain, loadHydrology, rivers, terrain, terrainColor, waterColor } from './background.js'
import { readAsset, reducedMotion } from './assets.js'
import { appendHeritageArchive, closeHeritageImage } from './heritage-archive.js'

const el = (id) => document.getElementById(id)
const levelConfig = [
  ['world', '世界级遗产点', '#9a503d', 6],
  ['national', '国家级遗产点', '#9b702d', 5],
  ['provincial', '省级遗产点', '#5f6039', 4],
]
const source = () => new VectorSource({ wrapX: false })
const stroke = (color, width) => new Stroke({ color, width })
const pointStyle = (color, radius) => new Style({
  image: new Circle({ radius, fill: new Fill({ color }), stroke: stroke('#fff9eb', 1.4) }),
})
const provinces = new VectorLayer({ updateWhileAnimating: true, updateWhileInteracting: true, source: source(), declutter: 'province-labels' })
const provinceStyle = new Style({
  fill: new Fill({ color: 'rgba(235,233,215,.12)' }),
  stroke: new Stroke({ color: 'rgba(107,97,76,.60)', width: 1, lineDash: [4, 4] }),
})
provinces.setStyle(provinceStyle)

function labelProvince(feature) {
  const geometry = feature.getGeometry()
  const largest = geometry.getType() === 'MultiPolygon'
    ? geometry.getPolygons().reduce((a, b) => a.getArea() >= b.getArea() ? a : b)
    : geometry
  feature.setStyle([provinceStyle, new Style({
    geometry: largest.getInteriorPoint(),
    text: new Text({ text: feature.get('name'), font: '13px "Microsoft YaHei", sans-serif',
      fill: new Fill({ color: '#595745' }), stroke: stroke('#ece8d9', 3) }),
  })])
}

const canalWide = [
  new Style({ stroke: stroke('rgba(250,246,224,.85)', 6.7) }),
  new Style({ stroke: stroke('#45492f', 4.4) }),
]
const canalLocal = [
  new Style({ stroke: stroke('rgba(250,246,224,.85)', 6) }),
  new Style({ stroke: stroke('#45492f', 4) }),
]
const canal = new VectorLayer({ updateWhileAnimating: true, updateWhileInteracting: true, source: source(),
  style: (_feature, resolution) => resolution < 200 ? canalLocal : canalWide })
const historyColors = { 'sui-tang': '#a36149', yuan: '#3d6c72' }
const historyLayers = Object.fromEntries(Object.entries(historyColors).map(([key, color]) => [
  key, new VectorLayer({ updateWhileAnimating: true, updateWhileInteracting: true,
    source: source(), visible: true,
    style: new Style({ stroke: new Stroke({ color, width: key === 'sui-tang' ? 2 : 1.8,
      lineDash: key === 'sui-tang' ? [12, 6] : [3, 5] }) }),
  }),
]))
const heritageLayers = Object.fromEntries(levelConfig.map(([key, , color, radius]) => {
  const style = pointStyle(color, radius)
  const named = new WeakMap()
  return [key, new VectorLayer({ updateWhileAnimating: true, updateWhileInteracting: true,
    source: source(), declutter: 'heritage',
    style: (feature, resolution) => {
      if (key === 'provincial' && resolution > 8000) return
      if (resolution > (key === 'world' ? 220 : key === 'national' ? 45 : 0)) return style
      if (!named.has(feature)) {
        const label = new Style({
          text: new Text({ text: displayName(feature), offsetY: -15, font: '12px "Microsoft YaHei", sans-serif',
            fill: new Fill({ color: '#434b37' }), stroke: stroke('#f4f0df', 3) }),
        })
        named.set(feature, [style, label])
      }
      return named.get(feature)
    },
  })]
}))
const activePointStyle = pointStyle('#292b27', 8)
activePointStyle.setText(new Text({
  offsetY: -18, font: 'bold 12px "Microsoft YaHei", sans-serif',
  fill: new Fill({ color: '#34392f' }), stroke: stroke('#f4f0df', 3),
}))
const highlight = new VectorLayer({ updateWhileAnimating: true, updateWhileInteracting: true, source: source(), style: (feature) => {
  activePointStyle.getText().setText(displayName(feature) || '')
  return activePointStyle
} })
const nodes = new VectorLayer({ updateWhileAnimating: true, updateWhileInteracting: true,
  source: source(),
  style: (feature) => new Style({
    image: pointStyle('#9a503d', 6).getImage(),
    text: new Text({ text: feature.get('label'), offsetY: -17, font: 'bold 13px system-ui',
      fill: new Fill({ color: '#292b27' }), stroke: stroke('#f8f4e5', 3) }),
  }),
})
const view = new View({ center: [0, 0], zoom: 2, minZoom: 2, maxZoom: 18, enableRotation: false, multiWorld: false })
const graticule = new Graticule({ updateWhileAnimating:true, updateWhileInteracting:true,
  strokeStyle: new Stroke({ color: 'rgba(91,113,98,.12)', width: .75, lineDash: [3, 6] }),
  showLabels: true, wrapX: false, latLabelPosition: .87, lonLabelPosition: .055,
})
const map = new Map({
  target: 'map',
  layers: [terrain, provinces, graticule, rivers, lakes, cities, canal,
    ...Object.values(historyLayers), ...Object.values(heritageLayers).reverse(), highlight, nodes],
  view,
  controls: defaultControls({ zoom: false, rotate: false }).extend([new ScaleLine()]),
  interactions: defaultInteractions({ altShiftDragRotate: false, pinchRotate: false }),
})
const format = new GeoJSON()
const overview = createEmpty()
const checkboxes = {}
const heritage = []
let activeFeature
let initialFitPending = true
let terrainExtent
let historyState
let fadeFrame
let resizeFrame
const mapObserver = new ResizeObserver(() => {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => map.updateSize())
})
mapObserver.observe(el('map'))
view.on('change:resolution', () => graticule.setVisible(view.getResolution() >= 300))

function setDetailsVisible(visible) {
  el('page-atlas').classList.toggle('detail-collapsed', !visible)
  el('toggle-detail').setAttribute('aria-expanded', String(visible))
  closeHeritageImage()
}
el('toggle-detail').addEventListener('click', () => {
  setDetailsVisible(el('page-atlas').classList.contains('detail-collapsed'))
})

function emphasizeRoute(key) {
  if (historyState) return
  for (const [name, layer] of Object.entries({ canal, ...historyLayers })) {
    layer.setOpacity(!key || name === key ? 1 : .28)
  }
}

function addGroup(label, open = false) {
  const group = document.createElement('details')
  group.className = 'layer-group'
  group.open = open
  const summary = document.createElement('summary')
  const count = document.createElement('small')
  summary.append(label, count)
  group.append(summary)
  el('layers').append(group)
  return { group, count }
}

function addLayerControl(section, key, label, layer, color, symbol, status = '') {
  const row = document.createElement('label')
  const box = document.createElement('input')
  box.type = 'checkbox'
  box.checked = layer.getVisible()
  box.disabled = true
  box.setAttribute('aria-label', label)
  const mark = document.createElement('span')
  mark.className = 'mark ' + symbol
  mark.style.setProperty('--mark-color', color)
  const name = document.createElement('span')
  name.textContent = label
  const count = document.createElement('span')
  count.className = 'count'
  count.textContent = status
  row.append(box, mark, name, count)
  if (key in historyLayers || key === 'canal') {
    row.addEventListener('pointerenter', () => emphasizeRoute(key))
    row.addEventListener('pointerleave', () => emphasizeRoute())
    box.addEventListener('focus', () => emphasizeRoute(key))
    box.addEventListener('blur', () => emphasizeRoute())
  }
  section.group.append(row)
  const synchronize = () => {
    box.checked = layer.getVisible()
    const enabled = section.group.querySelectorAll('input:checked:not(:disabled)').length
    section.count.textContent = `${enabled} 已启用`
  }
  box.addEventListener('change', () => {
    layer.setVisible(box.checked)
    if (!box.checked && activeFeature?.get('source_level') === key) clearDetail()
  })
  layer.on('change:visible', synchronize)
  checkboxes[key] = { box, count, layer, synchronize }
  synchronize()
}

const routes = addGroup('运河线路', true)
addLayerControl(routes, 'canal', '京杭大运河', canal, '#45492f', 'line')
addLayerControl(routes, 'sui-tang', '隋唐运河', historyLayers['sui-tang'], historyColors['sui-tang'], 'dash', '历史概化示意')
addLayerControl(routes, 'yuan', '元代运河', historyLayers.yuan, historyColors.yuan, 'dash', '历史概化示意')
const sites = addGroup('文化遗产')
levelConfig.forEach(([key, label, color]) => addLayerControl(sites, key, label, heritageLayers[key], color, 'dot'))
const natural = addGroup('自然地理')
addLayerControl(natural, 'terrain', '绿色地形底图', terrain, terrainColor, 'area')
addLayerControl(natural, 'rivers', '五级水系', rivers, waterColor, 'line')
addLayerControl(natural, 'lakes', '湖泊与河流面', lakes, waterColor, 'area')
const reference = addGroup('地理参照')
addLayerControl(reference, 'administration', '省级区划', provinces, '#92856f', 'dash')
addLayerControl(reference, 'cities', '城市注记', cities, '#4d5140', 'dot')

function resetView() {
  if (historyState) { historyController.reset(); return }
  const size = map.getSize()
  if (!size?.every((dimension) => dimension > 0) || isEmpty(overview)) return
  initialFitPending = false
  view.cancelAnimations()
  view.fit(overview, { padding: [65, 78, 55, 65], maxZoom: 12 })
}

export function refreshMapSize() {
  map.updateSize()
  if (!historyState && initialFitPending && !el('reset').disabled) resetView()
}

el('reset').addEventListener('click', resetView)
el('terrain-overview').addEventListener('click', () => {
  if (!terrainExtent) return
  view.cancelAnimations()
  view.fit(terrainExtent, { padding: [44, 55, 44, 44] })
})
el('zoom-in').addEventListener('click', () => view.adjustZoom(1))
el('zoom-out').addEventListener('click', () => view.adjustZoom(-1))

const display = (value) => String(value ?? '').trim() || '未记录'
const place = (f) => [...new Set(['Prov_CN', 'Muni_CN', 'Coun_CN']
  .map((key) => String(f.get(key) ?? '').trim()).filter(Boolean))].join(' / ')
const titleOf = (f) => displayName(f) || f.get('Heri_EN') || '名称未记录'

function showDetail(feature, locate = false, photos = true) {
  if (photos) void photo.show(feature, feature.getGeometry().getCoordinates())
  setDetailsVisible(true)
  if (locate) nodes.getSource().clear()
  const key = feature.get('source_level')
  const { box, layer } = checkboxes[key]
  box.checked = true
  layer.setVisible(true)
  activeFeature = feature
  highlight.getSource().clear()
  highlight.getSource().addFeature(feature)
  const coordinate = feature.getGeometry().getCoordinates()
  if (locate) {
    view.cancelAnimations()
    const zoom = Math.max(view.getZoom(), 12)
    if (reducedMotion.matches) {
      view.setCenter(coordinate)
      view.setZoom(zoom)
    } else {
      view.animate({ center: coordinate, zoom, duration: 260 })
    }
  }
  const name = document.createElement('h4')
  name.textContent = titleOf(feature)
  const list = document.createElement('dl')
  const fields = [
    ['英文名称', feature.get('Heri_EN')],
    ['遗产类型', feature.get('Type_CN') || feature.get('Type_EN')],
    ['所属地区', place(feature)],
    ['保护级别', feature.get('Prot_CN') || feature.get('Prot_EN')],
    ['点位经纬度', toLonLat(coordinate).map((value) => value.toFixed(6)).join(', ')],
  ]
  for (const [label, value] of fields) {
    const term = document.createElement('dt')
    const text = document.createElement('dd')
    term.textContent = label
    text.textContent = display(value)
    list.append(term, text)
  }
  el('details').replaceChildren(name, list)
  const archive = document.createElement('div')
  el('details').append(archive)
  void appendHeritageArchive(feature, archive)
  el('close-detail').hidden = false
}

function clearDetail() {
  closeHeritageImage()
  activeFeature = undefined
  highlight.getSource().clear()
  const hint = document.createElement('p')
  hint.className = 'hint'
  hint.textContent = '点击地图标记或选择搜索结果，查看原始数据中的遗产信息。'
  el('details').replaceChildren(hint)
  el('close-detail').hidden = true
}

el('close-detail').addEventListener('click', () => setDetailsVisible(false))
const hitOptions = { layerFilter: (layer) => Object.values(heritageLayers).includes(layer), hitTolerance: 4 }
map.on('singleclick', (event) => {
  if(historyState) return
  const feature = map.forEachFeatureAtPixel(event.pixel, (hit) => hit, hitOptions)
  if (feature) {
    if (document.body.classList.contains('story-active')) void photo.show(feature, feature.getGeometry().getCoordinates()).then(found => { if(!found) showDetail(feature, false, false) })
    else showDetail(feature)
  }
  else { photo.hide(); clearDetail(); setDetailsVisible(false) }
})
map.on('pointermove', (event) => {
  if (event.dragging) return
  map.getTargetElement().style.cursor = map.hasFeatureAtPixel(event.pixel, hitOptions) ? 'pointer' : ''
  const line = map.forEachFeatureAtPixel(event.pixel, (_feature, layer) => layer, {
    layerFilter: (layer) => layer === canal || Object.values(historyLayers).includes(layer), hitTolerance: 3,
  })
  const key = Object.entries({ canal, ...historyLayers }).find(([, layer]) => layer === line)?.[0]
  emphasizeRoute(key)
})
map.getViewport().addEventListener('pointerleave', () => emphasizeRoute())

const normalize = (value) => String(value ?? '').normalize('NFKC').toLocaleLowerCase().trim()
function search() {
  const query = normalize(el('query').value)
  const results = el('results')
  results.replaceChildren()
  if (!query) {
    el('search-summary').textContent = '输入遗产名称，支持中英文关键词'
    return
  }
  const matches = heritage.filter((f) => ['Heri_CN', 'Heri_EN'].some((field) => normalize(field === 'Heri_CN' ? displayName(f) : f.get(field)).includes(query)))
  el('search-summary').textContent = matches.length > 30
    ? `找到 ${matches.length} 条，显示前 30 条，请缩小关键词范围`
    : matches.length ? `找到 ${matches.length} 条，选择结果定位` : '未找到匹配遗产'
  for (const feature of matches.slice(0, 30)) {
    const item = document.createElement('li')
    const button = document.createElement('button')
    const label = document.createElement('strong')
    const description = document.createElement('small')
    button.type = 'button'
    label.textContent = titleOf(feature)
    description.textContent = place(feature) || '地区未记录'
    button.append(label, description)
    button.addEventListener('click', () => showDetail(feature, true))
    item.append(button)
    results.append(item)
  }
}

el('search-form').addEventListener('submit', (event) => { event.preventDefault(); search() })
el('query').addEventListener('input', search)

async function loadFeatures(name) {
  return format.readFeatures(await readAsset(`data/${name}.geojson`), { dataProjection: 'EPSG:4326', featureProjection: view.getProjection() })
}

function populate(key, features) {
  const { box, count, layer, synchronize } = checkboxes[key]
  layer.getSource().addFeatures(features)
  box.disabled = false
  if (key in heritageLayers) count.textContent = features.length
  synchronize()
  if (key === 'canal' || key in heritageLayers || key in historyLayers) extend(overview, layer.getSource().getExtent())
}

function markTerrainError(message) {
  const { box, count } = checkboxes.terrain
  box.checked = false
  box.disabled = true
  count.textContent = '不可用'
  terrain.setVisible(false)
  checkboxes.terrain.synchronize()
  el('terrain-status').textContent = message
}

async function loadMap() {
  const outcomes = await Promise.allSettled([
    loadFeatures('canal').then((features) => populate('canal', features)),
    loadFeatures('heritage').then((features) => {
      heritage.push(...features)
      for (const [key] of levelConfig) populate(key, features.filter((f) => f.get('source_level') === key))
      el('query').disabled = el('search-button').disabled = false
      search()
    }),
    loadFeatures('administration').then((features) => {
      features.forEach(labelProvince)
      populate('administration', features)
    }),
    loadHydrology().then(() => {
      for (const key of ['rivers', 'lakes']) {
        checkboxes[key].box.disabled = false
        checkboxes[key].synchronize()
      }
    }),
    loadFeatures('cities').then((features) => populate('cities', features)),
    ...Object.keys(historyLayers).map((key) => loadFeatures(key).then((features) => populate(key, features)).catch((error) => {
      checkboxes[key].count.textContent = '加载失败'
      throw error
    })),
    loadTerrain(() => markTerrainError('地形影像加载失败')).then((extent) => {
      terrainExtent = extent
      checkboxes.terrain.box.disabled = false
      checkboxes.terrain.synchronize()
      el('terrain-overview').disabled = false
    }).catch((error) => {
      markTerrainError('地形范围加载失败')
      throw error
    }),
  ])
  const failed = outcomes.filter((result) => result.status === 'rejected')
  if (failed.length) {
    failed.forEach((result) => console.error(result.reason))
    el('map-status').textContent = `${failed.length} 组数据加载失败，可刷新重试`
  } else {
    el('map-status').textContent = ''
  }
  if (outcomes[1].status === 'rejected') el('search-summary').textContent = '遗产数据加载失败'
  el('reset').disabled = isEmpty(overview)
  if (!historyState && !el('page-atlas').hidden) resetView()
}

export const mapReady = loadMap()

export function mountMap(host, mode) {
  photo.hide()
  closeHeritageImage()
  const target = el('map')
  if (mode === 'history' && !historyState) {
    historyState = { center: view.getCenter(), zoom: view.getZoom(),
      layers: Object.values(checkboxes)
        .map(({ layer }) => [layer, layer.getVisible(), layer.getOpacity()]),
      nodes: nodes.getSource().getFeatures() }
    highlight.setVisible(false)
  } else if (mode === 'atlas' && historyState) {
    view.cancelAnimations()
    historyController.stop()
    view.setCenter(historyState.center)
    view.setZoom(historyState.zoom)
    for (const [layer, visible, opacity] of historyState.layers) {
      layer.setOpacity(opacity)
      layer.setVisible(visible)
    }
    nodes.getSource().clear()
    nodes.getSource().addFeatures(historyState.nodes)
    highlight.setVisible(true)
    historyState = undefined
  }
  openBasemap.allow(mode==='atlas')
  el('map-status').hidden = mode === 'history'
  el('map-scene').hidden = mode !== 'history'
  if (mode === 'atlas') el('map-caption').textContent = '京杭大运河'
  if (target.parentElement !== host) host.append(target)
  refreshMapSize()
}

function resolveNode(node) {
  if (node.coordinates) return fromLonLat(node.coordinates)
  return node.heritage
    ? heritage.find((feature) => feature.getId() === node.heritage)?.getGeometry().getCoordinates()
    : cities.getSource().getFeatures().find((feature) => feature.get('name') === node.city)?.getGeometry().getCoordinates()
}

function showNodes(places) {
  const markerSource = nodes.getSource()
  markerSource.clear()
  const markers = places.flatMap((place) => {
    const coordinate = resolveNode(place)
    return coordinate ? [new Feature({ geometry: new Point(coordinate), label: place.label })] : []
  })
  markerSource.addFeatures(markers)
  return markerSource.getExtent()
}

export function locatePlace(place) {
  if (place.heritage) {
    const feature = heritage.find((item) => item.getId() === place.heritage)
    if (feature) {
      showDetail(feature, true)
      return
    }
  }
  clearDetail()
  const extent = showNodes([place])
  if (!isEmpty(extent)) view.fit(extent, { maxZoom: 12, duration: reducedMotion.matches ? 0 : 560 })
}


const photo = createPhotoPopup({ host: el('map'), project: point => map.getPixelFromCoordinate(point),
  onRead: feature => showDetail(feature, false, false),
  onInteract: () => document.dispatchEvent(new Event('story-interact')) })
map.on('postrender', photo.update)
el('toggle-tools').addEventListener('click', () => {
  const closed=el('page-atlas').classList.toggle('tools-collapsed')
  el('toggle-tools').setAttribute('aria-expanded', String(!closed))
})
export const storyBridge = { map, view, heritage, canal, nodes, photo, resolveNode, showNodes,
  hideDetails: () => setDetailsVisible(false),
  showDetail: feature => showDetail(feature, false, false),
  layers: checkboxes,
  getSelection: () => activeFeature,
  restoreSelection: feature => { if(feature) showDetail(feature, false, false); else clearDetail() },
  coordinates: () => format.writeFeaturesObject(canal.getSource().getFeatures(), {featureProjection:'EPSG:3857', dataProjection:'EPSG:4326'}) }

export const historyController = createHistoryMap({map,view,resolveNode,heritage,photo,nodes,
  baseLayers:{routes:[canal,...Object.values(historyLayers)],heritage:Object.values(heritageLayers),cities,rivers,lakes,provinces,terrain}})
map.getViewport().addEventListener('pointerdown',()=>{if(historyState)document.dispatchEvent(new Event('history-interact'))})
map.getViewport().addEventListener('wheel',()=>{if(historyState)document.dispatchEvent(new Event('history-interact'))},{passive:true})

el('map').querySelector('.map-tools').addEventListener('click',()=>{if(historyState)document.dispatchEvent(new Event('history-interact'))},true)

const openBasemap=installOpenBasemap(map,terrain)
if(!window.matchMedia('(max-width:640px)').matches){el('page-atlas').classList.remove('tools-collapsed');el('toggle-tools').setAttribute('aria-expanded','true')}
