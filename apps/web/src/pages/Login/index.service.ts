import { HttpClient } from '../../app/http/HttpClient'
import type { AuthSessionResponse } from '../../app/auth/types'

type LoginAuthUserRequest = {
  passwordHash: string
  username: string
}

export const loginAuthUser = async (
  loginAuthUserRequest: LoginAuthUserRequest,
): Promise<AuthSessionResponse> => {
  const requestUrl = '/auth/login'
  const requestBody = {
    passwordHash: loginAuthUserRequest.passwordHash,
    username: loginAuthUserRequest.username,
  }

  return HttpClient.post<AuthSessionResponse>(requestUrl, requestBody)
    .then((responseData) => {
      return Promise.resolve(responseData)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

export type {
  LoginAuthUserRequest,
}
