import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Register from '.'

const {
  createPasswordHashMock,
  navigateMock,
  registerAuthUserMock,
  setAuthSessionMock,
} = vi.hoisted(() => {
  return {
    createPasswordHashMock: vi.fn(),
    navigateMock: vi.fn(),
    registerAuthUserMock: vi.fn(),
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
    registerAuthUser: registerAuthUserMock,
  }
})

describe('Register page', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    createPasswordHashMock.mockReset()
    registerAuthUserMock.mockReset()
    setAuthSessionMock.mockReset()
  })

  it('hashes the password, submits the register request, and redirects home', async () => {
    createPasswordHashMock.mockResolvedValue('hash-register')
    registerAuthUserMock.mockResolvedValue({
      token: 'token-register',
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
        <Register />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /register to awaken/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^welcome to awaken$/i })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'alpha' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'alpha@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'secret-password' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /^register$/i }).closest('form')!)

    await waitFor(() => {
      expect(createPasswordHashMock).toHaveBeenCalledWith('secret-password')
      expect(registerAuthUserMock).toHaveBeenCalledWith({
        email: 'alpha@example.com',
        passwordHash: 'hash-register',
        username: 'alpha',
      })
      expect(setAuthSessionMock).toHaveBeenCalledWith({
        token: 'token-register',
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
