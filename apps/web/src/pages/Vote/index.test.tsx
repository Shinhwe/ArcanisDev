import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Vote from '.'

const { getVoteEligibilityMock } = vi.hoisted(() => {
  return {
    getVoteEligibilityMock: vi.fn(),
  }
})

vi.mock('./index.service', () => {
  return {
    getVoteEligibility: getVoteEligibilityMock,
  }
})

describe('Vote page', () => {
  beforeEach(() => {
    getVoteEligibilityMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the loading state before vote eligibility resolves', () => {
    getVoteEligibilityMock.mockReturnValue(new Promise(() => {}))

    render(
      <MemoryRouter>
        <Vote />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /vote for awaken/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/loading vote eligibility/i)).toBeInTheDocument()
  })

  it('renders the login required disabled state for anonymous users', async () => {
    getVoteEligibilityMock.mockResolvedValue({
      canVote: false,
      hasLinkedGameAccount: false,
      message: 'Login is required before voting.',
      nextEligibleAt: null,
      status: 'login_required',
      voteIntervalHours: 24,
    })

    render(
      <MemoryRouter>
        <Vote />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/login is required before voting/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vote now/i })).toBeDisabled()
    expect(screen.getByText(/can vote every 24 hours/i)).toBeInTheDocument()
  })

  it('renders the link required disabled state for authenticated users without a linked account', async () => {
    getVoteEligibilityMock.mockResolvedValue({
      canVote: false,
      hasLinkedGameAccount: false,
      message: 'Link a game account before voting.',
      nextEligibleAt: null,
      status: 'link_required',
      voteIntervalHours: 24,
    })

    render(
      <MemoryRouter>
        <Vote />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/link a game account before voting/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vote now/i })).toBeDisabled()
  })

  it('renders the unavailable disabled state when the eligibility request fails', async () => {
    getVoteEligibilityMock.mockRejectedValue(new Error('network'))

    render(
      <MemoryRouter>
        <Vote />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/vote is currently unavailable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vote now/i })).toBeDisabled()
  })
})
