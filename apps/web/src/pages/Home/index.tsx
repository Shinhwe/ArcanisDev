import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import auraImage from '../../assets/legacy/images/aura.png'
import awakenOverlayLogoImage from '../../assets/legacy/images/awaken__overlay-logo.png'
import awakenShadowImage from '../../assets/legacy/images/awaken-shadow.png'
import heroOneImage from '../../assets/legacy/images/hero1.png'
import heroTwoImage from '../../assets/legacy/images/hero2.png'
import heroParticleImage from '../../assets/legacy/images/hero__particle.png'
import { getHomePageConfig, type HomePageConfig } from './index.service'
import styles from './index.module.scss'

const getYoutubeEmbedUrl = (youtubeLink: string) => {
  const matchedYoutubeValue = youtubeLink.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&]+)/,
  )

  if (
    !!matchedYoutubeValue === false ||
    typeof matchedYoutubeValue[1] !== 'string' ||
    matchedYoutubeValue[1].length === 0
  ) {
    return ''
  }

  const videoId = matchedYoutubeValue[1]

  return `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&mute=0&controls=0&modestbranding=1&disablekb=0&fs=0&playlist=${videoId}`
}

const Home = () => {
  const [homePageConfig, setHomePageConfig] = useState<HomePageConfig | null>(null)
  const [isSiteConfigLoading, setIsSiteConfigLoading] = useState(true)
  const [isSiteConfigUnavailable, setIsSiteConfigUnavailable] = useState(false)

  useEffect(() => {
    let isCurrentRequestActive = true

    getHomePageConfig()
      .then((responseData) => {
        if (isCurrentRequestActive === false) {
          return
        }

        setHomePageConfig(responseData)
      })
      .catch(() => {
        if (isCurrentRequestActive === false) {
          return
        }

        setIsSiteConfigUnavailable(true)
      })
      .finally(() => {
        if (isCurrentRequestActive === false) {
          return
        }

        setIsSiteConfigLoading(false)
      })

    return () => {
      isCurrentRequestActive = false
    }
  }, [])

  const youtubeEmbedUrl =
    !!homePageConfig === true ? getYoutubeEmbedUrl(homePageConfig.youtubeLink) : ''
  const discordLink = homePageConfig?.discordLink?.trim() ?? ''
  const siteConfigStatusLabel = isSiteConfigLoading === true
    ? 'Checking...'
    : isSiteConfigUnavailable === true
      ? 'Unavailable'
      : 'Online'

  return (
    <section className={styles.root}>
      <section className={styles.heroSurface}>
        <img alt="" aria-hidden="true" className={styles.heroParticle} src={heroParticleImage} />
        <img alt="" aria-hidden="true" className={styles.heroCharacterOne} src={heroOneImage} />
        <img alt="" aria-hidden="true" className={styles.heroCharacterTwo} src={heroTwoImage} />
        <img alt="" aria-hidden="true" className={styles.heroAura} src={auraImage} />

        <div className={styles.serverStatusArea}>
          <div className={styles.serverStatusStack}>
            <p className={styles.serverStatusPill}>
              Site config: <span>{siteConfigStatusLabel}</span>
            </p>
            <p className={styles.serverStatusPill}>
              Auth routes: <span>Migrated</span>
            </p>
          </div>
        </div>

        <div className={styles.heroCenter}>
          <img alt="Awaken" className={styles.heroLogo} src={awakenOverlayLogoImage} />
          <div className={styles.heroActions}>
            <Link className={styles.heroActionLink} to="/register">
              Create Account
            </Link>
            <Link className={styles.heroActionLink} to="/login">
              Login
            </Link>
          </div>
        </div>

        <img alt="" aria-hidden="true" className={styles.heroShadow} src={awakenShadowImage} />
      </section>

      <section className={styles.videoSection}>
        <div className={styles.videoContainer}>
          <div className={styles.videoContent}>
            <div className={styles.videoText}>
              <div className={styles.videoHeading}>
                <h1>Welcome To Awaken</h1>
                <h1>Now the adventure begins!</h1>
              </div>
              <p>
                Experience the remastered heroes with brand-new, flashy and powerful
                skills, dominating hunting grounds and boss fights!
              </p>
              <div className={styles.releaseDate}>
                <span>Release date: 24/4/2023</span>
              </div>
              <div className={styles.videoActionArea}>
                {discordLink.length > 0 && (
                  <a
                    className={styles.discordButton}
                    href={discordLink}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Join Discord
                  </a>
                )}
                {discordLink.length === 0 && isSiteConfigLoading === false && (
                  <span className={styles.videoMessage}>
                    Discord link is currently unavailable.
                  </span>
                )}
              </div>
            </div>

            <div className={styles.videoPreview}>
              {youtubeEmbedUrl.length > 0 && (
                <div className={styles.responsiveVideo}>
                  <iframe
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    src={youtubeEmbedUrl}
                    title="Awaken trailer"
                  />
                </div>
              )}
              {youtubeEmbedUrl.length === 0 && (
                <div className={styles.videoFallback}>
                  <p className={styles.videoMessage}>
                    {isSiteConfigLoading === true
                      ? 'Loading video preview...'
                      : 'Video preview is currently unavailable.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </section>
  )
}

export default Home
