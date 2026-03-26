import { useEffect, useState } from 'react'

import awakenShadowImage from '../../assets/legacy/images/awaken-shadow.png'
import voteImage from '../../assets/legacy/images/vote.png'
import {
  getVoteEligibility,
  type VoteEligibilityResponse,
} from './index.service'
import styles from './index.module.scss'

const voteInstructionItems = [
  'Login to your account on Website.',
  'Vote.',
  'Complete Captcha.',
  'Gain Vote Points ingame.',
  'type @vote ingame to claim any pending VP.',
  'Can vote every 24 hours.',
]

const Vote = () => {
  const [voteEligibility, setVoteEligibility] = useState<VoteEligibilityResponse | null>(null)
  const [isVoteEligibilityLoading, setIsVoteEligibilityLoading] = useState(true)
  const [voteEligibilityErrorMessage, setVoteEligibilityErrorMessage] = useState('')

  useEffect(() => {
    let isCurrentRequestActive = true

    getVoteEligibility()
      .then((responseData) => {
        if (isCurrentRequestActive === false) {
          return
        }

        setVoteEligibility(responseData)
      })
      .catch(() => {
        if (isCurrentRequestActive === false) {
          return
        }

        setVoteEligibilityErrorMessage('Vote is currently unavailable.')
      })
      .finally(() => {
        if (isCurrentRequestActive === false) {
          return
        }

        setIsVoteEligibilityLoading(false)
      })

    return () => {
      isCurrentRequestActive = false
    }
  }, [])

  const hasVoteEligibility = !!voteEligibility === true
  const isVoteActionDisabled =
    isVoteEligibilityLoading === true ||
    voteEligibilityErrorMessage.length > 0 ||
    hasVoteEligibility === false ||
    voteEligibility!.canVote === false

  const handleAttemptVote = () => {
    if (isVoteActionDisabled === true) {
      return
    }

    // TODO: Enable this flow only after the eligibility endpoint can return eligible.
    // TODO: Submit POST /api/v1/votes when linked-account voting is available.
    // TODO: Successful vote submissions will enqueue a Redis message for the game server.
  }

  const voteEligibilityMessage = isVoteEligibilityLoading === true
    ? 'Loading vote eligibility...'
    : voteEligibilityErrorMessage.length > 0
      ? voteEligibilityErrorMessage
      : voteEligibility?.message ?? ''

  return (
    <section className={styles.root}>
      <div className={styles.container}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <p className={styles.eyebrow}>CMS Migration</p>
            <h1 className={styles.title}>Vote for Awaken</h1>
          </div>

          <div className={styles.content}>
            <section className={styles.instructionsSection}>
              <div className={styles.sectionHeader}>
                <h2>How to Vote</h2>
                <p>
                  The new CMS keeps the legacy vote page layout while the linked-account
                  flow is still pending.
                </p>
              </div>

              <ul className={styles.instructionsList}>
                {voteInstructionItems.map((voteInstructionItem) => (
                  <li key={voteInstructionItem} className={styles.instructionsListItem}>
                    <span className={styles.instructionsMarker}>✓</span>
                    <span>{voteInstructionItem}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.actionSection}>
              <div className={styles.sectionHeader}>
                <h2>Vote for Awaken</h2>
                <p>Click the button below to vote for Awaken on GTOP100!</p>
              </div>

              <p className={styles.statusMessage}>{voteEligibilityMessage}</p>

              <button
                className={styles.primaryAction}
                disabled={isVoteActionDisabled}
                onClick={handleAttemptVote}
                type="button"
              >
                Vote Now
              </button>

              <div className={styles.voteArtworkCard}>
                <img
                  alt="Vote for Awaken"
                  className={styles.voteArtwork}
                  src={voteImage}
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      <img alt="" aria-hidden="true" className={styles.shadowImage} src={awakenShadowImage} />
    </section>
  )
}

export default Vote
