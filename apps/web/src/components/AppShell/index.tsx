import { useEffect, useState } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import {
  clearAuthSession,
  getAuthToken,
  getCurrentAuthUserState,
  setCurrentAuthUser,
  subscribeToAuthUserState,
} from '../../app/auth'
import { HttpClientError } from '../../app/http/HttpClientError'
import siteLogoImage from '../../assets/legacy/images/site-logo.png'
import styles from './index.module.scss'
import { getCurrentAuthUser, logoutCurrentAuthUser } from './index.service'

const navigationItems = [
  {
    end: true,
    label: 'Home',
    to: '/',
  },
]

export const AppShell = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const initialAuthUserState = getCurrentAuthUserState()
  const [currentAuthUser, setCurrentAuthUserValue] = useState(initialAuthUserState)
  const [isAuthStateLoading, setIsAuthStateLoading] = useState(
    !!getAuthToken() === true && !!initialAuthUserState === false,
  )
  const [isLogoutSubmitting, setIsLogoutSubmitting] = useState(false)
  const [isNavigationMenuOpen, setIsNavigationMenuOpen] = useState(false)
  const [navigationMenuPathname, setNavigationMenuPathname] = useState(location.pathname)
  const [shellErrorMessage, setShellErrorMessage] = useState('')

  useEffect(() => {
    const unsubscribeFromAuthUserState = subscribeToAuthUserState((authUser) => {
      setCurrentAuthUserValue(authUser)
    })

    return () => {
      unsubscribeFromAuthUserState()
    }
  }, [])

  useEffect(() => {
    if (!!getAuthToken() === false || !!currentAuthUser === true) {
      return
    }

    getCurrentAuthUser()
      .then((responseData) => {
        return setCurrentAuthUser(responseData.user)
      })
      .catch((error) => {
        if (error instanceof HttpClientError && error.status === 401) {
          return clearAuthSession()
        }

        setShellErrorMessage('Unable to restore your session right now.')
        return Promise.resolve()
      })
      .finally(() => {
        setIsAuthStateLoading(false)
      })
  }, [currentAuthUser])

  const getNavigationLinkClassName = ({ isActive }: { isActive: boolean }) => {
    return [styles.navLink, isActive ? styles.navLinkActive : '']
      .filter(Boolean)
      .join(' ')
  }

  const isNavigationMenuVisible =
    isNavigationMenuOpen === true && navigationMenuPathname === location.pathname

  const handleToggleNavigationMenu = () => {
    if (isNavigationMenuVisible === true) {
      setIsNavigationMenuOpen(false)
      return
    }

    setNavigationMenuPathname(location.pathname)
    setIsNavigationMenuOpen(true)
  }

  const handleCloseNavigationMenu = () => {
    setIsNavigationMenuOpen(false)
  }

  const handleLogoutCurrentAuthUser = async () => {
    let shouldClearAuthSession = true

    setIsLogoutSubmitting(true)
    setShellErrorMessage('')

    return logoutCurrentAuthUser()
      .catch((error) => {
        if (error instanceof HttpClientError && error.status === 401) {
          return Promise.resolve()
        }

        shouldClearAuthSession = false
        setShellErrorMessage('Unable to log out right now.')
        return Promise.resolve()
      })
      .then(() => {
        if (shouldClearAuthSession === false) {
          return Promise.resolve()
        }

        return clearAuthSession().then(() => {
          navigate('/')
          return Promise.resolve()
        })
      })
      .finally(() => {
        setIsLogoutSubmitting(false)
      })
  }

  const isCurrentRouteHome = location.pathname === '/'
  const mobileMenuButtonLabel =
    isNavigationMenuVisible === true ? 'Close navigation' : 'Open navigation'

  return (
    <div
      className={[
        styles.shell,
        isCurrentRouteHome === true ? styles.shellHome : styles.shellInner,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.topArea}>
        <header className={styles.header}>
          <div className={styles.headerPanel}>
            <div className={styles.headerInner}>
              <Link className={styles.logoLink} to="/">
                <img alt="Awaken" src={siteLogoImage} />
              </Link>
              <nav aria-label="Primary" className={styles.nav}>
                {navigationItems.map((navigationItem) => (
                  <NavLink
                    key={navigationItem.to}
                    className={getNavigationLinkClassName}
                    end={navigationItem.end}
                    to={navigationItem.to}
                  >
                    {navigationItem.label}
                  </NavLink>
                ))}
              </nav>
              <div className={styles.headerActions}>
                {!!currentAuthUser === false && (
                  <>
                    <Link className={styles.textAction} to="/register">
                      Register
                    </Link>
                    <Link className={styles.themeAction} to="/login">
                      Login
                    </Link>
                  </>
                )}
                {!!currentAuthUser === true && (
                  <>
                    <Link className={styles.textAction} to="/user-cp">
                      User CP
                    </Link>
                    <span className={styles.userBadge}>{currentAuthUser.username}</span>
                    <button
                      className={styles.themeAction}
                      disabled={isLogoutSubmitting}
                      onClick={handleLogoutCurrentAuthUser}
                      type="button"
                    >
                      {isLogoutSubmitting === true ? 'Logging out...' : 'Logout'}
                    </button>
                  </>
                )}
                <button
                  aria-controls="mobile-navigation"
                  aria-expanded={isNavigationMenuVisible}
                  aria-label={mobileMenuButtonLabel}
                  className={styles.menuButton}
                  onClick={handleToggleNavigationMenu}
                  type="button"
                >
                  <span aria-hidden="true">{isNavigationMenuVisible === true ? '×' : '☰'}</span>
                </button>
              </div>
            </div>
          </div>
        </header>
        {isAuthStateLoading === true && (
          <p className={styles.statusMessage}>Restoring session...</p>
        )}
        {shellErrorMessage.length > 0 && (
          <p className={styles.errorMessage}>{shellErrorMessage}</p>
        )}
      </div>

      <button
        aria-hidden={isNavigationMenuVisible === false}
        className={[
          styles.mobileBackdrop,
          isNavigationMenuVisible === true ? styles.mobileBackdropVisible : '',
        ]
          .filter(Boolean)
          .join(' ')}
        hidden={isNavigationMenuVisible === false}
        onClick={handleCloseNavigationMenu}
        type="button"
      />

      <aside
        aria-hidden={isNavigationMenuVisible === false}
        className={[
          styles.mobilePanel,
          isNavigationMenuVisible === true ? styles.mobilePanelOpen : '',
        ]
          .filter(Boolean)
          .join(' ')}
        hidden={isNavigationMenuVisible === false}
        id="mobile-navigation"
      >
        <div className={styles.mobilePanelHeader}>
          <Link className={styles.logoLink} onClick={handleCloseNavigationMenu} to="/">
            <img alt="Awaken" src={siteLogoImage} />
          </Link>
          <button
            aria-label="Close navigation"
            className={styles.mobileCloseButton}
            onClick={handleCloseNavigationMenu}
            type="button"
          >
            ×
          </button>
        </div>

        <nav aria-label="Mobile Primary" className={styles.mobileNav}>
          {navigationItems.map((navigationItem) => (
            <NavLink
              key={`mobile-${navigationItem.to}`}
              className={getNavigationLinkClassName}
              end={navigationItem.end}
              onClick={handleCloseNavigationMenu}
              to={navigationItem.to}
            >
              {navigationItem.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.mobileActions}>
          {!!currentAuthUser === false && (
            <>
              <Link className={styles.textAction} onClick={handleCloseNavigationMenu} to="/register">
                Register
              </Link>
              <Link className={styles.themeAction} onClick={handleCloseNavigationMenu} to="/login">
                Login
              </Link>
            </>
          )}
          {!!currentAuthUser === true && (
            <>
              <Link className={styles.textAction} onClick={handleCloseNavigationMenu} to="/user-cp">
                User CP
              </Link>
              <span className={styles.userBadge}>{currentAuthUser.username}</span>
              <button
                className={styles.themeAction}
                disabled={isLogoutSubmitting}
                onClick={handleLogoutCurrentAuthUser}
                type="button"
              >
                {isLogoutSubmitting === true ? 'Logging out...' : 'Logout'}
              </button>
            </>
          )}
        </div>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
