import { render, screen } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAuthSession } from '../auth'
import { createAppRouter } from '.'

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

describe('createAppRouter', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(async () => {
    await clearAuthSession()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('configures page routes for lazy loading', () => {
    const router = createAppRouter(['/'])
    const rootRoute = router.routes[0]
    const homeRoute = rootRoute.children?.[0]
    const loginRoute = rootRoute.children?.[1]
    const registerRoute = rootRoute.children?.[2]
    const playgroundRoute = rootRoute.children?.[3]

    expect(homeRoute?.lazy).toEqual(expect.any(Function))
    expect(homeRoute?.element).toBeUndefined()
    expect(loginRoute?.lazy).toEqual(expect.any(Function))
    expect(loginRoute?.element).toBeUndefined()
    expect(registerRoute?.lazy).toEqual(expect.any(Function))
    expect(registerRoute?.element).toBeUndefined()
    expect(playgroundRoute?.lazy).toEqual(expect.any(Function))
    expect(playgroundRoute?.element).toBeUndefined()
  })

  it('renders the home route content at /', async () => {
    render(<RouterProvider router={createAppRouter(['/'])} />)

    expect(
      await screen.findByRole('heading', {
        name: /cms migration workspace/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the playground page at /playground', async () => {
    render(<RouterProvider router={createAppRouter(['/playground'])} />)

    expect(await screen.findByRole('heading', { name: /integration lab/i })).toBeInTheDocument()
  })

  it('renders the login page at /login', async () => {
    render(<RouterProvider router={createAppRouter(['/login'])} />)

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders the register page at /register', async () => {
    render(<RouterProvider router={createAppRouter(['/register'])} />)

    expect(await screen.findByRole('heading', { name: /create account/i })).toBeInTheDocument()
  })
})
