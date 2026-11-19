import Link from 'next/link'

export interface SectionHeaderProps {
  title: string
  action?: { label: string; href: string }
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="t-title-3">{title}</h2>
      {action && (
        <Link href={action.href} className="text-secondary text-sm">
          {action.label}
        </Link>
      )}
    </div>
  )
}
