import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { setAuthSession } from '../../app/auth'
import { createPasswordHash } from '../../app/auth/createPasswordHash'
import { HttpClientError } from '../../app/http/HttpClientError'
import awakenShadowImage from '../../assets/legacy/images/awaken-shadow.png'
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
      <div className={styles.container}>
        <div className={styles.panel}>
          <div className={styles.panelHeading}>
            <h1>Register to Awaken</h1>
          </div>

          <div className={styles.panelBody}>
            <div className={styles.copyColumn}>
              <div className={styles.copyBlock}>
                <h2>Welcome to Awaken</h2>
                <p>
                  Join the adventure today! Create your account and step into the
                  world of Awaken. Explore unique content, meet new friends, and
                  make unforgettable memories.
                </p>
                <p>
                  <strong>Already have an account?</strong>{' '}
                  <Link to="/login">Click here to log in</Link> and continue your journey.
                </p>
                <p className={styles.noteText}>
                  New registrations now start directly on the migrated auth tables and token flow.
                </p>
              </div>
            </div>

            <div className={styles.formColumn}>
              <div className={styles.copyBlock}>
                <form className={styles.form} onSubmit={handleSubmitRegisterForm}>
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
                    <span className={styles.fieldLabel}>Email</span>
                    <input
                      autoComplete="email"
                      name="email"
                      onChange={handleChangeEmailValue}
                      type="email"
                      value={emailValue}
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Password</span>
                    <input
                      autoComplete="new-password"
                      name="password"
                      onChange={handleChangePasswordValue}
                      type="password"
                      value={passwordValue}
                    />
                  </label>

                  {registerErrorMessage.length > 0 && (
                    <p className={styles.errorMessage}>{registerErrorMessage}</p>
                  )}

                  <button
                    className={styles.submitButton}
                    disabled={isRegisterSubmitting}
                    type="submit"
                  >
                    {isRegisterSubmitting === true ? 'Registering...' : 'Register'}
                  </button>
                </form>

                <p className={styles.formFooter}>
                  Already have an account? <Link to="/login">Log in</Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.shadow}>
          <img alt="" aria-hidden="true" src={awakenShadowImage} />
        </div>
      </div>
    </section>
  )
}

export default Register
