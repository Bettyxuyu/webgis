const requests = new Map()
export const asset = (path) => import.meta.env.BASE_URL + path
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

export function readAsset(path) {
  if (!requests.has(path)) {
    requests.set(path, fetch(asset(path)).then((response) => {
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
      return response.json()
    }).catch((error) => {
      requests.delete(path)
      throw error
    }))
  }
  return requests.get(path)
}
