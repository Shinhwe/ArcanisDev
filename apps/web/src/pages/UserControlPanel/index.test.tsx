import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HttpClientError } from '../../app/http/HttpClientError'
import UserControlPanel from '.'

const {
  getCurrentUserControlPanelMock,
  navigateMock,
} = vi.hoisted(() => {
  return {
    getCurrentUserControlPanelMock: vi.fn(),
    navigateMock: vi.fn(),
  }
})

vi.mock('./index.service', () => {
  return {
    getCurrentUserControlPanel: getCurrentUserControlPanelMock,
  }
})

vi.mock('react-router-dom', async () => {
  const actualModule = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actualModule,
    useNavigate: () => {
      return navigateMock
    },
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

describe('User control panel page', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
    getCurrentUserControlPanelMock.mockReset()
    navigateMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders the migrated user profile and account summary', async () => {
    localStorage.setItem('token', 'token-user-cp')
    getCurrentUserControlPanelMock.mockResolvedValue({
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
    })

    render(
      <MemoryRouter>
        <UserControlPanel />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', {
        name: /user control panel/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('alpha')[0]).toBeInTheDocument()
    expect(screen.getByText('alpha@example.com')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
  })

  it('redirects to login when the profile request is unauthorized', async () => {
    localStorage.setItem('token', 'token-user-cp')
    getCurrentUserControlPanelMock.mockRejectedValue(
      new HttpClientError({
        data: undefined,
        method: 'GET',
        status: 401,
        statusText: 'Unauthorized',
        url: '/api/v1/users/me/profile',
      }),
    )

    render(
      <MemoryRouter>
        <UserControlPanel />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
    })
  })
})
