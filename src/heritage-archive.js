import { asset, readAsset } from './assets.js'

const textNode = (tag, text, className) => {
  const node = document.createElement(tag)
  node.textContent = text
  if (className) node.className = className
  return node
}
const viewer = document.createElement('dialog')
viewer.className = 'heritage-viewer'
viewer.setAttribute('aria-label', '遗产图片大图')
const close = textNode('button', '关闭大图', 'editorial-button')
close.type = 'button'
const large = document.createElement('img')
const largeCaption = textNode('p', '')
viewer.append(close, large, largeCaption)
document.body.append(viewer)
close.addEventListener('click', () => viewer.close())
viewer.addEventListener('click', (event) => { if (event.target === viewer) viewer.close() })
const safeWebURL = (value) => {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined
  } catch { return undefined }
}

export function closeHeritageImage() {
  if (viewer.open) viewer.close()
}

function sourceNode(label, value) {
  const url = safeWebURL(value)
  const node = textNode(url ? 'a' : 'span', label + value)
  if (url) {
    node.href = url
    node.rel = 'noopener noreferrer'
  }
  return node
}

export async function appendHeritageArchive(feature, target) {
  if (feature.get('source_level') !== 'world') return
  let entry
  try {
    entry = (await readAsset('data/world-archive.json'))[feature.getId()]
  } catch {
    if (target.isConnected) target.append(textNode('p', '补充档案暂未加载，可继续查看遗产属性。', 'hint'))
    return
  }
  if (!entry || !target.isConnected) return
  const article = document.createElement('section')
  article.className = 'heritage-archive'
  if (entry.intro) {
    article.append(textNode('h5', '遗产简介'), textNode('p', entry.intro))
  }
  if (article.childElementCount) {
    target.append(article)
  }
}

export function enlargePhoto(url, caption) {
  large.src = url; large.alt = caption; largeCaption.textContent = caption
  if (!viewer.open) viewer.showModal()
}
