import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loginAuthUser } from './index.service'

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

describe('Login page service', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('posts login credentials through the shared HttpClient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        token: 'token-login',
        user: {
          email: 'alpha@example.com',
          id: 1,
          role: 'user',
          username: 'alpha',
        },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    return loginAuthUser({
      passwordHash: 'hash-login',
      username: 'alpha',
    }).then((result) => {
      const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]

      expect(requestUrl).toBe('/api/v1/auth/login')
      expect(requestInit.method).toBe('POST')
      expect(requestInit.body).toBe(
        JSON.stringify({
          passwordHash: 'hash-login',
          username: 'alpha',
        }),
      )
      expect(result.token).toBe('token-login')
    })
  })
})
