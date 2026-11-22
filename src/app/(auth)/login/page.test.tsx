import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('./actions', () => ({ loginUser: vi.fn() }))

import LoginPage from './page'

describe('LoginPage', () => {
  it('shows a message with a percent sign as written', async () => {
    // Next has already decoded the query; decoding again throws on "%".
    const markup = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({ message: 'Done: 100% set' }) }))
    expect(markup).toContain('Done: 100% set')
  })
})
