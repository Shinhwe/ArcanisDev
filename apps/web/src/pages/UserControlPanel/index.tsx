import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  clearAuthSession,
  getAuthToken,
  setCurrentAuthUser,
} from '../../app/auth'
import { createPasswordHash } from '../../app/auth/createPasswordHash'
import { HttpClientError } from '../../app/http/HttpClientError'
import awakenShadowImage from '../../assets/legacy/images/awaken-shadow.png'
import {
  changeCurrentUserEmail,
  changeCurrentUserPassword,
  getCurrentUserControlPanel,
  type CurrentUserControlPanelResponse,
  sendCurrentUserEmailVerificationCode,
} from './index.service'
import styles from './index.module.scss'

type UserControlPanelSectionId = 'accountSummary' | 'profile' | 'websiteSettings'

const userControlPanelSections = [
  {
    description: 'View the migrated auth identity used by the new CMS stack.',
    id: 'profile',
    label: 'Profile',
  },
  {
    description: 'Review placeholder game-account values until explicit linking is added.',
    id: 'accountSummary',
    label: 'Account Summary',
  },
  {
    description: 'Manage website email and password settings inside the migrated CMS.',
    id: 'websiteSettings',
    label: 'Website Settings',
  },
] satisfies Array<{
  description: string
  id: UserControlPanelSectionId
  label: string
}>

const getUserGameValueLabel = (userGameValue: number | null) => {
  if (userGameValue === null) {
    return '-'
  }

  return String(userGameValue)
}

const getUserControlPanelErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (
    error instanceof HttpClientError &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'message' in error.data &&
    typeof error.data.message === 'string'
  ) {
    return error.data.message
  }

  return fallbackMessage
}

const UserControlPanel = () => {
  const navigate = useNavigate()
  const [activeSectionId, setActiveSectionId] = useState<UserControlPanelSectionId>('profile')
  const [currentUserControlPanel, setCurrentUserControlPanel] =
    useState<CurrentUserControlPanelResponse | null>(null)
  const [isUserControlPanelLoading, setIsUserControlPanelLoading] = useState(true)
  const [userControlPanelErrorMessage, setUserControlPanelErrorMessage] = useState('')
  const [emailCurrentPasswordValue, setEmailCurrentPasswordValue] = useState('')
  const [newEmailValue, setNewEmailValue] = useState('')
  const [verificationCodeValue, setVerificationCodeValue] = useState('')
  const [emailSettingsErrorMessage, setEmailSettingsErrorMessage] = useState('')
  const [emailSettingsStatusMessage, setEmailSettingsStatusMessage] = useState('')
  const [isEmailVerificationCodeSubmitting, setIsEmailVerificationCodeSubmitting] = useState(false)
  const [isEmailChangeSubmitting, setIsEmailChangeSubmitting] = useState(false)
  const [passwordCurrentPasswordValue, setPasswordCurrentPasswordValue] = useState('')
  const [newPasswordValue, setNewPasswordValue] = useState('')
  const [confirmNewPasswordValue, setConfirmNewPasswordValue] = useState('')
  const [passwordSettingsErrorMessage, setPasswordSettingsErrorMessage] = useState('')
  const [isPasswordChangeSubmitting, setIsPasswordChangeSubmitting] = useState(false)

  useEffect(() => {
    let isCurrentRequestActive = true

    if (!!getAuthToken() === false) {
      navigate('/login', { replace: true })
      return
    }

    getCurrentUserControlPanel()
      .then((responseData) => {
        if (isCurrentRequestActive === false) {
          return
        }

        setCurrentUserControlPanel(responseData)
      })
      .catch((error) => {
        if (isCurrentRequestActive === false) {
          return Promise.resolve()
        }

        if (error instanceof HttpClientError && error.status === 401) {
          navigate('/login', { replace: true })
          return Promise.resolve()
        }

        setUserControlPanelErrorMessage('Unable to load your user control panel right now.')
        return Promise.resolve()
      })
      .finally(() => {
        if (isCurrentRequestActive === false) {
          return
        }

        setIsUserControlPanelLoading(false)
      })

    return () => {
      isCurrentRequestActive = false
    }
  }, [navigate])

  const handleSelectSection = (sectionId: UserControlPanelSectionId) => {
    setActiveSectionId(sectionId)
  }

  const handleChangeEmailCurrentPasswordValue = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setEmailCurrentPasswordValue(event.target.value)
  }

  const handleChangeNewEmailValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewEmailValue(event.target.value)
  }

  const handleChangeVerificationCodeValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVerificationCodeValue(event.target.value)
  }

  const handleChangePasswordCurrentPasswordValue = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setPasswordCurrentPasswordValue(event.target.value)
  }

  const handleChangeNewPasswordValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewPasswordValue(event.target.value)
  }

  const handleChangeConfirmNewPasswordValue = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setConfirmNewPasswordValue(event.target.value)
  }

  const handleSendEmailVerificationCode = () => {
    if (
      emailCurrentPasswordValue.trim().length === 0 ||
      newEmailValue.trim().length === 0
    ) {
      setEmailSettingsErrorMessage('Current password and new email are required.')
      return
    }

    setIsEmailVerificationCodeSubmitting(true)
    setEmailSettingsErrorMessage('')
    setEmailSettingsStatusMessage('')

    return createPasswordHash(emailCurrentPasswordValue)
      .then((currentPasswordHash) => {
        return sendCurrentUserEmailVerificationCode({
          currentPasswordHash,
          newEmail: newEmailValue.trim(),
        })
      })
      .then((responseData) => {
        setVerificationCodeValue(responseData.verificationCodePreview)
        setEmailSettingsStatusMessage(responseData.message)
        return Promise.resolve()
      })
      .catch((error) => {
        setEmailSettingsErrorMessage(
          getUserControlPanelErrorMessage(
            error,
            'Unable to send an email verification code right now.',
          ),
        )
        return Promise.resolve()
      })
      .finally(() => {
        setIsEmailVerificationCodeSubmitting(false)
      })
  }

  const handleSubmitEmailChangeForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (
      emailCurrentPasswordValue.trim().length === 0 ||
      newEmailValue.trim().length === 0 ||
      verificationCodeValue.trim().length === 0
    ) {
      setEmailSettingsErrorMessage(
        'Current password, new email, and verification code are required.',
      )
      return
    }

    setIsEmailChangeSubmitting(true)
    setEmailSettingsErrorMessage('')
    setEmailSettingsStatusMessage('')

    return createPasswordHash(emailCurrentPasswordValue)
      .then((currentPasswordHash) => {
        return changeCurrentUserEmail({
          currentPasswordHash,
          newEmail: newEmailValue.trim(),
          verificationCode: verificationCodeValue.trim(),
        })
      })
      .then((responseData) => {
        return setCurrentAuthUser(responseData.user).then(() => {
          setCurrentUserControlPanel((currentValue) => {
            if (currentValue === null) {
              return currentValue
            }

            return {
              ...currentValue,
              user: responseData.user,
            }
          })
          setEmailSettingsStatusMessage(`Email updated to ${responseData.user.email}.`)
          return Promise.resolve()
        })
      })
      .catch((error) => {
        setEmailSettingsErrorMessage(
          getUserControlPanelErrorMessage(error, 'Unable to update your email right now.'),
        )
        return Promise.resolve()
      })
      .finally(() => {
        setIsEmailChangeSubmitting(false)
      })
  }

  const handleSubmitPasswordChangeForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (
      passwordCurrentPasswordValue.trim().length === 0 ||
      newPasswordValue.trim().length === 0 ||
      confirmNewPasswordValue.trim().length === 0
    ) {
      setPasswordSettingsErrorMessage(
        'Current password, new password, and confirm new password are required.',
      )
      return
    }

    if (newPasswordValue !== confirmNewPasswordValue) {
      setPasswordSettingsErrorMessage('New password and confirm new password must match.')
      return
    }

    setIsPasswordChangeSubmitting(true)
    setPasswordSettingsErrorMessage('')

    return Promise.all([
      createPasswordHash(passwordCurrentPasswordValue),
      createPasswordHash(newPasswordValue),
    ])
      .then(([currentPasswordHash, newPasswordHash]) => {
        return changeCurrentUserPassword({
          currentPasswordHash,
          newPasswordHash,
        })
      })
      .then(() => {
        return clearAuthSession().then(() => {
          navigate('/login', { replace: true })
          return Promise.resolve()
        })
      })
      .catch((error) => {
        setPasswordSettingsErrorMessage(
          getUserControlPanelErrorMessage(error, 'Unable to update your password right now.'),
        )
        return Promise.resolve()
      })
      .finally(() => {
        setIsPasswordChangeSubmitting(false)
      })
  }

  const currentUsername = currentUserControlPanel?.user.username ?? ''
  const isGameAccountLinked = currentUserControlPanel?.gameAccount.isLinked ?? false

  return (
    <section className={styles.root}>
      <div className={styles.panel}>
        <div className={styles.heading}>
          <h1>User Control Panel</h1>
          <p>
            Welcome, <strong>{currentUsername.length > 0 ? currentUsername : 'Adventurer'}</strong>!
          </p>
        </div>

        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <p className={styles.sidebarTitle}>Sections</p>
            <div className={styles.sidebarList}>
              {userControlPanelSections.map((userControlPanelSection) => (
                <button
                  key={userControlPanelSection.id}
                  className={[
                    styles.sidebarButton,
                    activeSectionId === userControlPanelSection.id
                      ? styles.sidebarButtonActive
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    handleSelectSection(userControlPanelSection.id)
                  }}
                  type="button"
                >
                  <span className={styles.sidebarButtonLabel}>
                    {userControlPanelSection.label}
                  </span>
                  <span className={styles.sidebarButtonText}>
                    {userControlPanelSection.description}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className={styles.content}>
            {isUserControlPanelLoading === true && (
              <div className={styles.statusPanel}>
                <p>Loading your migrated profile...</p>
              </div>
            )}

            {isUserControlPanelLoading === false &&
              userControlPanelErrorMessage.length > 0 && (
                <div className={styles.errorPanel}>
                  <p>{userControlPanelErrorMessage}</p>
                </div>
              )}

            {isUserControlPanelLoading === false &&
              userControlPanelErrorMessage.length === 0 &&
              !!currentUserControlPanel === true &&
              activeSectionId === 'profile' && (
                <div className={styles.sectionPanel}>
                  <div className={styles.sectionHeader}>
                    <h2>Profile</h2>
                    <p>View the website identity currently restored by the new React + .NET stack.</p>
                  </div>

                  <div className={styles.profileGrid}>
                    <div className={styles.profileCard}>
                      <p className={styles.profileCardLabel}>Username</p>
                      <p className={styles.profileCardValue}>
                        {currentUserControlPanel.user.username}
                      </p>
                    </div>
                    <div className={styles.profileCard}>
                      <p className={styles.profileCardLabel}>Email</p>
                      <p className={styles.profileCardValue}>
                        {currentUserControlPanel.user.email}
                      </p>
                    </div>
                    <div className={styles.profileCard}>
                      <p className={styles.profileCardLabel}>Role</p>
                      <p className={styles.profileCardValue}>
                        {currentUserControlPanel.user.role}
                      </p>
                    </div>
                    <div className={styles.profileCard}>
                      <p className={styles.profileCardLabel}>Game Account Link</p>
                      <p className={styles.profileCardValue}>
                        {isGameAccountLinked === true ? 'Connected' : 'Not Linked Yet'}
                      </p>
                    </div>
                  </div>

                  <div className={styles.statGrid}>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>Vote Points</p>
                      <p className={styles.statCardValue}>
                        {getUserGameValueLabel(currentUserControlPanel.gameAccount.votePoints)}
                      </p>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>Donation Points</p>
                      <p className={styles.statCardValue}>
                        {getUserGameValueLabel(currentUserControlPanel.gameAccount.donationPoints)}
                      </p>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>Maple Points</p>
                      <p className={styles.statCardValue}>
                        {getUserGameValueLabel(currentUserControlPanel.gameAccount.maplePoints)}
                      </p>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>NX Prepaid</p>
                      <p className={styles.statCardValue}>
                        {getUserGameValueLabel(currentUserControlPanel.gameAccount.nxPrepaid)}
                      </p>
                    </div>
                  </div>

                  {isGameAccountLinked === false && (
                    <p className={styles.accountHint}>
                      Game account data will appear here after explicit linking is added.
                    </p>
                  )}
                </div>
              )}

            {isUserControlPanelLoading === false &&
              userControlPanelErrorMessage.length === 0 &&
              !!currentUserControlPanel === true &&
              activeSectionId === 'accountSummary' && (
                <div className={styles.sectionPanel}>
                  <div className={styles.sectionHeader}>
                    <h2>Account Summary</h2>
                    <p>Game-side balances remain unavailable until explicit account linking is added.</p>
                  </div>

                  <div className={styles.statGrid}>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>Vote Points</p>
                      <p className={styles.statCardValue}>
                        {getUserGameValueLabel(currentUserControlPanel.gameAccount.votePoints)}
                      </p>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>Donation Points</p>
                      <p className={styles.statCardValue}>
                        {getUserGameValueLabel(currentUserControlPanel.gameAccount.donationPoints)}
                      </p>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>Maple Points</p>
                      <p className={styles.statCardValue}>
                        {getUserGameValueLabel(currentUserControlPanel.gameAccount.maplePoints)}
                      </p>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>NX Prepaid</p>
                      <p className={styles.statCardValue}>
                        {getUserGameValueLabel(currentUserControlPanel.gameAccount.nxPrepaid)}
                      </p>
                    </div>
                  </div>

                  {isGameAccountLinked === false && (
                    <p className={styles.accountHint}>
                      Game account data will appear here after explicit linking is added.
                    </p>
                  )}
                </div>
              )}

            {isUserControlPanelLoading === false &&
              userControlPanelErrorMessage.length === 0 &&
              !!currentUserControlPanel === true &&
              activeSectionId === 'websiteSettings' && (
                <div className={styles.sectionPanel}>
                  <div className={styles.sectionHeader}>
                    <h2>Website Settings</h2>
                    <p>Manage website-only email and password settings for the migrated CMS.</p>
                  </div>

                  <div className={styles.settingsGrid}>
                    <section className={styles.settingsCard}>
                      <div className={styles.settingsCardHeader}>
                        <h3>Change Email</h3>
                        <p>
                          Enter your current password, request a verification code,
                          then confirm the new email address.
                        </p>
                      </div>

                      <form className={styles.settingsForm} onSubmit={handleSubmitEmailChangeForm}>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>Current Password</span>
                          <input
                            autoComplete="current-password"
                            name="emailCurrentPassword"
                            onChange={handleChangeEmailCurrentPasswordValue}
                            type="password"
                            value={emailCurrentPasswordValue}
                          />
                        </label>

                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>New Email</span>
                          <input
                            autoComplete="email"
                            name="newEmail"
                            onChange={handleChangeNewEmailValue}
                            type="email"
                            value={newEmailValue}
                          />
                        </label>

                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>Verification Code</span>
                          <input
                            name="verificationCode"
                            onChange={handleChangeVerificationCodeValue}
                            type="text"
                            value={verificationCodeValue}
                          />
                        </label>

                        {emailSettingsStatusMessage.length > 0 && (
                          <p className={styles.statusMessage}>{emailSettingsStatusMessage}</p>
                        )}

                        {emailSettingsErrorMessage.length > 0 && (
                          <p className={styles.inlineErrorMessage}>{emailSettingsErrorMessage}</p>
                        )}

                        <div className={styles.settingsActionRow}>
                          <button
                            className={styles.secondaryAction}
                            disabled={isEmailVerificationCodeSubmitting}
                            onClick={handleSendEmailVerificationCode}
                            type="button"
                          >
                            {isEmailVerificationCodeSubmitting === true
                              ? 'Sending Verification Code...'
                              : 'Send Verification Code'}
                          </button>

                          <button
                            className={styles.primaryAction}
                            disabled={isEmailChangeSubmitting}
                            type="submit"
                          >
                            {isEmailChangeSubmitting === true
                              ? 'Confirming Email Change...'
                              : 'Confirm Email Change'}
                          </button>
                        </div>
                      </form>
                    </section>

                    <section className={styles.settingsCard}>
                      <div className={styles.settingsCardHeader}>
                        <h3>Change Password</h3>
                        <p>
                          Enter your current password and choose a new one. All website
                          sessions will be revoked after the password changes.
                        </p>
                      </div>

                      <form className={styles.settingsForm} onSubmit={handleSubmitPasswordChangeForm}>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>Current Password</span>
                          <input
                            autoComplete="current-password"
                            name="passwordCurrentPassword"
                            onChange={handleChangePasswordCurrentPasswordValue}
                            type="password"
                            value={passwordCurrentPasswordValue}
                          />
                        </label>

                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>New Password</span>
                          <input
                            autoComplete="new-password"
                            name="newPassword"
                            onChange={handleChangeNewPasswordValue}
                            type="password"
                            value={newPasswordValue}
                          />
                        </label>

                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>Confirm New Password</span>
                          <input
                            autoComplete="new-password"
                            name="confirmNewPassword"
                            onChange={handleChangeConfirmNewPasswordValue}
                            type="password"
                            value={confirmNewPasswordValue}
                          />
                        </label>

                        {passwordSettingsErrorMessage.length > 0 && (
                          <p className={styles.inlineErrorMessage}>{passwordSettingsErrorMessage}</p>
                        )}

                        <div className={styles.settingsActionRow}>
                          <button
                            className={styles.primaryAction}
                            disabled={isPasswordChangeSubmitting}
                            type="submit"
                          >
                            {isPasswordChangeSubmitting === true
                              ? 'Changing Password...'
                              : 'Change Password'}
                          </button>
                        </div>
                      </form>
                    </section>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      <div className={styles.shadow}>
        <img alt="" aria-hidden="true" src={awakenShadowImage} />
      </div>
    </section>
  )
}

export default UserControlPanel
