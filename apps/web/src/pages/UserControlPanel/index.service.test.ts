import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  changeCurrentUserEmail,
  changeCurrentUserPassword,
  getCurrentUserControlPanel,
  sendCurrentUserEmailVerificationCode,
} from './index.service'

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
          donationPoints: null,
          isLinked: false,
          maplePoints: null,
          nxPrepaid: null,
          votePoints: null,
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
      expect(result.gameAccount.votePoints).toBeNull()
      expect(result.user.username).toBe('alpha')
    })
  })

  it('requests the current user email verification code through the shared HttpClient', async () => {
    localStorage.setItem('token', 'token-user-cp')

    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        message: 'Verification code generated.',
        verificationCodePreview: '123456',
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    return sendCurrentUserEmailVerificationCode({
      currentPasswordHash: 'a'.repeat(128),
      newEmail: 'updated@example.com',
    }).then((result) => {
      const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]

      expect(requestUrl).toBe('/api/v1/users/me/email-verification-codes')
      expect(requestInit.method).toBe('POST')
      expect(new Headers(requestInit.headers).get('Authorization')).toBe('Bearer token-user-cp')
      expect(result.verificationCodePreview).toBe('123456')
    })
  })

  it('requests the current user email change through the shared HttpClient', async () => {
    localStorage.setItem('token', 'token-user-cp')

    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        user: {
          email: 'updated@example.com',
          id: 1,
          role: 'user',
          username: 'alpha',
        },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    return changeCurrentUserEmail({
      currentPasswordHash: 'a'.repeat(128),
      newEmail: 'updated@example.com',
      verificationCode: '123456',
    }).then((result) => {
      const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]

      expect(requestUrl).toBe('/api/v1/users/me/email')
      expect(requestInit.method).toBe('PUT')
      expect(new Headers(requestInit.headers).get('Authorization')).toBe('Bearer token-user-cp')
      expect(result.user.email).toBe('updated@example.com')
    })
  })

  it('requests the current user password change through the shared HttpClient', async () => {
    localStorage.setItem('token', 'token-user-cp')

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    return changeCurrentUserPassword({
      currentPasswordHash: 'a'.repeat(128),
      newPasswordHash: 'b'.repeat(128),
    }).then(() => {
      const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]

      expect(requestUrl).toBe('/api/v1/users/me/password')
      expect(requestInit.method).toBe('PUT')
      expect(new Headers(requestInit.headers).get('Authorization')).toBe('Bearer token-user-cp')
    })
  })
})
