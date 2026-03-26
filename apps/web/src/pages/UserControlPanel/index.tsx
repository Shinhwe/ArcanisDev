import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getAuthToken } from '../../app/auth'
import { HttpClientError } from '../../app/http/HttpClientError'
import awakenShadowImage from '../../assets/legacy/images/awaken-shadow.png'
import {
  getCurrentUserControlPanel,
  type CurrentUserControlPanelResponse,
} from './index.service'
import styles from './index.module.scss'

type UserControlPanelSectionId = 'accountSummary' | 'profile'

const userControlPanelSections = [
  {
    description: 'View the migrated auth identity used by the new CMS stack.',
    id: 'profile',
    label: 'Profile',
  },
  {
    description: 'Review the linked legacy game account balances carried into the CMS.',
    id: 'accountSummary',
    label: 'Account Summary',
  },
] satisfies Array<{
  description: string
  id: UserControlPanelSectionId
  label: string
}>

const UserControlPanel = () => {
  const navigate = useNavigate()
  const [activeSectionId, setActiveSectionId] = useState<UserControlPanelSectionId>('profile')
  const [currentUserControlPanel, setCurrentUserControlPanel] =
    useState<CurrentUserControlPanelResponse | null>(null)
  const [isUserControlPanelLoading, setIsUserControlPanelLoading] = useState(true)
  const [userControlPanelErrorMessage, setUserControlPanelErrorMessage] = useState('')

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
                    <p>View the auth identity currently restored by the new React + .NET stack.</p>
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
                      <p className={styles.profileCardLabel}>Linked Game Account</p>
                      <p className={styles.profileCardValue}>
                        {isGameAccountLinked === true ? 'Connected' : 'Not Linked Yet'}
                      </p>
                    </div>
                  </div>

                  <div className={styles.statGrid}>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>Vote Points</p>
                      <p className={styles.statCardValue}>
                        {currentUserControlPanel.gameAccount.votePoints}
                      </p>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>Donation Points</p>
                      <p className={styles.statCardValue}>
                        {currentUserControlPanel.gameAccount.donationPoints}
                      </p>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>Maple Points</p>
                      <p className={styles.statCardValue}>
                        {currentUserControlPanel.gameAccount.maplePoints}
                      </p>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>NX Prepaid</p>
                      <p className={styles.statCardValue}>
                        {currentUserControlPanel.gameAccount.nxPrepaid}
                      </p>
                    </div>
                  </div>

                  {isGameAccountLinked === false && (
                    <p className={styles.accountHint}>
                      No linked legacy game account data was found for this username yet.
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
                    <p>Read-only legacy game balances are shown here while settings stay out of scope.</p>
                  </div>

                  <div className={styles.statGrid}>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>Vote Points</p>
                      <p className={styles.statCardValue}>
                        {currentUserControlPanel.gameAccount.votePoints}
                      </p>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>Donation Points</p>
                      <p className={styles.statCardValue}>
                        {currentUserControlPanel.gameAccount.donationPoints}
                      </p>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>Maple Points</p>
                      <p className={styles.statCardValue}>
                        {currentUserControlPanel.gameAccount.maplePoints}
                      </p>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.statCardLabel}>NX Prepaid</p>
                      <p className={styles.statCardValue}>
                        {currentUserControlPanel.gameAccount.nxPrepaid}
                      </p>
                    </div>
                  </div>

                  {isGameAccountLinked === false && (
                    <p className={styles.accountHint}>
                      No linked legacy game account data was found for this username yet.
                    </p>
                  )}
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
