import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAuthSession, setAuthSession } from '../../app/auth'
import { AppShell } from '.'

const {
  getCurrentAuthUserMock,
  logoutCurrentAuthUserMock,
} = vi.hoisted(() => {
  return {
    getCurrentAuthUserMock: vi.fn(),
    logoutCurrentAuthUserMock: vi.fn(),
  }
})

vi.mock('./index.service', () => {
  return {
    getCurrentAuthUser: getCurrentAuthUserMock,
    logoutCurrentAuthUser: logoutCurrentAuthUserMock,
  }
})

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

describe('AppShell', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
    getCurrentAuthUserMock.mockReset()
    logoutCurrentAuthUserMock.mockReset()
  })

  afterEach(async () => {
    await clearAuthSession()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows anonymous navigation without exposing the internal playground route', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /playground/i })).not.toBeInTheDocument()
  })

  it('shows the current username and supports logout for authenticated users', async () => {
    await setAuthSession({
      token: 'token-authenticated',
      user: {
        email: 'alpha@example.com',
        id: 1,
        role: 'user',
        username: 'alpha',
      },
    })
    logoutCurrentAuthUserMock.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    )

    expect(await screen.findByText('alpha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /logout/i }))

    await waitFor(() => {
      expect(logoutCurrentAuthUserMock).toHaveBeenCalledTimes(1)
      expect(localStorage.getItem('token')).toBeNull()
      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument()
    })
  })
})
