import type { CurrentUserResponse } from '../../app/auth/types'
import { HttpClient } from '../../app/http/HttpClient'

export const getCurrentAuthUser = async (): Promise<CurrentUserResponse> => {
  const requestUrl = '/auth/me'

  return HttpClient.get<CurrentUserResponse>(requestUrl)
    .then((responseData) => {
      return Promise.resolve(responseData)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

export const logoutCurrentAuthUser = async (): Promise<void> => {
  const requestUrl = '/auth/logout'

  return HttpClient.post<undefined>(requestUrl)
    .then(() => {
      return Promise.resolve()
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}
