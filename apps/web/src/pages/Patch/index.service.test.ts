import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getNewsCategories,
  getNewsPostDetail,
  getNewsPosts,
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

describe('Patch page service', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('requests news categories through the shared HttpClient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        categories: [
          {
            id: 3,
            name: 'Patch Notes',
          },
        ],
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    return getNewsCategories().then((responseData) => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/news/categories')
      expect(responseData.categories[0]?.name).toBe('Patch Notes')
    })
  })

  it('requests paged news posts and URL-encodes the cursor', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        items: [
          {
            id: 6,
            categoryId: 3,
            title: 'Patch v1.6 Preview',
            createdAt: '2024-11-17T17:38:37.0000000Z',
          },
        ],
        nextCursor: '2024-11-17T17:38:37.0000000Z_6',
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    return getNewsPosts({
      categoryId: 3,
      cursor: '2024-11-17T17:38:37.0000000Z_6',
      pageSize: 13,
    }).then((responseData) => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        '/api/v1/news/posts?categoryId=3&pageSize=13&cursor=2024-11-17T17%3A38%3A37.0000000Z_6',
      )
      expect(responseData.items[0]?.createdAt).toBe('2024-11-17T17:38:37.0000000Z')
      expect(responseData.nextCursor).toBe('2024-11-17T17:38:37.0000000Z_6')
    })
  })

  it('requests a post detail by id through the shared HttpClient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        post: {
          id: 6,
          categoryId: 3,
          categoryName: 'Patch Notes',
          title: 'Patch v1.6 Preview',
          createdAt: '2024-11-17T17:38:37.0000000Z',
          iframeHtmlDocument: '<!doctype html><html><body>Preview</body></html>',
        },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    return getNewsPostDetail(6).then((responseData) => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/news/posts/6')
      expect(responseData.post.title).toBe('Patch v1.6 Preview')
    })
  })
})
