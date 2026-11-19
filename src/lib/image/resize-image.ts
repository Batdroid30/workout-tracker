import { fitWithin } from './fit-within'

// Avatars render at most ~128 px; 512 px leaves room for high-density screens
// while keeping the upload far below the 1 MB Server Action body limit.
export const AVATAR_MAX_SIZE = 512
const JPEG_QUALITY = 0.85

/**
 * Browser-only. Decodes an image file, scales it to fit within maxSize and
 * re-encodes it as a JPEG data URL. Phone photos are several MB, which is over
 * the Server Action body limit once base64-encoded, so they must shrink first.
 */
export async function resizeImageToDataUrl(file: File, maxSize: number = AVATAR_MAX_SIZE): Promise<string> {
  // createImageBitmap applies EXIF orientation, so phone photos stay upright.
  const bitmap = await createImageBitmap(file)
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSize)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser cannot process images.')
    context.drawImage(bitmap, 0, 0, width, height)

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } finally {
    bitmap.close()
  }
}
