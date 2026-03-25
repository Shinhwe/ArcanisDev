import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HttpClient } from '.'
import { HttpClientError } from '../HttpClientError'

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

describe('HttpClient', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('injects token from localStorage into get requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ id: 1 }))

    localStorage.setItem('token', 'abc123')
    vi.stubGlobal('fetch', fetchMock)

    return HttpClient.get<{ id: number }>('users').then((result) => {
      const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
      const requestHeaders = new Headers(requestInit.headers)

      expect(requestUrl).toBe('/api/v1/users')
      expect(requestInit.method).toBe('GET')
      expect(requestHeaders.get('Accept')).toBe('application/json')
      expect(requestHeaders.get('Authorization')).toBe('Bearer abc123')
      expect(result).toEqual({ id: 1 })
    })
  })

  it('serializes json bodies for post requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ id: 2 }))

    vi.stubGlobal('fetch', fetchMock)

    return HttpClient.post<{ id: number }>('/users', {
      name: 'Ada',
    }).then(() => {
      const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
      const requestHeaders = new Headers(requestInit.headers)

      expect(requestInit.method).toBe('POST')
      expect(requestInit.body).toBe(JSON.stringify({ name: 'Ada' }))
      expect(requestHeaders.get('Content-Type')).toBe('application/json')
    })
  })

  it('sends put requests with the provided json body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ updated: true }))

    vi.stubGlobal('fetch', fetchMock)

    return HttpClient.put<{ updated: boolean }>('/users/1', {
      name: 'Grace',
    }).then(() => {
      const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]

      expect(requestInit.method).toBe('PUT')
      expect(requestInit.body).toBe(JSON.stringify({ name: 'Grace' }))
    })
  })

  it('sends delete requests through del', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    return HttpClient.del<undefined>('/users/1').then((result) => {
      const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]

      expect(requestInit.method).toBe('DELETE')
      expect(result).toBeUndefined()
    })
  })

  it('rejects with HttpClientError when the response is not ok', async () => {
    const fetchMock = vi.fn().mockImplementation(() => {
      return Promise.resolve(
        createJsonResponse(
          {
            message: 'Unauthorized',
          },
          {
            status: 401,
            statusText: 'Unauthorized',
          },
        ),
      )
    })

    vi.stubGlobal('fetch', fetchMock)

    return expect(HttpClient.get('/users')).rejects.toBeInstanceOf(HttpClientError).then(() => {
      return expect(HttpClient.get('/users')).rejects.toMatchObject({
        status: 401,
        statusText: 'Unauthorized',
        data: {
          message: 'Unauthorized',
        },
      })
    })
  })

  it('allows custom headers to override default headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ ok: true }))

    localStorage.setItem('token', 'abc123')
    vi.stubGlobal('fetch', fetchMock)

    return HttpClient.get('/health', {
      headers: {
        Accept: 'text/plain',
        Authorization: 'Custom token',
      },
    }).then(() => {
      const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
      const requestHeaders = new Headers(requestInit.headers)

      expect(requestUrl).toBe('/api/v1/health')
      expect(requestHeaders.get('Accept')).toBe('text/plain')
      expect(requestHeaders.get('Authorization')).toBe('Custom token')
    })
  })
})
