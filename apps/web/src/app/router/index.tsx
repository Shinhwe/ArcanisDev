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

const loadLoginRoute = async () => {
  return import('../../pages/Login').then((module) => {
    return {
      Component: module.default,
    };
  });
};

const loadRegisterRoute = async () => {
  return import('../../pages/Register').then((module) => {
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
        path: 'login',
        lazy: loadLoginRoute,
      },
      {
        path: 'register',
        lazy: loadRegisterRoute,
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
