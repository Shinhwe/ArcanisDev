import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { setAuthSession } from '../../app/auth'
import { createPasswordHash } from '../../app/auth/createPasswordHash'
import { HttpClientError } from '../../app/http/HttpClientError'
import awakenShadowImage from '../../assets/legacy/images/awaken-shadow.png'
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
      <div className={styles.container}>
        <div className={styles.panel}>
          <div className={styles.panelHeading}>
            <h1>Login to Awaken</h1>
          </div>

          <div className={styles.panelBody}>
            <div className={styles.copyColumn}>
              <div className={styles.copyBlock}>
                <h2>Welcome Back to Awaken</h2>
                <p>
                  Your next adventure awaits! Log in to reunite with friends,
                  explore exciting new content, and rise to the top of the rankings.
                </p>
                <p>
                  <strong>New to Awaken?</strong> No worries!{' '}
                  <Link to="/register">Click here to create an account</Link> and
                  join our vibrant community of adventurers today.
                </p>
                <ul className={styles.tipList}>
                  <li>Ensure your username and password are entered correctly.</li>
                  <li>Check the latest patch notes and server updates before playing.</li>
                  <li>Your migrated session will sync directly with the new auth token flow.</li>
                </ul>
                <p className={styles.noteText}>
                  We&apos;re committed to making your gaming experience truly unforgettable.
                </p>
              </div>
            </div>

            <div className={styles.formColumn}>
              <div className={styles.copyBlock}>
                <form className={styles.form} onSubmit={handleSubmitLoginForm}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Username</span>
                    <input
                      autoComplete="username"
                      name="username"
                      onChange={handleChangeUsernameValue}
                      type="text"
                      value={usernameValue}
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Password</span>
                    <input
                      autoComplete="current-password"
                      name="password"
                      onChange={handleChangePasswordValue}
                      type="password"
                      value={passwordValue}
                    />
                  </label>

                  {loginErrorMessage.length > 0 && (
                    <p className={styles.errorMessage}>{loginErrorMessage}</p>
                  )}

                  <button
                    className={styles.submitButton}
                    disabled={isLoginSubmitting}
                    type="submit"
                  >
                    {isLoginSubmitting === true ? 'Logging in...' : 'Login'}
                  </button>
                </form>

                <p className={styles.formFooter}>
                  Need an account? <Link to="/register">Create one here</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <img
        alt=""
        aria-hidden="true"
        className={styles.shadowImage}
        data-testid="login-shadow-image"
        src={awakenShadowImage}
      />
    </section>
  )
}

export default Login
