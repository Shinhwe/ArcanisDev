import { useEffect, useState } from 'react';

import { getHomePageConfig, type HomePageConfig } from './index.service';
import styles from './index.module.scss';

const tracks = [
  'Public read APIs',
  'Authentication',
  'User control panel',
  'Admin control panel',
];

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

  const publicSiteLinks =
    !!homePageConfig === true
      ? [
          {
            href: homePageConfig.discordLink,
            id: 'discord-link',
            label: 'Official Discord',
          },
          {
            href: homePageConfig.youtubeLink,
            id: 'youtube-link',
            label: 'Official YouTube',
          },
        ].filter((linkItem) => {
          return !!linkItem.href === true
        })
      : []

  return (
    <section className={styles.root}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Current Slice</p>
        <h1>CMS migration workspace</h1>
        <p className={styles.lede}>
          The new React shell and ASP.NET Core API are now the working surface
          for the gradual CMS migration. Public read-only slices land here
          first, then authentication and control panel flows follow behind them.
        </p>
        <div className={styles.stack}>
          <span>React Router</span>
          <span>RxJS</span>
          <span>Normalize.css</span>
          <span>SCSS</span>
          <span>ESNext</span>
        </div>
      </div>

      <div className={styles.panels}>
        <article className={styles.panel}>
          <h2>Platform boundary</h2>
          <p>
            The shared transport layer lives in{' '}
            <code>apps/web/src/app/http</code>, while this route keeps its own
            request entry point in <code>apps/web/src/pages/Home/index.service.ts</code>.
            The ASP.NET Core service in <code>apps/api</code> stays aligned as
            the RESTful backend target for each migrated slice.
          </p>
        </article>
        <article className={styles.panel}>
          <h2>Migration queue</h2>
          <ul className={styles.trackList}>
            {tracks.map((track) => (
              <li key={track}>{track}</li>
            ))}
          </ul>
        </article>
        <article className={styles.panel}>
          <h2>Live site config</h2>
          <p>
            This route now consumes <code>/api/v1/config</code> through its page-local service
            and exposes the first migrated public values directly from the new API.
          </p>
          <div className={styles.siteConfigState}>
            {isSiteConfigLoading && (
              <span className={styles.siteConfigMessage}>Loading public site config...</span>
            )}
            {isSiteConfigLoading === false && isSiteConfigUnavailable === true && (
              <span className={styles.siteConfigMessage}>Public site config is currently unavailable.</span>
            )}
            {isSiteConfigLoading === false &&
              isSiteConfigUnavailable === false &&
              publicSiteLinks.length === 0 && (
                <span className={styles.siteConfigMessage}>No public site links are configured yet.</span>
              )}
            {publicSiteLinks.length > 0 && (
              <ul className={styles.siteConfigLinks}>
                {publicSiteLinks.map((linkItem) => (
                  <li key={linkItem.id}>
                    <a href={linkItem.href} rel="noreferrer" target="_blank">
                      {linkItem.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      </div>
    </section>
  );
};

export default Home;
