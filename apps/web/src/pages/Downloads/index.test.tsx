import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Downloads from '.'

const { getClientDownloadsMock } = vi.hoisted(() => {
  return {
    getClientDownloadsMock: vi.fn(),
  }
})

vi.mock('./index.service', () => {
  return {
    getClientDownloads: getClientDownloadsMock,
  }
})

describe('Downloads page', () => {
  beforeEach(() => {
    getClientDownloadsMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the loading state before download mirrors resolve', () => {
    getClientDownloadsMock.mockReturnValue(new Promise(() => {}))

    render(
      <MemoryRouter>
        <Downloads />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /awaken client download/i })).toBeInTheDocument()
    expect(screen.getByText(/loading download mirrors/i)).toBeInTheDocument()
  })

  it('renders the available client mirrors from the downloads resource', async () => {
    getClientDownloadsMock.mockResolvedValue({
      mirrors: [
        {
          id: 'mega',
          label: 'Mirror 1 (Mega)',
          url: 'https://mega.example/client',
        },
        {
          id: 'google-drive',
          label: 'Mirror 2 (Google Drive)',
          url: 'https://drive.example/client',
        },
      ],
    })

    render(
      <MemoryRouter>
        <Downloads />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: /download mirrors/i })).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: /download from mega/i,
      }),
    ).toHaveAttribute('href', 'https://mega.example/client')
    expect(
      screen.getByRole('link', {
        name: /download from google drive/i,
      }),
    ).toHaveAttribute('href', 'https://drive.example/client')
  })

  it('renders the empty state when no client mirrors are available', async () => {
    getClientDownloadsMock.mockResolvedValue({
      mirrors: [],
    })

    render(
      <MemoryRouter>
        <Downloads />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/no download mirrors are currently available/i)).toBeInTheDocument()
  })

  it('renders the unavailable state when the downloads request fails', async () => {
    getClientDownloadsMock.mockRejectedValue(new Error('network'))

    render(
      <MemoryRouter>
        <Downloads />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/download mirrors are currently unavailable/i)).toBeInTheDocument()
  })
})
