// Shared thresholds use Web Mercator map units per CSS pixel, not ground metres.
export const resolutionAtGLZoom = zoom => 40075016.68557849 / (512 * 2 ** zoom)
export const tierVisible = (tier, resolution) => tier.maxResolution == null || resolution < tier.maxResolution
export const intersectsBounds = (a,b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
