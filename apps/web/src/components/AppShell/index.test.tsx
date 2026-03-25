import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppShell } from '.'

describe('AppShell', () => {
  it('does not expose the internal playground route in primary navigation', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /playground/i })).not.toBeInTheDocument()
  })
})
