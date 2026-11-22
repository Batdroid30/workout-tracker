import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('./actions', () => ({ forgotPassword: vi.fn() }))

import ForgotPasswordPage from './page'
import { BAD_LINK_PATH } from '@/app/auth/confirm/confirm-email-link'

async function renderWith(query: Record<string, string>) {
  return renderToStaticMarkup(await ForgotPasswordPage({ searchParams: Promise.resolve(query) }))
}

describe('ForgotPasswordPage', () => {
  it('explains a bad reset link above the form', async () => {
    const error = new URL(BAD_LINK_PATH, 'http://x').searchParams.get('error') ?? ''
    expect(await renderWith({ error })).toContain('That reset link has expired or was already used')
  })

  it('shows a message with a percent sign as written', async () => {
    // Next has already decoded the query; decoding again throws on "%".
    expect(await renderWith({ error: 'Rate limit: 100% of requests used' })).toContain('100% of requests used')
  })
})
