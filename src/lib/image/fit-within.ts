export interface ImageSize {
  width: number
  height: number
}

/**
 * Scales width × height down, keeping the aspect ratio, so neither side
 * exceeds maxSize. Images that already fit are returned unchanged.
 */
export function fitWithin(width: number, height: number, maxSize: number): ImageSize {
  const scale = Math.min(1, maxSize / Math.max(width, height))
  return {
    width:  Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
