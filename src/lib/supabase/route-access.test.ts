import { describe, it, expect } from 'vitest'
import { routeAccess } from './route-access'

describe('routeAccess', () => {
  it('lets a signed-out lifter reach the password reset pages', () => {
    // Someone who forgot their password is, by definition, signed out.
    expect(routeAccess('/forgot-password')).toBe('public')
    expect(routeAccess('/reset-password')).toBe('public')
  })

  it('treats sign-in and sign-up as auth pages, which skip ahead once signed in', () => {
    expect(routeAccess('/login')).toBe('auth')
    expect(routeAccess('/signup')).toBe('auth')
  })

  it('keeps the landing page and app files open', () => {
    expect(routeAccess('/')).toBe('public')
    expect(routeAccess('/manifest.json')).toBe('public')
  })

  it('protects everything in the app', () => {
    expect(routeAccess('/dashboard')).toBe('app')
    expect(routeAccess('/workout')).toBe('app')
    expect(routeAccess('/progress/more')).toBe('app')
  })
})
