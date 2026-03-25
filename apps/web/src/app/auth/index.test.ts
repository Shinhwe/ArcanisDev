import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearAuthSession,
  getAuthToken,
  getCurrentAuthUserState,
  setAuthSession,
  setCurrentAuthUser,
  subscribeToAuthUserState,
} from '.'
import type { AuthSessionResponse } from './types'

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

const createAuthSessionResponse = (): AuthSessionResponse => {
  return {
    token: 'token-123',
    user: {
      email: 'alpha@example.com',
      id: 1,
      role: 'user',
      username: 'alpha',
    },
  }
}

describe('auth state', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('persists the token and current user when a session is set', async () => {
    await setAuthSession(createAuthSessionResponse())

    expect(getAuthToken()).toBe('token-123')
    expect(getCurrentAuthUserState()).toEqual({
      email: 'alpha@example.com',
      id: 1,
      role: 'user',
      username: 'alpha',
    })
  })

  it('clears the token and current user when the session is removed', async () => {
    await setAuthSession(createAuthSessionResponse())

    await clearAuthSession()

    expect(getAuthToken()).toBeNull()
    expect(getCurrentAuthUserState()).toBeNull()
  })

  it('notifies subscribers when the auth user changes', async () => {
    const handleAuthUserChange = vi.fn()
    const unsubscribeFromAuthState = subscribeToAuthUserState(handleAuthUserChange)

    await setCurrentAuthUser({
      email: 'alpha@example.com',
      id: 1,
      role: 'admin',
      username: 'alpha',
    })

    unsubscribeFromAuthState()

    expect(handleAuthUserChange).toHaveBeenCalledWith(null)
    expect(handleAuthUserChange).toHaveBeenCalledWith({
      email: 'alpha@example.com',
      id: 1,
      role: 'admin',
      username: 'alpha',
    })
  })
})
