import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { setAuthSession } from '../../app/auth'
import { createPasswordHash } from '../../app/auth/createPasswordHash'
import { HttpClientError } from '../../app/http/HttpClientError'
import { loginAuthUser } from './index.service'
import styles from './index.module.scss'

const getLoginErrorMessage = (error: unknown) => {
  if (
    error instanceof HttpClientError &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'message' in error.data &&
    typeof error.data.message === 'string'
  ) {
    return error.data.message
  }

  return 'Unable to sign in right now.'
}

const Login = () => {
  const navigate = useNavigate()
  const [usernameValue, setUsernameValue] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  const [loginErrorMessage, setLoginErrorMessage] = useState('')
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false)

  const handleChangeUsernameValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsernameValue(event.target.value)
  }

  const handleChangePasswordValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordValue(event.target.value)
  }

  const handleSubmitLoginForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (usernameValue.trim().length === 0 || passwordValue.trim().length === 0) {
      setLoginErrorMessage('Username and password are required.')
      return
    }

    setIsLoginSubmitting(true)
    setLoginErrorMessage('')

    return createPasswordHash(passwordValue)
      .then((passwordHash) => {
        return loginAuthUser({
          passwordHash,
          username: usernameValue.trim(),
        })
      })
      .then((authSessionResponse) => {
        return setAuthSession(authSessionResponse)
      })
      .then(() => {
        navigate('/')
        return Promise.resolve()
      })
      .catch((error) => {
        setLoginErrorMessage(getLoginErrorMessage(error))
        return Promise.resolve()
      })
      .finally(() => {
        setIsLoginSubmitting(false)
      })
  }

  return (
    <section className={styles.root}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Auth Slice</p>
        <h1>Sign in</h1>
        <p className={styles.lede}>
          This login route is served fully by the migrated React and ASP.NET Core stack.
        </p>
        <form className={styles.form} onSubmit={handleSubmitLoginForm}>
          <label className={styles.field}>
            <span>Username</span>
            <input name="username" onChange={handleChangeUsernameValue} type="text" value={usernameValue} />
          </label>
          <label className={styles.field}>
            <span>Password</span>
            <input name="password" onChange={handleChangePasswordValue} type="password" value={passwordValue} />
          </label>
          {loginErrorMessage.length > 0 && <p className={styles.errorMessage}>{loginErrorMessage}</p>}
          <button disabled={isLoginSubmitting} type="submit">
            {isLoginSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className={styles.meta}>
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </section>
  )
}

export default Login
