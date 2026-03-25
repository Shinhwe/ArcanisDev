import { render, screen } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { createAppRouter } from '.'

describe('createAppRouter', () => {
  it('renders the home route content at /', () => {
    render(<RouterProvider router={createAppRouter(['/'])} />)

    expect(
      screen.getByRole('heading', {
        name: /react front end\. \.net 10 back end\./i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the playground page at /playground', () => {
    render(<RouterProvider router={createAppRouter(['/playground'])} />)

    expect(screen.getByRole('heading', { name: /playground/i })).toBeInTheDocument()
  })
})
