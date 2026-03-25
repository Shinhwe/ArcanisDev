import styles from './index.module.scss'

const tracks = [
  'Public read APIs',
  'Authentication',
  'User control panel',
  'Admin control panel',
]

export const Home = () => {
  return (
    <section className={styles.root}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Workspace Ready</p>
        <h1>React front end. .NET 10 back end.</h1>
        <p className={styles.lede}>
          The route layer is now in place, `rxjs` is available as a dependency, and this
          frontend is ready for the next migration slices.
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
          <h2>API</h2>
          <p>
            The ASP.NET Core service in <code>apps/api</code> remains the backend target for
            the gradual migration.
          </p>
        </article>
        <article className={styles.panel}>
          <h2>Tracks</h2>
          <ul className={styles.trackList}>
            {tracks.map((track) => (
              <li key={track}>{track}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
