import { ANTERIOR_PATHS, POSTERIOR_PATHS, type BodyPolygon } from './body-paths'
import { BACK_SYMBOL_ID, FRONT_SYMBOL_ID, variableFillStyle } from './region-style'

function BodySymbol({ id, paths }: { id: string; paths: ReadonlyArray<BodyPolygon> }) {
  return (
    <symbol id={id}>
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
      <BodySymbol id={FRONT_SYMBOL_ID} paths={ANTERIOR_PATHS} />
      <BodySymbol id={BACK_SYMBOL_ID} paths={POSTERIOR_PATHS} />
    </svg>
  )
}
