import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router-dom'

import { AppShell } from '../../components/AppShell'
import { Home } from '../../pages/Home'
import { Playground } from '../../pages/Playground'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'playground',
        element: <Playground />,
      },
    ],
  },
]

export const createAppRouter = (initialEntries?: string[]) => {
  if (initialEntries) {
    return createMemoryRouter(routes, { initialEntries })
  }

  return createBrowserRouter(routes)
}
