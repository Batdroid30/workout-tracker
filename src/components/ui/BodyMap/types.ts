import type { BodyRegion } from '@/lib/body-map'

export interface BodyMapProps {
  fills: Partial<Record<BodyRegion, string>>
  opacities?: Partial<Record<BodyRegion, number>>
  neutralFill?: string
  /** When provided, the map inlines its polygons and regions become keyboard-operable buttons. */
  onRegionClick?: (region: BodyRegion) => void
  className?: string
  'aria-label'?: string
}
