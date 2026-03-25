import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCurrentAuthUser, logoutCurrentAuthUser } from './index.service'

const createJsonResponse = (data: unknown, init?: ResponseInit) => {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  })
}

const createStorageMock = () => {
  const storage = new Map<string, string>()

  return {
    clear: () => {
      storage.clear()
    },
    getItem: (key: string) => {
      return storage.get(key) ?? null
    },
    key: (index: number) => {
      return Array.from(storage.keys())[index] ?? null
    },
    get length() {
      return storage.size
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
  } satisfies Storage
}

describe('AppShell service', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('requests the current auth user through the shared HttpClient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        user: {
          email: 'alpha@example.com',
          id: 1,
          role: 'user',
          username: 'alpha',
        },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    return getCurrentAuthUser().then((result) => {
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/auth/me')
      expect(result.user.username).toBe('alpha')
    })
  })

  it('posts logout through the shared HttpClient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))

    vi.stubGlobal('fetch', fetchMock)

    return logoutCurrentAuthUser().then(() => {
      const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]

      expect(requestUrl).toBe('/api/v1/auth/logout')
      expect(requestInit.method).toBe('POST')
    })
  })
})
