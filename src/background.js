import ImageLayer from 'ol/layer/Image.js'
import VectorLayer from 'ol/layer/Vector.js'
import ImageStatic from 'ol/source/ImageStatic.js'
import VectorSource from 'ol/source/Vector.js'
import { Fill, Stroke, Style, Text } from 'ol/style.js'
export { rivers, lakes, waterColor, loadHydrology } from './hydrology.js'

const base = import.meta.env.BASE_URL
export const terrainColor = '#a6bc91'
export const terrain = new ImageLayer({ opacity: .98 })
const vectorSource = () => new VectorSource({ wrapX: false })

export async function loadTerrain(onError) {
  const response = await fetch(`${base}terrain/relief.json`)
  if (!response.ok) throw new Error(`relief.json: HTTP ${response.status}`)
  const { projection, extent } = await response.json()
  if (projection !== 'EPSG:3857' || !Array.isArray(extent) || extent.length !== 4 ||
      !extent.every(Number.isFinite) || extent[0] >= extent[2] || extent[1] >= extent[3]) {
    throw new Error('Invalid relief projection or extent')
  }
  const source = new ImageStatic({ url: `${base}terrain/relief.webp`, projection, imageExtent: extent })
  source.on('imageloaderror', onError)
  terrain.setSource(source)
  return extent
}

function labelStyles(nameOf, color, placement = 'point') {
  const cache = new Map()
  return (feature) => {
    const name = nameOf(feature)
    if (!cache.has(name)) {
      cache.set(name, new Style({
        text: new Text({
          text: name, placement, font: '12px "Microsoft YaHei", sans-serif',
          fill: new Fill({ color }), stroke: new Stroke({ color: '#f1f2e2', width: 2.5 }),
        }),
      }))
    }
    return cache.get(name)
  }
}

const cityLabel = labelStyles((feature) => feature.get('name'), '#4d5140')
export const cities = new VectorLayer({ updateWhileAnimating: true, updateWhileInteracting: true,
  source: vectorSource(), declutter: 'background-names',
  style: (feature, resolution) => {
    if (resolution <= (feature.get('rank') === 1 ? 6000 : 2200)) return cityLabel(feature)
  },
})
