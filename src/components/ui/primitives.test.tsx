import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button, getButtonClassName } from './Button'
import { IconButton } from './IconButton'
import { Card } from './Card'
import { Chip } from './Chip'
import { SectionHeader } from './SectionHeader'

describe('ui primitives', () => {
  it('renders Button variants, sizes and loading state', () => {
    const primary = renderToStaticMarkup(<Button>Start workout</Button>)
    expect(primary).toContain('bg-accent')
    expect(primary).toContain('text-on-accent')
    expect(primary).toContain('rounded-pill')
    expect(primary).toContain('min-h-12')
    expect(primary).toContain('focus-ring')

    const busy = renderToStaticMarkup(<Button loading>Save</Button>)
    expect(busy).toContain('disabled=""')
    expect(busy).toContain('aria-busy="true"')

    expect(renderToStaticMarkup(<Button variant="destructive">Delete</Button>)).toContain('text-negative')
    expect(renderToStaticMarkup(<Button size="sm">x</Button>)).toContain('min-h-10')
  })

  it('getButtonClassName returns the shared button classes', () => {
    const classes = getButtonClassName({})
    expect(classes).toContain('bg-accent')
    expect(classes).toContain('rounded-pill')
    expect(classes).toContain('min-h-12')
    expect(classes).toContain('w-full')
    expect(getButtonClassName({ fullWidth: false })).not.toContain('w-full')
  })

  it('renders IconButton, Chip, Card and SectionHeader', () => {
    expect(renderToStaticMarkup(<IconButton aria-label="Close"><svg /></IconButton>)).toContain('aria-label="Close"')
    expect(renderToStaticMarkup(<Chip tone="accent">New best</Chip>)).toContain('bg-accent-soft')
    expect(renderToStaticMarkup(<Card>x</Card>)).toMatch(/class="card p-4"/)
    expect(
      renderToStaticMarkup(<SectionHeader title="Recent" action={{ label: 'See all', href: '/progress' }} />),
    ).toContain('href="/progress"')
  })
})
