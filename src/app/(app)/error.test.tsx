import { describe, it, expect, vi, afterEach } from 'vitest'
import { isValidElement, type ReactElement, type ReactNode } from 'react'

// Lets the boundary be called as a plain function; the logging effect isn't under test.
vi.mock('react', async importOriginal => ({ ...(await importOriginal<typeof import('react')>()), useEffect: () => {} }))

import ErrorBoundary from './error'

function findRetryHandler(node: ReactNode): (() => void) | null {
  if (!isValidElement(node)) return null
  const { onClick, children } = (node as ReactElement<{ onClick?: () => void; children?: ReactNode }>).props
  if (onClick) return onClick
  for (const child of ([] as ReactNode[]).concat(children ?? [])) {
    const found = findRetryHandler(child)
    if (found) return found
  }
  return null
}

describe('app error screen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reloads the whole page on "Try again", so a broken screen can always recover', () => {
    // A client-only reset re-renders the same failed result; after a server
    // or version error only a fresh load from the server clears it.
    const reload = vi.fn()
    vi.stubGlobal('window', { location: { reload } })
    const reset = vi.fn()

    const retry = findRetryHandler(ErrorBoundary({ error: new Error('An error occurred in the Server Components render.'), reset }))
    retry?.()

    expect(reload).toHaveBeenCalledOnce()
  })
})
