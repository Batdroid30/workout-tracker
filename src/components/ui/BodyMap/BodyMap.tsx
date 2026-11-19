import type { KeyboardEvent } from 'react'
import { REGION_LABELS, type BodyRegion } from '@/lib/body-map'
import { ANTERIOR_PATHS, POSTERIOR_PATHS, ANTERIOR_VIEWBOX, POSTERIOR_VIEWBOX, type BodyPolygon } from './body-paths'
import {
  BACK_SYMBOL_ID,
  DEFAULT_NEUTRAL_FILL,
  FRONT_SYMBOL_ID,
  OUTLINE_STROKE,
  OUTLINE_STROKE_WIDTH,
  instanceVariables,
} from './region-style'
import type { BodyMapProps } from './types'

interface InteractiveFigureProps {
  viewBox: string
  paths: ReadonlyArray<BodyPolygon>
  fills: Partial<Record<BodyRegion, string>>
  opacities?: Partial<Record<BodyRegion, number>>
  neutralFill: string
  onRegionClick: (region: BodyRegion) => void
}

function InteractiveFigure({ viewBox, paths, fills, opacities, neutralFill, onRegionClick }: InteractiveFigureProps) {
  return (
    <svg viewBox={viewBox} className="h-full w-1/2">
      {paths.map(({ region, points }, index) => {
        const fill = region ? fills[region] : undefined
        const style = {
          fill: fill ?? neutralFill,
          fillOpacity: region ? (opacities?.[region] ?? 1) : 1,
          stroke: OUTLINE_STROKE,
          strokeWidth: OUTLINE_STROKE_WIDTH,
        }
        // Regions without a fill carry no data, so they are not actionable.
        if (!region || fill === undefined) return <polygon key={index} points={points} style={style} />

        const activate = () => onRegionClick(region)
        const handleKeyDown = (event: KeyboardEvent<SVGPolygonElement>) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          activate()
        }
        return (
          <polygon
            key={index}
            points={points}
            style={{ ...style, cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            aria-label={REGION_LABELS[region]}
            onClick={activate}
            onKeyDown={handleKeyDown}
          />
        )
      })}
    </svg>
  )
}

function SymbolFigure({ symbolId, viewBox }: { symbolId: string; viewBox: string }) {
  return (
    <svg viewBox={viewBox} className="h-full w-1/2">
      <use href={`#${symbolId}`} />
    </svg>
  )
}

export function BodyMap({
  fills,
  opacities,
  neutralFill,
  onRegionClick,
  className,
  'aria-label': ariaLabel,
}: BodyMapProps) {
  const wrapperClass = `flex ${className ?? ''}`.trim()

  if (!onRegionClick) {
    // Decorative unless labelled; requires <BodyMapDefs /> to be mounted on the page.
    const a11y = ariaLabel ? { role: 'img', 'aria-label': ariaLabel } : { 'aria-hidden': true }
    return (
      <div className={wrapperClass} style={instanceVariables({ fills, opacities, neutralFill })} {...a11y}>
        <SymbolFigure symbolId={FRONT_SYMBOL_ID} viewBox={ANTERIOR_VIEWBOX} />
        <SymbolFigure symbolId={BACK_SYMBOL_ID} viewBox={POSTERIOR_VIEWBOX} />
      </div>
    )
  }

  const shared = { fills, opacities, neutralFill: neutralFill ?? DEFAULT_NEUTRAL_FILL, onRegionClick }
  return (
    <div className={wrapperClass} role="group" aria-label={ariaLabel}>
      <InteractiveFigure viewBox={ANTERIOR_VIEWBOX} paths={ANTERIOR_PATHS} {...shared} />
      <InteractiveFigure viewBox={POSTERIOR_VIEWBOX} paths={POSTERIOR_PATHS} {...shared} />
    </div>
  )
}
