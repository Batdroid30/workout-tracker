import type { CSSProperties } from 'react'
import type { BodyRegion } from '@/lib/body-map'

export const DEFAULT_NEUTRAL_FILL = 'var(--surface-2)'
export const OUTLINE_STROKE = 'var(--glass-border)'
export const OUTLINE_STROKE_WIDTH = 0.3
export const FRONT_SYMBOL_ID = 'body-map-front'
export const BACK_SYMBOL_ID = 'body-map-back'

const NEUTRAL_VAR = '--bm-neutral'

// Defs polygons read their colour from CSS variables so one shared symbol can
// be tinted per instance.
export function variableFillStyle(region: BodyRegion | null): CSSProperties {
  const neutral = `var(${NEUTRAL_VAR}, ${DEFAULT_NEUTRAL_FILL})`
  const outline = { stroke: OUTLINE_STROKE, strokeWidth: OUTLINE_STROKE_WIDTH }
  if (!region) return { fill: neutral, ...outline }
  return {
    fill: `var(--bm-${region}, ${neutral})`,
    fillOpacity: `var(--bm-${region}-o, 1)`,
    ...outline,
  }
}

interface InstanceColours {
  fills: Partial<Record<BodyRegion, string>>
  opacities?: Partial<Record<BodyRegion, number>>
  neutralFill?: string
}

// React.CSSProperties has no slot for custom properties, but React applies
// them to the DOM at runtime, so the one unavoidable widening lives here.
function asCustomProperties(variables: Record<string, string>): CSSProperties {
  return variables as CSSProperties
}

export function instanceVariables({ fills, opacities = {}, neutralFill }: InstanceColours): CSSProperties {
  const variables: Record<string, string> = {}
  if (neutralFill) variables[NEUTRAL_VAR] = neutralFill

  for (const [region, colour] of Object.entries(fills)) {
    variables[`--bm-${region}`] = colour
  }
  for (const [region, opacity] of Object.entries(opacities)) {
    variables[`--bm-${region}-o`] = String(opacity)
  }
  return asCustomProperties(variables)
}
