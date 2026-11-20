import Link from 'next/link'

interface HomeHeaderProps {
  greeting: string
  firstName: string
  dateLabel: string
  avatarUrl: string | null
  initial: string
}

export function HomeHeader({ greeting, firstName, dateLabel, avatarUrl, initial }: HomeHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 pt-4">
      <div className="min-w-0">
        <p className="t-caption">{dateLabel}</p>
        <h1 className="t-title-1 mt-0.5 break-words">{greeting}, {firstName}</h1>
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
