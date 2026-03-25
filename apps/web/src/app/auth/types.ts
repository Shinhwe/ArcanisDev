type AuthUser = {
  email: string
  id: number
  role: string
  username: string
}

type AuthSessionResponse = {
  token: string
  user: AuthUser
}

type CurrentUserResponse = {
  user: AuthUser
}

export type {
  AuthSessionResponse,
  AuthUser,
  CurrentUserResponse,
}
