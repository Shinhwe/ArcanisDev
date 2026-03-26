import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCurrentUserControlPanel } from './index.service'

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

describe('User control panel service', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('requests the current user profile through the shared HttpClient', async () => {
    localStorage.setItem('token', 'token-user-cp')

    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        gameAccount: {
          donationPoints: 30,
          isLinked: true,
          maplePoints: 20,
          nxPrepaid: 40,
          votePoints: 10,
        },
        user: {
          email: 'alpha@example.com',
          id: 1,
          role: 'user',
          username: 'alpha',
        },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    return getCurrentUserControlPanel().then((result) => {
      const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]

      expect(requestUrl).toBe('/api/v1/users/me/profile')
      expect(requestInit.method).toBe('GET')
      expect(new Headers(requestInit.headers).get('Authorization')).toBe('Bearer token-user-cp')
      expect(result.gameAccount.votePoints).toBe(10)
      expect(result.user.username).toBe('alpha')
    })
  })
})
