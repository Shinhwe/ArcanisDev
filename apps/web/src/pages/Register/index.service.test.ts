import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerAuthUser } from './index.service'

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

describe('Register page service', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('posts register data through the shared HttpClient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        token: 'token-register',
        user: {
          email: 'alpha@example.com',
          id: 1,
          role: 'user',
          username: 'alpha',
        },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    return registerAuthUser({
      email: 'alpha@example.com',
      passwordHash: 'hash-register',
      username: 'alpha',
    }).then((result) => {
      const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]

      expect(requestUrl).toBe('/api/v1/auth/register')
      expect(requestInit.method).toBe('POST')
      expect(requestInit.body).toBe(
        JSON.stringify({
          email: 'alpha@example.com',
          passwordHash: 'hash-register',
          username: 'alpha',
        }),
      )
      expect(result.token).toBe('token-register')
    })
  })
})
