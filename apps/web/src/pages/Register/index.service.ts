import { HttpClient } from '../../app/http/HttpClient'
import type { AuthSessionResponse } from '../../app/auth/types'

type RegisterAuthUserRequest = {
  email: string
  passwordHash: string
  username: string
}

export const registerAuthUser = async (
  registerAuthUserRequest: RegisterAuthUserRequest,
): Promise<AuthSessionResponse> => {
  const requestUrl = '/auth/register'
  const requestBody = {
    email: registerAuthUserRequest.email,
    passwordHash: registerAuthUserRequest.passwordHash,
    username: registerAuthUserRequest.username,
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
  RegisterAuthUserRequest,
}
