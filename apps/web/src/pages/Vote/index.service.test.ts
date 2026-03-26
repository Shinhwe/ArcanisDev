import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getVoteEligibility } from './index.service'

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

describe('Vote page service', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('requests the vote eligibility resource through the shared HttpClient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        canVote: false,
        hasLinkedGameAccount: false,
        message: 'Login is required before voting.',
        nextEligibleAt: null,
        status: 'login_required',
        voteIntervalHours: 24,
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    return getVoteEligibility().then((responseData) => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/votes/eligibility')
      expect(responseData.status).toBe('login_required')
      expect(responseData.voteIntervalHours).toBe(24)
    })
  })
})
