import type { AuthUser } from '../../app/auth/types'
import { HttpClient } from '../../app/http/HttpClient'

type UserGameAccount = {
  donationPoints: number | null
  isLinked: boolean
  maplePoints: number | null
  nxPrepaid: number | null
  votePoints: number | null
}

type CurrentUserControlPanelResponse = {
  gameAccount: UserGameAccount
  user: AuthUser
}

type SendCurrentUserEmailVerificationCodeRequest = {
  currentPasswordHash: string
  newEmail: string
}

type SendCurrentUserEmailVerificationCodeResponse = {
  message: string
  verificationCodePreview: string
}

type ChangeCurrentUserEmailRequest = {
  currentPasswordHash: string
  newEmail: string
  verificationCode: string
}

type ChangeCurrentUserEmailResponse = {
  user: AuthUser
}

type ChangeCurrentUserPasswordRequest = {
  currentPasswordHash: string
  newPasswordHash: string
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

export const sendCurrentUserEmailVerificationCode = async (
  sendCurrentUserEmailVerificationCodeRequest: SendCurrentUserEmailVerificationCodeRequest,
): Promise<SendCurrentUserEmailVerificationCodeResponse> => {
  const requestUrl = '/users/me/email-verification-codes'
  const requestBody = {
    currentPasswordHash: sendCurrentUserEmailVerificationCodeRequest.currentPasswordHash,
    newEmail: sendCurrentUserEmailVerificationCodeRequest.newEmail,
  }

  return HttpClient.post<SendCurrentUserEmailVerificationCodeResponse>(requestUrl, requestBody)
    .then((responseData) => {
      return Promise.resolve(responseData)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

export const changeCurrentUserEmail = async (
  changeCurrentUserEmailRequest: ChangeCurrentUserEmailRequest,
): Promise<ChangeCurrentUserEmailResponse> => {
  const requestUrl = '/users/me/email'
  const requestBody = {
    currentPasswordHash: changeCurrentUserEmailRequest.currentPasswordHash,
    newEmail: changeCurrentUserEmailRequest.newEmail,
    verificationCode: changeCurrentUserEmailRequest.verificationCode,
  }

  return HttpClient.put<ChangeCurrentUserEmailResponse>(requestUrl, requestBody)
    .then((responseData) => {
      return Promise.resolve(responseData)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

export const changeCurrentUserPassword = async (
  changeCurrentUserPasswordRequest: ChangeCurrentUserPasswordRequest,
): Promise<void> => {
  const requestUrl = '/users/me/password'
  const requestBody = {
    currentPasswordHash: changeCurrentUserPasswordRequest.currentPasswordHash,
    newPasswordHash: changeCurrentUserPasswordRequest.newPasswordHash,
  }

  return HttpClient.put<void>(requestUrl, requestBody)
    .then(() => {
      return Promise.resolve()
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

export type {
  ChangeCurrentUserEmailRequest,
  ChangeCurrentUserEmailResponse,
  ChangeCurrentUserPasswordRequest,
  CurrentUserControlPanelResponse,
  SendCurrentUserEmailVerificationCodeRequest,
  SendCurrentUserEmailVerificationCodeResponse,
  UserGameAccount,
}
