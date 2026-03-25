import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { setAuthSession } from '../../app/auth'
import { createPasswordHash } from '../../app/auth/createPasswordHash'
import { HttpClientError } from '../../app/http/HttpClientError'
import { registerAuthUser } from './index.service'
import styles from './index.module.scss'

const getRegisterErrorMessage = (error: unknown) => {
  if (
    error instanceof HttpClientError &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'message' in error.data &&
    typeof error.data.message === 'string'
  ) {
    return error.data.message
  }

  return 'Unable to create an account right now.'
}

const Register = () => {
  const navigate = useNavigate()
  const [usernameValue, setUsernameValue] = useState('')
  const [emailValue, setEmailValue] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  const [registerErrorMessage, setRegisterErrorMessage] = useState('')
  const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false)

  const handleChangeUsernameValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsernameValue(event.target.value)
  }

  const handleChangeEmailValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmailValue(event.target.value)
  }

  const handleChangePasswordValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordValue(event.target.value)
  }

  const handleSubmitRegisterForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (
      usernameValue.trim().length === 0 ||
      emailValue.trim().length === 0 ||
      passwordValue.trim().length === 0
    ) {
      setRegisterErrorMessage('Username, email, and password are required.')
      return
    }

    setIsRegisterSubmitting(true)
    setRegisterErrorMessage('')

    return createPasswordHash(passwordValue)
      .then((passwordHash) => {
        return registerAuthUser({
          email: emailValue.trim(),
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
        setRegisterErrorMessage(getRegisterErrorMessage(error))
        return Promise.resolve()
      })
      .finally(() => {
        setIsRegisterSubmitting(false)
      })
  }

  return (
    <section className={styles.root}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Auth Slice</p>
        <h1>Create account</h1>
        <p className={styles.lede}>
          New accounts now start directly on the migrated auth tables and token flow.
        </p>
        <form className={styles.form} onSubmit={handleSubmitRegisterForm}>
          <label className={styles.field}>
            <span>Username</span>
            <input name="username" onChange={handleChangeUsernameValue} type="text" value={usernameValue} />
          </label>
          <label className={styles.field}>
            <span>Email</span>
            <input name="email" onChange={handleChangeEmailValue} type="email" value={emailValue} />
          </label>
          <label className={styles.field}>
            <span>Password</span>
            <input name="password" onChange={handleChangePasswordValue} type="password" value={passwordValue} />
          </label>
          {registerErrorMessage.length > 0 && <p className={styles.errorMessage}>{registerErrorMessage}</p>}
          <button disabled={isRegisterSubmitting} type="submit">
            {isRegisterSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className={styles.meta}>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </section>
  )
}

export default Register
