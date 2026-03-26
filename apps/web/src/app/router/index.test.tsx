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
    const homeRoute = rootRoute.children?.find((route) => {
      return route.index === true
    })
    const downloadsRoute = rootRoute.children?.find((route) => {
      return route.path === 'downloads'
    })
    const voteRoute = rootRoute.children?.find((route) => {
      return route.path === 'vote'
    })
    const patchRoute = rootRoute.children?.find((route) => {
      return route.path === 'patch'
    })
    const loginRoute = rootRoute.children?.find((route) => {
      return route.path === 'login'
    })
    const registerRoute = rootRoute.children?.find((route) => {
      return route.path === 'register'
    })
    const userControlPanelRoute = rootRoute.children?.find((route) => {
      return route.path === 'user-cp'
    })
    const playgroundRoute = rootRoute.children?.find((route) => {
      return route.path === 'playground'
    })

    expect(homeRoute?.lazy).toEqual(expect.any(Function))
    expect(homeRoute?.element).toBeUndefined()
    expect(downloadsRoute?.lazy).toEqual(expect.any(Function))
    expect(downloadsRoute?.element).toBeUndefined()
    expect(voteRoute?.lazy).toEqual(expect.any(Function))
    expect(voteRoute?.element).toBeUndefined()
    expect(patchRoute?.lazy).toEqual(expect.any(Function))
    expect(patchRoute?.element).toBeUndefined()
    expect(loginRoute?.lazy).toEqual(expect.any(Function))
    expect(loginRoute?.element).toBeUndefined()
    expect(registerRoute?.lazy).toEqual(expect.any(Function))
    expect(registerRoute?.element).toBeUndefined()
    expect(userControlPanelRoute?.path).toBe('user-cp')
    expect(userControlPanelRoute?.lazy).toEqual(expect.any(Function))
    expect(userControlPanelRoute?.element).toBeUndefined()
    expect(playgroundRoute?.lazy).toEqual(expect.any(Function))
    expect(playgroundRoute?.element).toBeUndefined()
  })

  it('renders the home route content at /', async () => {
    render(<RouterProvider router={createAppRouter(['/'])} />)

    expect(
      await screen.findByRole('heading', {
        name: /welcome to awaken/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the playground page at /playground', async () => {
    render(<RouterProvider router={createAppRouter(['/playground'])} />)

    expect(await screen.findByRole('heading', { name: /integration lab/i })).toBeInTheDocument()
  })

  it('renders the login page at /login', async () => {
    render(<RouterProvider router={createAppRouter(['/login'])} />)

    expect(await screen.findByRole('heading', { name: /login to awaken/i })).toBeInTheDocument()
  })

  it('renders the register page at /register', async () => {
    render(<RouterProvider router={createAppRouter(['/register'])} />)

    expect(
      await screen.findByRole('heading', {
        name: /register to awaken/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the downloads page at /downloads', async () => {
    render(<RouterProvider router={createAppRouter(['/downloads'])} />)

    expect(
      await screen.findByRole('heading', {
        name: /awaken client download/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the vote page at /vote', async () => {
    render(<RouterProvider router={createAppRouter(['/vote'])} />)

    expect(
      await screen.findByRole('heading', {
        name: /vote for awaken/i,
        level: 1,
      }),
    ).toBeInTheDocument()
  })

  it('renders the patch page at /patch', async () => {
    render(<RouterProvider router={createAppRouter(['/patch'])} />)

    expect(
      await screen.findByRole('heading', {
        name: /awaken patch notes and server updates/i,
      }),
    ).toBeInTheDocument()
  })
})
