import { useEffect, useState } from 'react'

import awakenShadowImage from '../../assets/legacy/images/awaken-shadow.png'
import downloadImage from '../../assets/legacy/images/download.png'
import { getClientDownloads, type DownloadMirror } from './index.service'
import styles from './index.module.scss'

const directClientDownloadUrl =
  'https://drive.google.com/file/d/1i580u6_sw6n-0JqiAmW9TlyQTOGmEeEw/view'

const installationGuideItems = [
  'Make sure your Windows Defender Realtime protection is disabled.',
  'Download the version files from one of the mirror links on the right side.',
  'Download the main client package from the direct client link below.',
  'Put everything into one folder and exclude that folder from Windows Defender.',
  'Run Awaken.exe as Administrator.',
  'Log in and confirm the file integrity check when prompted.',
  'Let the client autopatch any files it needs.',
  'Enjoy your adventure in Awaken!',
]

const Downloads = () => {
  const [clientMirrors, setClientMirrors] = useState<DownloadMirror[]>([])
  const [isClientMirrorsLoading, setIsClientMirrorsLoading] = useState(true)
  const [isClientMirrorsUnavailable, setIsClientMirrorsUnavailable] = useState(false)

  useEffect(() => {
    let isCurrentRequestActive = true

    getClientDownloads()
      .then((responseData) => {
        if (isCurrentRequestActive === false) {
          return
        }

        setClientMirrors(responseData.mirrors)
      })
      .catch(() => {
        if (isCurrentRequestActive === false) {
          return
        }

        setIsClientMirrorsUnavailable(true)
      })
      .finally(() => {
        if (isCurrentRequestActive === false) {
          return
        }

        setIsClientMirrorsLoading(false)
      })

    return () => {
      isCurrentRequestActive = false
    }
  }, [])

  const hasClientMirrors = clientMirrors.length > 0

  return (
    <section className={styles.root}>
      <div className={styles.container}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <p className={styles.eyebrow}>CMS Migration</p>
            <h1 className={styles.title}>Awaken Client Download</h1>
            <p className={styles.description}>
              Use the direct package link plus one of the live mirrors below to set up the
              current Awaken client.
            </p>
          </div>

          <div className={styles.content}>
            <section className={styles.guideSection}>
              <div className={styles.sectionHeader}>
                <h2>Installation Guide</h2>
                <p>Follow the same download flow as the legacy page, but now from the migrated stack.</p>
              </div>

              <ol className={styles.guideList}>
                {installationGuideItems.map((installationGuideItem) => (
                  <li key={installationGuideItem} className={styles.guideListItem}>
                    <span className={styles.guideMarker}>✓</span>
                    <span>{installationGuideItem}</span>
                  </li>
                ))}
              </ol>

              <a
                className={styles.primaryAction}
                href={directClientDownloadUrl}
                rel="noreferrer"
                target="_blank"
              >
                Download Client Package
              </a>
            </section>

            <section className={styles.mirrorSection}>
              <div className={styles.mirrorArtworkCard}>
                <img
                  alt="Awaken client download artwork"
                  className={styles.mirrorArtwork}
                  src={downloadImage}
                />
              </div>

              <div className={styles.sectionHeader}>
                <h2>Download Mirrors</h2>
                <p>Mirror links are loaded from the migrated downloads API resource.</p>
              </div>

              {isClientMirrorsLoading === true && (
                <p className={styles.statusMessage}>Loading download mirrors...</p>
              )}

              {isClientMirrorsUnavailable === true && (
                <p className={styles.statusMessage}>Download mirrors are currently unavailable.</p>
              )}

              {isClientMirrorsLoading === false &&
                isClientMirrorsUnavailable === false &&
                hasClientMirrors === false && (
                  <p className={styles.statusMessage}>
                    No download mirrors are currently available.
                  </p>
                )}

              {hasClientMirrors === true && (
                <div className={styles.mirrorGrid}>
                  {clientMirrors.map((clientMirror) => (
                    <article key={clientMirror.id} className={styles.mirrorCard}>
                      <h3>{clientMirror.label}</h3>
                      <p>Use this mirror if you need an alternate host for the current client files.</p>
                      <a
                        className={styles.secondaryAction}
                        href={clientMirror.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {clientMirror.id === 'mega'
                          ? 'Download from Mega'
                          : 'Download from Google Drive'}
                      </a>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <img alt="" aria-hidden="true" className={styles.shadowImage} src={awakenShadowImage} />
    </section>
  )
}

export default Downloads
