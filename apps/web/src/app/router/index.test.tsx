import { render, screen } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { createAppRouter } from '.'

describe('createAppRouter', () => {
  it('configures page routes for lazy loading', () => {
    const router = createAppRouter(['/'])
    const rootRoute = router.routes[0]
    const homeRoute = rootRoute.children?.[0]
    const playgroundRoute = rootRoute.children?.[1]

    expect(homeRoute?.lazy).toEqual(expect.any(Function))
    expect(homeRoute?.element).toBeUndefined()
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
})
