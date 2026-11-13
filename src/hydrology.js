import LayerGroup from 'ol/layer/Group.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import { intersectsBounds } from './water-policy.js'
import { transformExtent } from 'ol/proj.js'
import { intersects, getWidth, getHeight } from 'ol/extent.js'
import { Fill, Stroke, Style, Text } from 'ol/style.js'
import { readAsset } from './assets.js'

export const waterColor = '#648691'
export const rivers = new LayerGroup()
export const lakes = new LayerGroup()
const formatter = new GeoJSON()
const errors = new Set()

function reportError(file, failed) {
  if (failed) errors.add(file)
  else errors.delete(file)
  document.getElementById('water-status').textContent = errors.size ? '部分水系加载失败，移回该区域可重试。' : ''
}

function chunkSource(chunks) {
  const loaded = new Set()
  const source = new VectorSource({
    wrapX: false,
    strategy: (extent, _resolution, projection) => {
      const lonlat = transformExtent(extent, projection, 'EPSG:4326')
      return chunks.filter(chunk => intersectsBounds(lonlat, chunk.bounds))
        .map(chunk => transformExtent(chunk.bounds, 'EPSG:4326', projection))
    },
    loader: (extent, _resolution, projection, success, failure) => {
      const chunk = chunks.find(item => {
        const projected = transformExtent(item.bounds, 'EPSG:4326', projection)
        return projected.every((v,i) => Math.abs(v-extent[i]) < .01)
      })
      if (!chunk) { source.removeLoadedExtent(extent); failure?.(); return }
      const file = `data/hydrology/${chunk.file}`
      readAsset(file).then(data => {
        const features = formatter.readFeatures(data, { dataProjection:'EPSG:4326', featureProjection:projection })
        source.addFeatures(features)
        loaded.add(chunk.file)
        reportError(file, false)
        success?.(features)
      }).catch(() => {
        reportError(file, true)
        source.removeLoadedExtent(extent)
        failure?.()
      })
    },
  })
  source.set('loadedChunks', loaded)
  source.set('chunks', chunks)
  return source
}

function styleFor(level, polygon = false) {
  const stroke = new Stroke({
    color: polygon ? 'rgba(93,131,143,.65)' : ['#658793', '#74939c', '#829da4', '#91a8ac', '#a0b3b5'][level - 1],
    width: polygon ? .7 : [1.5, 1.2, 1, .85, .65][level - 1],
  })
  const basic = new Style({
    stroke, fill: polygon ? new Fill({ color: 'rgba(143,182,190,.55)' }) : undefined,
  })
  const labels = new Map()
  return (feature, resolution) => {
    const geometry = feature.getGeometry()
    const extent = geometry.getExtent()
    const size = Math.max(getWidth(extent), getHeight(extent)) / resolution
    if (size < (polygon ? 2 : 5)) return
    const name = feature.get('NAME')?.trim()
    if (!name || size < (polygon ? 38 : 140)) return basic
    if (!labels.has(name)) labels.set(name, new Style({
      text: new Text({
        text: name, placement: polygon ? 'point' : 'line', font: '11px "Microsoft YaHei", sans-serif',
        fill: new Fill({ color: '#456c78' }), stroke: new Stroke({ color: '#edf0df', width: 2.5 }),
      }),
    }))
    return [basic, labels.get(name)]
  }
}

let hydrologyLoad
export function loadHydrology(){
  hydrologyLoad ??= initializeHydrology().catch(error=>{hydrologyLoad=undefined;throw error})
  return hydrologyLoad
}
async function initializeHydrology() {
  const manifest = await readAsset('data/hydrology/index.json')
  if (manifest.projection !== 'EPSG:4326' || manifest.rivers.length !== 5) throw new Error('Invalid hydrology index')
  rivers.getLayers().extend(manifest.rivers.map((tier) => new VectorLayer({ updateWhileAnimating: true, updateWhileInteracting: true, renderBuffer: 180,
    source: chunkSource(tier.chunks), maxResolution: tier.maxResolution ?? Infinity,
    declutter: 'background-names', style: styleFor(tier.level),
  })))
  lakes.getLayers().extend([new VectorLayer({ updateWhileAnimating: true, updateWhileInteracting: true, renderBuffer: 180,
    source: chunkSource(manifest.surfaces.chunks), declutter: 'background-names', style: styleFor(1, true),
  })])
}
