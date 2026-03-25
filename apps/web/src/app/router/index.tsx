import {
  createBrowserRouter,
  createMemoryRouter,
  type RouteObject,
} from 'react-router-dom';

import { AppShell } from '../../components/AppShell';

const loadHomeRoute = async () => {
  return import('../../pages/Home').then((module) => {
    return {
      Component: module.default,
    };
  });
};

const loadPlaygroundRoute = async () => {
  return import('../../pages/Playground').then((module) => {
    return {
      Component: module.default,
    };
  });
};

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        lazy: loadHomeRoute,
      },
      {
        path: 'playground',
        lazy: loadPlaygroundRoute,
      },
    ],
  },
];

export const createAppRouter = (initialEntries?: string[]) => {
  if (initialEntries) {
    return createMemoryRouter(routes, { initialEntries });
  }

  return createBrowserRouter(routes);
};
