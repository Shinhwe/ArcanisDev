import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import {
  clearAuthSession,
  getAuthToken,
  getCurrentAuthUserState,
  setCurrentAuthUser,
  subscribeToAuthUserState,
} from '../../app/auth'
import { HttpClientError } from '../../app/http/HttpClientError'
import styles from './index.module.scss'
import { getCurrentAuthUser, logoutCurrentAuthUser } from './index.service'

export const AppShell = () => {
  const navigate = useNavigate()
  const initialAuthUserState = getCurrentAuthUserState()
  const [currentAuthUser, setCurrentAuthUserValue] = useState(initialAuthUserState)
  const [isAuthStateLoading, setIsAuthStateLoading] = useState(
    !!getAuthToken() === true && !!initialAuthUserState === false,
  )
  const [isLogoutSubmitting, setIsLogoutSubmitting] = useState(false)
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

  const navigationItems = [
    {
      end: true,
      label: 'Home',
      to: '/',
    },
    ...(!!currentAuthUser === false
      ? [
          {
            end: false,
            label: 'Login',
            to: '/login',
          },
          {
            end: false,
            label: 'Register',
            to: '/register',
          },
        ]
      : []),
  ]

  const getNavLinkClassName = ({ isActive }: { isActive: boolean }) => {
    return [styles.navLink, isActive ? styles.navLinkActive : '']
      .filter(Boolean)
      .join(' ')
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
          {!!currentAuthUser === true && (
            <>
              <span className={styles.userBadge}>{currentAuthUser.username}</span>
              <button
                className={styles.actionButton}
                disabled={isLogoutSubmitting}
                onClick={handleLogoutCurrentAuthUser}
                type="button"
              >
                {isLogoutSubmitting ? 'Logging out...' : 'Logout'}
              </button>
            </>
          )}
        </nav>
      </header>
      {isAuthStateLoading && <p className={styles.statusMessage}>Restoring session...</p>}
      {shellErrorMessage.length > 0 && <p className={styles.errorMessage}>{shellErrorMessage}</p>}
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
