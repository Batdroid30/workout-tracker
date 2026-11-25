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

  it('ties each label to its field and helps the phone fill in saved details', async () => {
    const markup = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }))
    expect(markup).toContain('for="email"')
    expect(markup).toMatch(/id="email"[^>]*autoComplete="email"|autoComplete="email"[^>]*id="email"/i)
    expect(markup).toContain('for="password"')
    expect(markup).toMatch(/autoComplete="current-password"/i)
  })

  it('makes "Forgot password?" big enough to tap', async () => {
    const markup = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }))
    expect(markup).toMatch(/class="[^"]*min-h-11[^"]*"[^>]*>Forgot password\?/)
  })
})
