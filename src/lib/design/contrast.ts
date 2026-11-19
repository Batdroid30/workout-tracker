export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Rgba extends Rgb {
  a: number
}

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const RGB_PATTERN =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i

function parseHex(digits: string): Rgba {
  const full = digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    a: 1,
  }
}

export function parseColor(value: string): Rgba {
  const text = value.trim()

  const hex = HEX_PATTERN.exec(text)
  if (hex) return parseHex(hex[1])

  const rgb = RGB_PATTERN.exec(text)
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    }
  }

  throw new Error(`Unsupported colour: ${value}`)
}

function linearise(channel: number): number {
  const scaled = channel / 255
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
}

// WCAG 2.x relative luminance for sRGB.
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b)
}

function compositeOver(foreground: Rgba, background: Rgb): Rgb {
  const mix = (top: number, bottom: number) => top * foreground.a + bottom * (1 - foreground.a)
  return { r: mix(foreground.r, background.r), g: mix(foreground.g, background.g), b: mix(foreground.b, background.b) }
}

export function contrastRatio(foreground: string, background: string): number {
  const backgroundRgb = parseColor(background)
  const foregroundRgb = compositeOver(parseColor(foreground), backgroundRgb)
  const first = relativeLuminance(foregroundRgb)
  const second = relativeLuminance(backgroundRgb)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}
