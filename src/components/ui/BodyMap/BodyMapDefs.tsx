import { ANTERIOR_PATHS, ANTERIOR_VIEWBOX, POSTERIOR_PATHS, POSTERIOR_VIEWBOX, type BodyPolygon } from './body-paths'
import { BACK_SYMBOL_ID, FRONT_SYMBOL_ID, variableFillStyle } from './region-style'

function BodySymbol({ id, viewBox, paths }: { id: string; viewBox: string; paths: ReadonlyArray<BodyPolygon> }) {
  return (
    <symbol id={id} viewBox={viewBox}>
      {paths.map(({ region, points }, index) => (
        <polygon key={index} points={points} style={variableFillStyle(region)} />
      ))}
    </symbol>
  )
}

// Mount once per page that renders non-interactive BodyMaps, so each card
// carries a <use> reference instead of its own copy of the polygons.
export function BodyMapDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
      <BodySymbol id={FRONT_SYMBOL_ID} viewBox={ANTERIOR_VIEWBOX} paths={ANTERIOR_PATHS} />
      <BodySymbol id={BACK_SYMBOL_ID} viewBox={POSTERIOR_VIEWBOX} paths={POSTERIOR_PATHS} />
    </svg>
  )
}
