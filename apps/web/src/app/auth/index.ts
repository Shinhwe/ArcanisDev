import { BehaviorSubject } from 'rxjs'

import type { AuthSessionResponse, AuthUser } from './types'

const authUserStateSubject = new BehaviorSubject<AuthUser | null>(null)

export const clearAuthSession = async (): Promise<void> => {
  localStorage.removeItem('token')
  authUserStateSubject.next(null)

  return Promise.resolve()
}

export const getAuthToken = () => {
  return localStorage.getItem('token')
}

export const getCurrentAuthUserState = () => {
  return authUserStateSubject.getValue()
}

export const setAuthSession = async (authSessionResponse: AuthSessionResponse): Promise<AuthUser> => {
  localStorage.setItem('token', authSessionResponse.token)
  authUserStateSubject.next(authSessionResponse.user)

  return Promise.resolve(authSessionResponse.user)
}

export const setCurrentAuthUser = async (authUser: AuthUser | null): Promise<AuthUser | null> => {
  authUserStateSubject.next(authUser)

  return Promise.resolve(authUser)
}

export const subscribeToAuthUserState = (
  handleAuthUserStateChange: (authUser: AuthUser | null) => void,
) => {
  const authUserSubscription = authUserStateSubject.subscribe((authUser) => {
    handleAuthUserStateChange(authUser)
  })

  return () => {
    authUserSubscription.unsubscribe()
  }
}
