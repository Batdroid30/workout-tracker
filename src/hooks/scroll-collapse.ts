// Below this scroll position the tab bar is always expanded.
export const COLLAPSE_MIN_Y = 80
// Distance the page must travel in one direction before the bar changes,
// so small or jittery scrolls never toggle it.
export const COLLAPSE_DELTA = 24

export interface CollapseState {
  collapsed: boolean
  anchorY: number
}

export function expandedAt(y: number): CollapseState {
  return { collapsed: false, anchorY: y }
}

export function nextCollapsed(state: CollapseState, y: number): CollapseState {
  if (y < COLLAPSE_MIN_Y) return { collapsed: false, anchorY: y }

  if (!state.collapsed) {
    if (y - state.anchorY >= COLLAPSE_DELTA) return { collapsed: true, anchorY: y }
    return { collapsed: false, anchorY: Math.min(state.anchorY, y) }
  }

  if (state.anchorY - y >= COLLAPSE_DELTA) return { collapsed: false, anchorY: y }
  return { collapsed: true, anchorY: Math.max(state.anchorY, y) }
}
