import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HttpClientError } from '../../app/http/HttpClientError'
import UserControlPanel from '.'

const {
  changeCurrentUserEmailMock,
  changeCurrentUserPasswordMock,
  clearAuthSessionMock,
  createPasswordHashMock,
  getCurrentUserControlPanelMock,
  navigateMock,
  sendCurrentUserEmailVerificationCodeMock,
} = vi.hoisted(() => {
  return {
    changeCurrentUserEmailMock: vi.fn(),
    changeCurrentUserPasswordMock: vi.fn(),
    clearAuthSessionMock: vi.fn(),
    createPasswordHashMock: vi.fn(),
    getCurrentUserControlPanelMock: vi.fn(),
    navigateMock: vi.fn(),
    sendCurrentUserEmailVerificationCodeMock: vi.fn(),
  }
})

vi.mock('./index.service', () => {
  return {
    changeCurrentUserEmail: changeCurrentUserEmailMock,
    changeCurrentUserPassword: changeCurrentUserPasswordMock,
    getCurrentUserControlPanel: getCurrentUserControlPanelMock,
    sendCurrentUserEmailVerificationCode: sendCurrentUserEmailVerificationCodeMock,
  }
})

vi.mock('../../app/auth/createPasswordHash', () => {
  return {
    createPasswordHash: createPasswordHashMock,
  }
})

vi.mock('../../app/auth', async () => {
  const actualModule = await vi.importActual<typeof import('../../app/auth')>('../../app/auth')

  return {
    ...actualModule,
    clearAuthSession: clearAuthSessionMock,
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
    changeCurrentUserEmailMock.mockReset()
    changeCurrentUserPasswordMock.mockReset()
    clearAuthSessionMock.mockReset()
    createPasswordHashMock.mockReset()
    getCurrentUserControlPanelMock.mockReset()
    navigateMock.mockReset()
    sendCurrentUserEmailVerificationCodeMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders the migrated user profile and account summary', async () => {
    localStorage.setItem('token', 'token-user-cp')
    getCurrentUserControlPanelMock.mockResolvedValue({
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
    expect(screen.getByText('Not Linked Yet')).toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(4)
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

  it('auto-fills the verification code after requesting an email change code', async () => {
    localStorage.setItem('token', 'token-user-cp')
    createPasswordHashMock.mockResolvedValue('a'.repeat(128))
    getCurrentUserControlPanelMock.mockResolvedValue({
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
    })
    sendCurrentUserEmailVerificationCodeMock.mockResolvedValue({
      message: 'Verification code generated.',
      verificationCodePreview: '123456',
    })

    render(
      <MemoryRouter>
        <UserControlPanel />
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /website settings/i }))

    fireEvent.change(screen.getAllByLabelText(/current password/i)[0], {
      target: { value: 'current-password' },
    })
    fireEvent.change(screen.getByLabelText(/new email/i), {
      target: { value: 'updated@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/verification code/i)).toHaveValue('123456')
    })
  })

  it('updates the current email after confirming the email change', async () => {
    localStorage.setItem('token', 'token-user-cp')
    createPasswordHashMock.mockResolvedValue('a'.repeat(128))
    getCurrentUserControlPanelMock.mockResolvedValue({
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
    })
    sendCurrentUserEmailVerificationCodeMock.mockResolvedValue({
      message: 'Verification code generated.',
      verificationCodePreview: '123456',
    })
    changeCurrentUserEmailMock.mockResolvedValue({
      user: {
        email: 'updated@example.com',
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

    fireEvent.click(await screen.findByRole('button', { name: /website settings/i }))
    fireEvent.change(screen.getAllByLabelText(/current password/i)[0], {
      target: { value: 'current-password' },
    })
    fireEvent.change(screen.getByLabelText(/new email/i), {
      target: { value: 'updated@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/verification code/i)).toHaveValue('123456')
    })

    fireEvent.click(screen.getByRole('button', { name: /confirm email change/i }))

    await waitFor(() => {
      expect(screen.getByText('Email updated to updated@example.com.')).toBeInTheDocument()
    })
  })

  it('clears the auth session and redirects to login after changing the password', async () => {
    localStorage.setItem('token', 'token-user-cp')
    createPasswordHashMock.mockResolvedValue('a'.repeat(128))
    clearAuthSessionMock.mockResolvedValue(undefined)
    getCurrentUserControlPanelMock.mockResolvedValue({
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
    })
    changeCurrentUserPasswordMock.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <UserControlPanel />
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /website settings/i }))
    fireEvent.change(screen.getAllByLabelText(/current password/i)[1], {
      target: { value: 'current-password' },
    })
    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: 'new-password' },
    })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'new-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: /change password/i }))

    await waitFor(() => {
      expect(clearAuthSessionMock).toHaveBeenCalled()
      expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
    })
  })
})
