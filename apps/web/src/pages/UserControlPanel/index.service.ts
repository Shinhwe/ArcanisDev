import type { AuthUser } from '../../app/auth/types'
import { HttpClient } from '../../app/http/HttpClient'

type UserGameAccount = {
  donationPoints: number
  isLinked: boolean
  maplePoints: number
  nxPrepaid: number
  votePoints: number
}

type CurrentUserControlPanelResponse = {
  gameAccount: UserGameAccount
  user: AuthUser
}

export const getCurrentUserControlPanel = async (): Promise<CurrentUserControlPanelResponse> => {
  const requestUrl = '/users/me/profile'

  return HttpClient.get<CurrentUserControlPanelResponse>(requestUrl)
    .then((responseData) => {
      return Promise.resolve(responseData)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

export type {
  CurrentUserControlPanelResponse,
  UserGameAccount,
}
