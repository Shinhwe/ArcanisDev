import { NavLink, Outlet } from 'react-router-dom';

import styles from './index.module.scss';

const navigationItems = [
  {
    to: '/',
    label: 'Home',
    end: true,
  },
  {
    to: '/playground',
    label: 'Playground',
  },
];

export const AppShell = () => {
  const getNavLinkClassName = ({ isActive }: { isActive: boolean }) => {
    return [styles.navLink, isActive ? styles.navLinkActive : '']
      .filter(Boolean)
      .join(' ');
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Arcanis</p>
          <p className={styles.title}>Migration Frontend</p>
        </div>
        <nav className={styles.nav} aria-label="Primary">
          {navigationItems.map((navigationItem) => (
            <NavLink
              key={navigationItem.to}
              className={getNavLinkClassName}
              end={navigationItem.end}
              to={navigationItem.to}
            >
              {navigationItem.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};
