import { describe, expect, it } from 'vitest'

import { normalizeDatabaseUrl } from '@/lib/database-url'

describe('normalizeDatabaseUrl', () => {
  it('upgrades a remote sslmode=require connection to verify-full', () => {
    const normalized = normalizeDatabaseUrl(
      'postgresql://user:secret@db.example.com/budget?sslmode=require',
    )
    const url = new URL(normalized)

    expect(url.searchParams.get('sslmode')).toBe('verify-full')
  })

  it('adds verify-full when a remote connection omits sslmode', () => {
    const normalized = normalizeDatabaseUrl(
      'postgresql://user:secret@db.example.com/budget?application_name=explorer',
    )
    const url = new URL(normalized)

    expect(url.searchParams.get('sslmode')).toBe('verify-full')
    expect(url.searchParams.get('application_name')).toBe('explorer')
  })

  it('upgrades other legacy verification modes', () => {
    const normalized = normalizeDatabaseUrl(
      'postgresql://user:secret@db.example.com/budget?sslmode=verify-ca',
    )

    expect(new URL(normalized).searchParams.get('sslmode')).toBe('verify-full')
  })

  it.each([
    'postgresql://user:secret@localhost:5432/budget',
    'postgresql://user:secret@127.0.0.1:5432/budget?sslmode=disable',
    'postgresql://user:secret@[::1]:5432/budget',
  ])('leaves local connections unchanged: %s', (connectionString) => {
    expect(normalizeDatabaseUrl(connectionString)).toBe(connectionString)
  })

  it('leaves an unparseable connection string unchanged', () => {
    expect(normalizeDatabaseUrl('not a database url')).toBe('not a database url')
  })
})
