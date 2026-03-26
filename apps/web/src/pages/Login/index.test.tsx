import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Login from '.'

const {
  createPasswordHashMock,
  loginAuthUserMock,
  navigateMock,
  setAuthSessionMock,
} = vi.hoisted(() => {
  return {
    createPasswordHashMock: vi.fn(),
    loginAuthUserMock: vi.fn(),
    navigateMock: vi.fn(),
    setAuthSessionMock: vi.fn(),
  }
})

vi.mock('react-router-dom', async () => {
  const reactRouterDomModule = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...reactRouterDomModule,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../app/auth/createPasswordHash', () => {
  return {
    createPasswordHash: createPasswordHashMock,
  }
})

vi.mock('../../app/auth', () => {
  return {
    setAuthSession: setAuthSessionMock,
  }
})

vi.mock('./index.service', () => {
  return {
    loginAuthUser: loginAuthUserMock,
  }
})

describe('Login page', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    createPasswordHashMock.mockReset()
    loginAuthUserMock.mockReset()
    setAuthSessionMock.mockReset()
  })

  it('hashes the password, submits the login request, and redirects home', async () => {
    createPasswordHashMock.mockResolvedValue('hash-login')
    loginAuthUserMock.mockResolvedValue({
      token: 'token-login',
      user: {
        email: 'alpha@example.com',
        id: 1,
        role: 'user',
        username: 'alpha',
      },
    })
    setAuthSessionMock.mockResolvedValue({
      email: 'alpha@example.com',
      id: 1,
      role: 'user',
      username: 'alpha',
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /login to awaken/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /welcome back to awaken/i })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'alpha' },
    })
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'secret-password' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /^login$/i }).closest('form')!)

    await waitFor(() => {
      expect(createPasswordHashMock).toHaveBeenCalledWith('secret-password')
      expect(loginAuthUserMock).toHaveBeenCalledWith({
        passwordHash: 'hash-login',
        username: 'alpha',
      })
      expect(setAuthSessionMock).toHaveBeenCalledWith({
        token: 'token-login',
        user: {
          email: 'alpha@example.com',
          id: 1,
          role: 'user',
          username: 'alpha',
        },
      })
      expect(navigateMock).toHaveBeenCalledWith('/')
    })
  })
})
