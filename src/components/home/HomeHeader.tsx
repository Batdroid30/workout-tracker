'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { greetingFor, homeDateLabel } from '@/lib/home'

interface HomeHeaderProps {
  /** Server-clock fallbacks, replaced by the lifter's local time once loaded. */
  greeting: string
  dateLabel: string
  firstName: string
  avatarUrl: string | null
  initial: string
}

const SEPARATOR = '|'
const subscribeNever = () => () => {}

function localText(): string {
  const now = new Date()
  return `${greetingFor(now.getHours())}${SEPARATOR}${homeDateLabel(now)}`
}

export function HomeHeader({ greeting, dateLabel, firstName, avatarUrl, initial }: HomeHeaderProps) {
  // The server may sit in another time zone; the browser knows the lifter's.
  const text = useSyncExternalStore(subscribeNever, localText, () => `${greeting}${SEPARATOR}${dateLabel}`)
  const [shownGreeting, shownDate] = text.split(SEPARATOR)

  return (
    <header className="flex items-center justify-between gap-4 pt-4">
      <div className="min-w-0">
        <p className="t-caption">{shownDate}</p>
        <h1 className="t-title-1 mt-0.5 break-words">{shownGreeting}, {firstName}</h1>
      </div>
      <Link
        href="/account"
        aria-label="Account"
        className="focus-ring w-11 h-11 shrink-0 rounded-pill overflow-hidden flex items-center justify-center border border-border-strong bg-surface-raised"
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          : <span className="text-sm font-semibold text-primary">{initial}</span>}
      </Link>
    </header>
  )
}
