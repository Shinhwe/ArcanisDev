import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getClientDownloads } from './index.service'

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

describe('Downloads page service', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('requests the client downloads resource through the shared HttpClient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        mirrors: [
          {
            id: 'mega',
            label: 'Mirror 1 (Mega)',
            url: 'https://mega.example/client',
          },
        ],
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    return getClientDownloads().then((responseData) => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/downloads/client')
      expect(responseData).toEqual({
        mirrors: [
          {
            id: 'mega',
            label: 'Mirror 1 (Mega)',
            url: 'https://mega.example/client',
          },
        ],
      })
    })
  })
})
