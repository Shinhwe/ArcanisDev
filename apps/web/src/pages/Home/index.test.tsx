import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Home from '.'

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

describe('Home page', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders the legacy hero/video slice from the site config api', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          discordLink: 'https://discord.gg/awaken',
          youtubeLink: 'https://www.youtube.com/watch?v=awaken123',
        }),
      ),
    )

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', {
        name: /welcome to awaken/i,
      }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('link', {
        name: /join discord/i,
      }),
    ).toHaveAttribute('href', 'https://discord.gg/awaken')
    expect(screen.getByTitle(/awaken trailer/i)).toHaveAttribute(
      'src',
      expect.stringContaining('https://www.youtube.com/embed/awaken123'),
    )
  })
})
