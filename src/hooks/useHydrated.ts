'use client'

import { useSyncExternalStore } from 'react'

const subscribeNever = () => () => {}

// False during the server render and hydration, true after. Use it before
// reading anything saved on the phone (like the workout in progress).
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false)
}
