// `/profile` used to hold History, Exercises and Account behind `?tab=`.
// Old links and bookmarks land on the page that replaced each tab.
const TAB_TARGETS = {
  history: '/history',
  exercises: '/exercises',
} as const

export function profileRedirectTarget(tab: string | undefined): '/history' | '/exercises' | '/account' {
  if (tab === 'history' || tab === 'exercises') return TAB_TARGETS[tab]
  return '/account'
}
